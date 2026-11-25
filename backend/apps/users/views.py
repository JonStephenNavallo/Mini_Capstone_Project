from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import StandardPageNumberPagination
from apps.lost_and_found.services import get_student_activity_records
from .models import User
from .serializers import (
    AdminStudentAccountSerializer,
    StudentLookupSerializer,
    UserAccountSettingsUpdateSerializer,
    UserMeSerializer,
)
from .services import (
    reset_student_password,
    set_student_active_status,
    update_own_account_profile,
)


class IsAdminRole(permissions.BasePermission):
    """Deny-by-default permission allowing only active OSAS ADMIN users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.RoleType.ADMIN
        )


class UserMeView(APIView):
    """Return or update the authenticated user's self-service profile."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = (
            User.objects.select_related('student_profile', 'staff_profile')
            .get(pk=request.user.pk)
        )
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserAccountSettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = update_own_account_profile(
            user=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(UserMeSerializer(updated).data, status=status.HTTP_200_OK)


class StudentDirectoryLookupView(APIView):
    """Admin-only student lookup to associate walk-in claimants with student accounts."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        qs = User.objects.select_related('student_profile').filter(
            role=User.RoleType.STUDENT,
            is_active=True,
            student_profile__isnull=False,
        )
        if query:
            qs = qs.filter(
                Q(email__icontains=query)
                | Q(student_profile__student_number__icontains=query)
                | Q(student_profile__first_name__icontains=query)
                | Q(student_profile__last_name__icontains=query)
            )
        qs = qs[:20]
        return Response(StudentLookupSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class AdminStudentManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """OSAS Admin-only student accounts directory with password reset and status controls."""

    serializer_class = AdminStudentAccountSerializer
    permission_classes = [IsAdminRole]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        # Always restrict to STUDENT accounts and join StudentProfile to prevent N+1 queries
        qs = (
            User.objects.select_related('student_profile')
            .filter(role=User.RoleType.STUDENT)
            .order_by('-date_joined', 'id')
        )
        status_param = (self.request.query_params.get('status') or '').strip().upper()
        if status_param == 'ACTIVE':
            qs = qs.filter(is_active=True)
        elif status_param == 'INACTIVE':
            qs = qs.filter(is_active=False)
        elif status_param == 'RESET_REQUIRED':
            qs = qs.filter(needs_password_change=True)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(student_profile__student_number__icontains=search)
                | Q(student_profile__first_name__icontains=search)
                | Q(student_profile__last_name__icontains=search)
                | Q(student_profile__program_year__icontains=search)
            )
        return qs

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        student, temporary_password = reset_student_password(student_id=pk)
        return Response(
            {
                'student': AdminStudentAccountSerializer(student).data,
                'temporary_password': temporary_password,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        is_active = request.data.get('is_active')
        if not isinstance(is_active, bool):
            return Response(
                {'is_active': 'A boolean is_active value is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        student = set_student_active_status(student_id=pk, is_active=is_active)
        return Response(
            AdminStudentAccountSerializer(student).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'], url_path='records')
    def records(self, request, pk=None):
        """Return a student's claimed, returned, and lost-report activity records for OSAS review."""
        student = self.get_object()
        return Response(get_student_activity_records(student=student), status=status.HTTP_200_OK)
