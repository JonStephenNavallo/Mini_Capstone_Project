from django.utils import timezone
from rest_framework import serializers

from apps.users.models import User
from .models import (
    CampusLocation,
    ClaimTicket,
    ClaimTransaction,
    FoundItem,
    FoundItemPhoto,
    ItemCategory,
    ItemMatchCandidate,
    LostItemReport,
    PortalConfiguration,
    StudentHonestyProfile,
)


class ItemCategorySerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(read_only=True, default=0)
    lost_reports_count = serializers.IntegerField(read_only=True, default=0)
    retention_days = serializers.IntegerField(min_value=1, max_value=3650, default=90)

    class Meta:
        model = ItemCategory
        fields = [
            'id',
            'name',
            'icon_key',
            'retention_days',
            'requires_secret_verification',
            'is_active',
            'items_count',
            'lost_reports_count',
        ]


class CampusLocationSerializer(serializers.ModelSerializer):
    label = serializers.CharField(read_only=True)
    qr_slug = serializers.SlugField(max_length=80, required=False, allow_blank=True)
    items_count = serializers.IntegerField(read_only=True, default=0)
    lost_reports_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CampusLocation
        fields = [
            'id',
            'building_name',
            'floor_room',
            'label',
            'qr_slug',
            'is_drop_off_point',
            'is_active',
            'items_count',
            'lost_reports_count',
        ]


class RelativeImageField(serializers.ImageField):
    """
    Serialize uploaded images as root-relative `/media/...` URLs instead of
    `http://127.0.0.1:8000/media/...` so mobile devices accessing the portal
    over LAN or tunnels load images cleanly through the frontend `/media` proxy.
    """

    def to_representation(self, value):
        if not value:
            return None
        try:
            return value.url
        except AttributeError:
            return None


class FoundItemPhotoSerializer(serializers.ModelSerializer):
    image = RelativeImageField(read_only=True)

    class Meta:
        model = FoundItemPhoto
        fields = ['id', 'image', 'display_order']


class PublicFoundItemSerializer(serializers.ModelSerializer):
    """
    Public/Student-safe FoundItem representation.
    Strictly omits confidential fields (secret_identifiers, secret_photo, finder_contact).
    """

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon_key', read_only=True)
    location_label = serializers.SerializerMethodField()
    finder_display = serializers.SerializerMethodField()
    claim_date = serializers.SerializerMethodField()
    public_handover_photo = serializers.SerializerMethodField()
    primary_photo = RelativeImageField(read_only=True)
    photos = FoundItemPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = FoundItem
        fields = [
            'id',
            'tracking_code',
            'category',
            'category_name',
            'category_icon',
            'title',
            'general_description',
            'found_location',
            'found_location_custom',
            'location_label',
            'date_found',
            'finder_type',
            'finder_department',
            'finder_display',
            'custody_status',
            'primary_photo',
            'public_handover_photo',
            'photos',
            'claim_date',
            'created_at',
        ]

    def get_location_label(self, obj):
        if obj.found_location:
            return obj.found_location.label
        return obj.found_location_custom or 'Campus Grounds'

    def get_finder_display(self, obj):
        if obj.finder_user:
            return obj.finder_user.display_name
        if obj.finder_name:
            return obj.finder_name
        return 'Anonymous Good Samaritan'

    def get_claim_date(self, obj):
        for tx in obj.claim_transactions.all():
            if not tx.is_voided:
                return tx.claim_date
        return None

    def get_public_handover_photo(self, obj):
        # Expose only the optional handover photo when the claimant explicitly consented
        for tx in obj.claim_transactions.all():
            if not tx.is_voided and tx.public_handover_consent and tx.public_handover_photo:
                try:
                    return tx.public_handover_photo.url
                except AttributeError:
                    return None
        return None


class ClaimTransactionSerializer(serializers.ModelSerializer):
    verifying_admin_name = serializers.SerializerMethodField()
    voided_by_name = serializers.SerializerMethodField()
    found_item_tracking = serializers.CharField(source='found_item.tracking_code', read_only=True)
    found_item_title = serializers.CharField(source='found_item.title', read_only=True)
    id_photo_evidence = RelativeImageField(read_only=True)
    public_handover_photo = RelativeImageField(read_only=True)

    class Meta:
        model = ClaimTransaction
        fields = [
            'id',
            'found_item',
            'found_item_tracking',
            'found_item_title',
            'claimant_student',
            'claimant_name',
            'claimant_student_number',
            'claimant_id_type',
            'verifying_admin',
            'verifying_admin_name',
            'claim_date',
            'id_photo_evidence',
            'public_handover_photo',
            'public_handover_consent',
            'verification_notes',
            'is_voided',
            'void_reason',
            'voided_at',
            'voided_by',
            'voided_by_name',
        ]

    def get_verifying_admin_name(self, obj):
        return obj.verifying_admin.display_name if obj.verifying_admin else ''

    def get_voided_by_name(self, obj):
        return obj.voided_by.display_name if obj.voided_by else ''


class AdminFoundItemSerializer(PublicFoundItemSerializer):
    """Admin-only FoundItem serializer exposing secret verification markers, shelf bin, and claim audit history."""

    secret_photo = RelativeImageField(read_only=True)
    claim_transaction = serializers.SerializerMethodField()
    claim_history = ClaimTransactionSerializer(source='claim_transactions', many=True, read_only=True)

    class Meta(PublicFoundItemSerializer.Meta):
        fields = PublicFoundItemSerializer.Meta.fields + [
            'qr_token',
            'secret_identifiers',
            'secret_photo',
            'storage_shelf_bin',
            'finder_user',
            'finder_name',
            'finder_contact',
            'claim_transaction',
            'claim_history',
            'updated_at',
        ]

    def get_claim_transaction(self, obj):
        for tx in obj.claim_transactions.all():
            if not tx.is_voided:
                return ClaimTransactionSerializer(tx, context=self.context).data
        return None


class FoundItemReportWriteSerializer(serializers.ModelSerializer):
    """Input serializer for reporting a found item (public/student/admin)."""

    finder_user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = FoundItem
        fields = [
            'category',
            'title',
            'general_description',
            'secret_identifiers',
            'found_location',
            'found_location_custom',
            'date_found',
            'finder_type',
            'finder_user',
            'finder_name',
            'finder_contact',
            'finder_department',
            'custody_status',
            'storage_shelf_bin',
            'primary_photo',
            'secret_photo',
        ]

    def validate_date_found(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError('Date found cannot be in the future.')
        return value


class ItemMatchCandidateSerializer(serializers.ModelSerializer):
    found_item = PublicFoundItemSerializer(read_only=True)

    class Meta:
        model = ItemMatchCandidate
        fields = [
            'id',
            'lost_report',
            'found_item',
            'match_score',
            'match_reasons',
            'student_feedback',
            'created_at',
        ]


class LostItemReportSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    location_label = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    reference_photo = RelativeImageField(required=False, allow_null=True)
    match_candidates = ItemMatchCandidateSerializer(many=True, read_only=True)

    class Meta:
        model = LostItemReport
        fields = [
            'id',
            'student',
            'student_name',
            'category',
            'category_name',
            'item_name',
            'detailed_description',
            'distinctive_features',
            'suspected_location',
            'suspected_location_custom',
            'location_label',
            'date_lost',
            'reference_photo',
            'status',
            'match_candidates',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'student', 'status', 'created_at', 'updated_at']

    def get_location_label(self, obj):
        if obj.suspected_location:
            return obj.suspected_location.label
        return obj.suspected_location_custom or 'Unspecified'

    def validate_date_lost(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError('Date lost cannot be in the future.')
        return value


class ClaimTicketSerializer(serializers.ModelSerializer):
    found_item_detail = PublicFoundItemSerializer(source='found_item', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    student_number = serializers.SerializerMethodField()

    class Meta:
        model = ClaimTicket
        fields = [
            'id',
            'ticket_code',
            'found_item',
            'found_item_detail',
            'student',
            'student_name',
            'student_number',
            'status',
            'expires_at',
            'created_at',
        ]
        read_only_fields = ['id', 'ticket_code', 'student', 'status', 'expires_at', 'created_at']

    def get_student_number(self, obj):
        profile = getattr(obj.student, 'student_profile', None)
        return profile.student_number if profile else ''


class WalkInClaimInputSerializer(serializers.Serializer):
    claimant_student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.RoleType.STUDENT),
        required=False,
        allow_null=True,
    )
    claimant_name = serializers.CharField(max_length=160)
    claimant_student_number = serializers.CharField(max_length=40)
    claimant_id_type = serializers.CharField(max_length=80, required=False, default='School ID')
    ticket_code = serializers.CharField(max_length=24, required=False, allow_blank=True, default='')
    verification_notes = serializers.CharField(required=False, allow_blank=True, default='')
    id_photo_evidence = serializers.ImageField(required=False, allow_null=True)
    public_handover_photo = serializers.ImageField(required=False, allow_null=True)
    public_handover_consent = serializers.BooleanField(required=False, default=False)


class DepartmentLeaderboardEntrySerializer(serializers.Serializer):
    """Per-department honesty leaderboard ranking entry (no individual student profiles)."""

    department = serializers.CharField()
    total_items_surrendered = serializers.IntegerField()
    total_points = serializers.IntegerField()
    current_tier = serializers.CharField()
    tier_label = serializers.CharField()
    updated_at = serializers.DateTimeField(allow_null=True)


class PortalConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalConfiguration
        fields = [
            'id',
            'office_name',
            'office_location',
            'office_hours',
            'default_retention_days',
            'allow_guest_found_reports',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']
