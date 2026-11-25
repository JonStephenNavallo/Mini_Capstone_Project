"""Thin HTTP view layer delegating all business logic to services.py."""
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import OptionalPageNumberPagination, StandardPageNumberPagination
from .analytics_service import get_osas_dashboard_analytics
from .models import (
    CampusLocation,
    ClaimTicket,
    FoundItem,
    ItemCategory,
    LostItemReport,
    StudentHonestyProfile,
)
from .permissions import IsOsasAdmin, IsPublicReadOrAdminWrite, IsStudentOrAdmin
from .serializers import (
    AdminFoundItemSerializer,
    CampusLocationSerializer,
    ClaimTicketSerializer,
    ClaimTransactionSerializer,
    DepartmentLeaderboardEntrySerializer,
    FoundItemReportWriteSerializer,
    ItemCategorySerializer,
    ItemMatchCandidateSerializer,
    LostItemReportSerializer,
    PortalConfigurationSerializer,
    PublicFoundItemSerializer,
    WalkInClaimInputSerializer,
)
from .services import (
    approve_custody_intake,
    close_lost_item_report,
    create_campus_location,
    create_found_item,
    create_item_category,
    create_lost_item_report,
    delete_campus_location,
    delete_found_item,
    delete_item_category,
    delete_lost_item_report,
    generate_walkin_claim_ticket,
    get_department_leaderboard,
    get_or_create_portal_config,
    get_student_activity_records,
    lookup_by_qr_or_code,
    process_walkin_claim,
    update_campus_location,
    update_found_item,
    update_item_category,
    update_match_feedback,
    update_portal_config,
    void_mistaken_claim,
)


class ItemCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ItemCategorySerializer
    permission_classes = [IsPublicReadOrAdminWrite]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        # Annotate linked counts in a single SQL query to prevent N+1 queries
        qs = ItemCategory.objects.annotate(
            items_count=Count('found_items', distinct=True),
            lost_reports_count=Count('lost_reports', distinct=True),
        )
        if not (self.request.user.is_authenticated and self.request.user.role == 'ADMIN'):
            qs = qs.filter(is_active=True)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = create_item_category(validated_data=serializer.validated_data)
        return Response(
            self.get_serializer(category).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category = update_item_category(
            category_id=instance.pk,
            validated_data=serializer.validated_data,
        )
        # Re-fetch annotated instance so counts remain accurate in the response
        annotated = self.get_queryset().get(pk=category.pk)
        return Response(self.get_serializer(annotated).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_item_category(category_id=instance.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampusLocationViewSet(viewsets.ModelViewSet):
    serializer_class = CampusLocationSerializer
    permission_classes = [IsPublicReadOrAdminWrite]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        # Annotate linked counts in a single SQL query to prevent N+1 queries
        qs = CampusLocation.objects.annotate(
            items_count=Count('found_items', distinct=True),
            lost_reports_count=Count('lost_reports', distinct=True),
        )
        if not (self.request.user.is_authenticated and self.request.user.role == 'ADMIN'):
            qs = qs.filter(is_active=True)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        location = create_campus_location(validated_data=serializer.validated_data)
        annotated = self.get_queryset().get(pk=location.pk)
        return Response(
            self.get_serializer(annotated).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        location = update_campus_location(
            location_id=instance.pk,
            validated_data=serializer.validated_data,
        )
        annotated = self.get_queryset().get(pk=location.pk)
        return Response(self.get_serializer(annotated).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_campus_location(location_id=instance.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _apply_date_range_filter(qs, request):
    """Filter a FoundItem queryset by optional inclusive ISO date_from / date_to query params."""
    raw_from = (request.query_params.get('date_from') or '').strip()
    raw_to = (request.query_params.get('date_to') or '').strip()
    date_from = parse_date(raw_from) if raw_from else None
    date_to = parse_date(raw_to) if raw_to else None
    if date_from:
        qs = qs.filter(date_found__gte=date_from)
    if date_to:
        qs = qs.filter(date_found__lte=date_to)
    return qs


class PublicFoundItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Public and Student browse catalog (only IN_CUSTODY and CLAIMED showcase)."""

    serializer_class = PublicFoundItemSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        qs = (
            FoundItem.objects.select_related(
                'category',
                'found_location',
                'finder_user__student_profile',
                'finder_user__staff_profile',
            )
            .prefetch_related('photos', 'claim_transactions')
            .filter(
                custody_status__in=[
                    FoundItem.CustodyStatus.IN_CUSTODY,
                    FoundItem.CustodyStatus.CLAIMED,
                ]
            )
        )
        status_param = self.request.query_params.get('status')
        if status_param in (FoundItem.CustodyStatus.IN_CUSTODY, FoundItem.CustodyStatus.CLAIMED):
            qs = qs.filter(custody_status=status_param)

        category_param = self.request.query_params.get('category')
        if category_param:
            qs = qs.filter(category_id=category_param)

        qs = _apply_date_range_filter(qs, self.request)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(general_description__icontains=search)
                | Q(tracking_code__icontains=search)
                | Q(found_location_custom__icontains=search)
                | Q(found_location__building_name__icontains=search)
            )
        return qs


class ReportFoundItemView(APIView):
    """
    Allows authenticated Students and OSAS Admins to submit a found item report online.
    Non-account holders (guards, staff, visitors) surrender items in person at OSAS.
    """

    permission_classes = [IsStudentOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = FoundItemReportWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_found_item(
            actor=request.user,
            validated_data=serializer.validated_data,
            extra_photos=request.FILES.getlist('photos'),
        )
        out_serializer = (
            AdminFoundItemSerializer(item, context={'request': request})
            if (request.user.is_authenticated and request.user.role == 'ADMIN')
            else PublicFoundItemSerializer(item, context={'request': request})
        )
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class LostItemReportViewSet(viewsets.ModelViewSet):
    """Authenticated students report and track their own lost items & auto-matches."""

    serializer_class = LostItemReportSerializer
    permission_classes = [IsStudentOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        qs = LostItemReport.objects.select_related(
            'category', 'suspected_location', 'student__student_profile'
        ).prefetch_related('match_candidates__found_item__category', 'match_candidates__found_item__found_location')
        if self.request.user.role == 'ADMIN':
            return qs
        return qs.filter(student=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = create_lost_item_report(student=request.user, validated_data=serializer.validated_data)
        return Response(
            self.get_serializer(report, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='match-feedback/(?P<match_id>[^/.]+)')
    def match_feedback(self, request, match_id=None):
        candidate = update_match_feedback(
            match_id=match_id,
            student=request.user,
            feedback=request.data.get('student_feedback', ''),
        )
        return Response(
            ItemMatchCandidateSerializer(candidate, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='close')
    def close_report(self, request, pk=None):
        instance = self.get_object()
        report = close_lost_item_report(report_id=instance.pk, actor=request.user)
        return Response(
            self.get_serializer(report, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_lost_item_report(report_id=instance.pk, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClaimTicketViewSet(viewsets.GenericViewSet, viewsets.mixins.ListModelMixin):
    """Walk-in QR Pass generation (strictly for in-person OSAS desk lookup)."""

    serializer_class = ClaimTicketSerializer
    permission_classes = [IsStudentOrAdmin]

    def get_queryset(self):
        qs = ClaimTicket.objects.select_related(
            'found_item__category',
            'found_item__found_location',
            'student__student_profile',
        )
        if self.request.user.role == 'ADMIN':
            return qs
        return qs.filter(student=self.request.user)

    def create(self, request):
        found_item_id = request.data.get('found_item')
        ticket = generate_walkin_claim_ticket(found_item_id=found_item_id, student=request.user)
        return Response(
            ClaimTicketSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminFoundItemViewSet(viewsets.ModelViewSet):
    """OSAS Admin-only custody directory, intake approval, and walk-in claim release."""

    serializer_class = AdminFoundItemSerializer
    permission_classes = [IsOsasAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        qs = FoundItem.objects.select_related(
            'category',
            'found_location',
            'finder_user__student_profile',
            'finder_user__staff_profile',
        ).prefetch_related(
            'photos',
            'claim_transactions__verifying_admin__staff_profile',
            'claim_transactions__voided_by__staff_profile',
        )
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(custody_status=status_param)
        category_param = self.request.query_params.get('category')
        if category_param:
            qs = qs.filter(category_id=category_param)
        qs = _apply_date_range_filter(qs, self.request)
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(tracking_code__icontains=search)
                | Q(storage_shelf_bin__icontains=search)
                | Q(general_description__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = FoundItemReportWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_found_item(
            actor=request.user,
            validated_data=serializer.validated_data,
            extra_photos=request.FILES.getlist('photos'),
        )
        return Response(
            AdminFoundItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = FoundItemReportWriteSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_found_item(found_item_id=instance.pk, validated_data=serializer.validated_data)
        return Response(
            AdminFoundItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_found_item(found_item_id=instance.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='approve-intake')
    def approve_intake(self, request, pk=None):
        item = approve_custody_intake(
            found_item_id=pk,
            admin_user=request.user,
            storage_shelf_bin=request.data.get('storage_shelf_bin', ''),
            secret_identifiers=request.data.get('secret_identifiers', ''),
        )
        return Response(
            AdminFoundItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='process-claim')
    def process_claim(self, request, pk=None):
        serializer = WalkInClaimInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tx = process_walkin_claim(
            found_item_id=pk,
            admin_user=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(
            ClaimTransactionSerializer(tx, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='void-claim')
    def void_claim(self, request, pk=None):
        item = void_mistaken_claim(
            found_item_id=pk,
            admin_user=request.user,
            void_reason=request.data.get('void_reason', ''),
        )
        return Response(
            AdminFoundItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class QrLookupView(APIView):
    """Resolve scanned QR payloads (FoundItem tag, ClaimTicket pass, or CampusLocation poster)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get('code', '')
        result = lookup_by_qr_or_code(code=code, user=request.user)
        payload = {'match_type': result['match_type']}

        if result['match_type'] == 'CAMPUS_LOCATION':
            payload['location'] = CampusLocationSerializer(result['location']).data
            return Response(payload, status=status.HTTP_200_OK)

        item = result['found_item']
        item_serializer = (
            AdminFoundItemSerializer(item, context={'request': request})
            if result['is_admin']
            else PublicFoundItemSerializer(item, context={'request': request})
        )
        payload['found_item'] = item_serializer.data
        if 'ticket' in result:
            payload['claim_ticket'] = ClaimTicketSerializer(
                result['ticket'], context={'request': request}
            ).data
        return Response(payload, status=status.HTTP_200_OK)


class LeaderboardView(APIView):
    """Public campus honesty leaderboard ranked strictly per academic department."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rows = get_department_leaderboard()
        return Response(
            DepartmentLeaderboardEntrySerializer(rows, many=True).data,
            status=status.HTTP_200_OK,
        )


class OsasAnalyticsView(APIView):
    """Admin-only analytics endpoint for OSAS dashboard KPIs & charts."""

    permission_classes = [IsOsasAdmin]

    def get(self, request):
        return Response(get_osas_dashboard_analytics(), status=status.HTTP_200_OK)


class PortalConfigurationView(APIView):
    """Public read, OSAS Admin write for portal office hours & retention configuration."""

    permission_classes = [IsPublicReadOrAdminWrite]

    def get(self, request):
        config = get_or_create_portal_config()
        return Response(PortalConfigurationSerializer(config).data, status=status.HTTP_200_OK)

    def patch(self, request):
        config = get_or_create_portal_config()
        serializer = PortalConfigurationSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_portal_config(serializer.validated_data)
        return Response(PortalConfigurationSerializer(updated).data, status=status.HTTP_200_OK)

    def put(self, request):
        return self.patch(request)


class MyActivityRecordsView(APIView):
    """Return the authenticated student's own claimed, returned, and lost item records."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        records = get_student_activity_records(student=request.user)
        return Response(records, status=status.HTTP_200_OK)
