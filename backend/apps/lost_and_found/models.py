import random
import string
import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


def _generate_tracking_code():
    year = timezone.localdate().year
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f'OSAS-{year}-{suffix}'


def _generate_ticket_code():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f'CLM-{suffix}'


class ItemCategory(models.Model):
    """Configurable category for lost and found items."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    icon_key = models.CharField(max_length=50, default='category')
    retention_days = models.PositiveIntegerField(default=90)
    requires_secret_verification = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_item_categories'
        ordering = ['name']
        verbose_name_plural = 'Item Categories'

    def __str__(self):
        return self.name


class CampusLocation(models.Model):
    """Campus buildings/rooms and QR poster drop-off stations."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building_name = models.CharField(max_length=120)
    floor_room = models.CharField(max_length=120, blank=True, default='')
    qr_slug = models.SlugField(max_length=80, unique=True)
    is_drop_off_point = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_campus_locations'
        ordering = ['building_name', 'floor_room']

    @property
    def label(self):
        if self.floor_room:
            return f'{self.building_name} — {self.floor_room}'
        return self.building_name

    def __str__(self):
        return self.label


class FoundItem(models.Model):
    """Official OSAS custody ledger entry for a found campus property item."""

    class Department(models.TextChoices):
        BSIT = 'BSIT', 'BSIT'
        BSSW = 'BSSW', 'BSSW'
        BSPA = 'BSPA', 'BSPA'
        DHRS = 'DHRS', 'DHRS'
        BSAIS = 'BSAIS', 'BSAIS'
        BSA = 'BSA', 'BSA'
        BSE = 'BSE', 'BSE'
        BTVTED = 'BTVTED', 'BTVTED'
        ABELS = 'ABELS', 'ABELS'

    class FinderType(models.TextChoices):
        AUTHENTICATED_STUDENT = 'AUTHENTICATED_STUDENT', 'Authenticated Student'
        STAFF = 'STAFF', 'Staff / Admin'
        GUEST_ANONYMOUS = 'GUEST_ANONYMOUS', 'Guest / Anonymous'

    class CustodyStatus(models.TextChoices):
        PENDING_SURRENDER = 'PENDING_SURRENDER', 'Pending OSAS Intake'
        IN_CUSTODY = 'IN_CUSTODY', 'In OSAS Custody'
        CLAIMED = 'CLAIMED', 'Claimed & Released'
        DONATED = 'DONATED', 'Donated'
        DISPOSED = 'DISPOSED', 'Disposed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(
        max_length=30,
        unique=True,
        default=_generate_tracking_code,
    )
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.PROTECT,
        related_name='found_items',
    )
    title = models.CharField(max_length=160)
    general_description = models.TextField()
    # Confidential verification notes — NEVER exposed on public/student endpoints
    secret_identifiers = models.TextField(blank=True, default='')
    found_location = models.ForeignKey(
        CampusLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='found_items',
    )
    found_location_custom = models.CharField(max_length=160, blank=True, default='')
    date_found = models.DateField(default=timezone.localdate)

    finder_type = models.CharField(
        max_length=30,
        choices=FinderType.choices,
        default=FinderType.GUEST_ANONYMOUS,
    )
    finder_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surrendered_items',
    )
    finder_name = models.CharField(max_length=120, blank=True, default='')
    finder_contact = models.CharField(max_length=120, blank=True, default='')
    # Department/Course credited on the Department Honesty Leaderboard upon verified intake
    finder_department = models.CharField(
        max_length=20,
        choices=Department.choices,
        blank=True,
        default='',
        db_index=True,
    )

    custody_status = models.CharField(
        max_length=25,
        choices=CustodyStatus.choices,
        default=CustodyStatus.PENDING_SURRENDER,
    )
    storage_shelf_bin = models.CharField(max_length=80, blank=True, default='')
    primary_photo = models.ImageField(upload_to='lost_found/public/', null=True, blank=True)
    secret_photo = models.ImageField(upload_to='lost_found/secret/', null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logged_found_items',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lnf_found_items'
        ordering = ['-date_found', '-created_at']
        indexes = [
            models.Index(fields=['custody_status', 'date_found'], name='idx_found_status_date'),
            models.Index(fields=['category', 'custody_status'], name='idx_found_cat_status'),
        ]

    def __str__(self):
        return f'{self.tracking_code} — {self.title}'


class FoundItemPhoto(models.Model):
    """Additional compressed public photo angles for a FoundItem (max 4 per item)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    found_item = models.ForeignKey(
        FoundItem,
        on_delete=models.CASCADE,
        related_name='photos',
    )
    image = models.ImageField(upload_to='lost_found/public/')
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_found_item_photos'
        ordering = ['display_order', 'created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(display_order__gte=0) & Q(display_order__lt=4),
                name='check_found_item_photo_order_max_4',
            ),
            models.UniqueConstraint(
                fields=['found_item', 'display_order'],
                name='unique_found_item_photo_order',
            ),
        ]

    def __str__(self):
        return f'{self.found_item.tracking_code} photo #{self.display_order + 1}'


class LostItemReport(models.Model):
    """Student inquiry report for a missing personal item (eligible for auto-matching)."""

    class ReportStatus(models.TextChoices):
        SEARCHING = 'SEARCHING', 'Searching'
        POTENTIAL_MATCH = 'POTENTIAL_MATCH', 'Potential Match Found'
        VERIFIED_CLAIMED = 'VERIFIED_CLAIMED', 'Verified & Claimed'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lost_item_reports',
    )
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.PROTECT,
        related_name='lost_reports',
    )
    item_name = models.CharField(max_length=160)
    detailed_description = models.TextField()
    distinctive_features = models.TextField(blank=True, default='')
    suspected_location = models.ForeignKey(
        CampusLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lost_reports',
    )
    suspected_location_custom = models.CharField(max_length=160, blank=True, default='')
    date_lost = models.DateField(default=timezone.localdate)
    reference_photo = models.ImageField(upload_to='lost_found/lost_refs/', null=True, blank=True)
    status = models.CharField(
        max_length=25,
        choices=ReportStatus.choices,
        default=ReportStatus.SEARCHING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lnf_lost_item_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'status'], name='idx_lost_student_status'),
        ]

    def __str__(self):
        return f'{self.item_name} ({self.student_id})'


class ItemMatchCandidate(models.Model):
    """Auto-matched candidate pairing a LostItemReport and a FoundItem."""

    class Feedback(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        IS_MY_ITEM = 'IS_MY_ITEM', 'Likely My Item'
        NOT_MY_ITEM = 'NOT_MY_ITEM', 'Not My Item'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lost_report = models.ForeignKey(
        LostItemReport,
        on_delete=models.CASCADE,
        related_name='match_candidates',
    )
    found_item = models.ForeignKey(
        FoundItem,
        on_delete=models.CASCADE,
        related_name='match_candidates',
    )
    match_score = models.DecimalField(max_digits=5, decimal_places=2)
    match_reasons = models.JSONField(default=dict, blank=True)
    notification_sent = models.BooleanField(default=False)
    student_feedback = models.CharField(
        max_length=20,
        choices=Feedback.choices,
        default=Feedback.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_match_candidates'
        ordering = ['-match_score', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['lost_report', 'found_item'],
                name='unique_lost_found_match_pair',
            ),
            models.CheckConstraint(
                condition=Q(match_score__gte=0) & Q(match_score__lte=100),
                name='check_match_score_bounds',
            ),
        ]

    def __str__(self):
        return f'{self.lost_report_id} <-> {self.found_item_id} ({self.match_score}%)'


class ClaimTicket(models.Model):
    """
    Walk-In QR Verification Pass generated by a student for in-person OSAS desk lookup.
    Does NOT grant online ownership or release — physical OSAS verification is mandatory.
    """

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active Walk-In Pass'
        USED = 'USED', 'Verified & Used'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_code = models.CharField(max_length=24, unique=True, default=_generate_ticket_code)
    found_item = models.ForeignKey(
        FoundItem,
        on_delete=models.CASCADE,
        related_name='claim_tickets',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='claim_tickets',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_claim_tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.ticket_code} ({self.status})'


class ClaimTransaction(models.Model):
    """Audit record created ONLY by an OSAS Admin upon physical walk-in release."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    found_item = models.ForeignKey(
        FoundItem,
        on_delete=models.PROTECT,
        related_name='claim_transactions',
    )
    claimant_student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='claimed_items',
    )
    claimant_name = models.CharField(max_length=160)
    claimant_student_number = models.CharField(max_length=40)
    claimant_id_type = models.CharField(max_length=80, default='School ID')
    verifying_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='verified_claims',
    )
    claim_date = models.DateTimeField(auto_now_add=True)
    id_photo_evidence = models.ImageField(upload_to='lost_found/claim_evidence/', null=True, blank=True)
    # Optional consented handover/reunion photo shown publicly on Claimed & Returned cards
    # (strictly separate from private id_photo_evidence, which remains OSAS Admin-only).
    public_handover_photo = models.ImageField(upload_to='lost_found/handover_photos/', null=True, blank=True)
    public_handover_consent = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True, default='')

    # Mistaken-claim reversal audit fields (never delete historical claim records)
    is_voided = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, default='')
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='voided_claims',
    )

    class Meta:
        db_table = 'lnf_claim_transactions'
        ordering = ['-claim_date']
        constraints = [
            models.UniqueConstraint(
                fields=['found_item'],
                condition=Q(is_voided=False),
                name='unique_active_claim_per_found_item',
            ),
        ]

    def __str__(self):
        return f'Claim {self.found_item.tracking_code} by {self.claimant_name}'


class StudentHonestyProfile(models.Model):
    """Gamified honesty recognition profile for students who return lost items."""

    class Tier(models.TextChoices):
        BRONZE = 'BRONZE', 'Bronze Samaritan'
        SILVER = 'SILVER', 'Silver Steward'
        GOLD = 'GOLD', 'Gold Guardian'
        CAMPUS_HERO = 'CAMPUS_HERO', 'Campus Honesty Hero'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='honesty_profile',
    )
    total_items_surrendered = models.PositiveIntegerField(default=0)
    total_points = models.PositiveIntegerField(default=0)
    current_tier = models.CharField(
        max_length=20,
        choices=Tier.choices,
        default=Tier.BRONZE,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lnf_student_honesty_profiles'
        ordering = ['-total_points', '-total_items_surrendered']

    def recompute_tier(self):
        if self.total_points >= 200:
            self.current_tier = self.Tier.CAMPUS_HERO
        elif self.total_points >= 100:
            self.current_tier = self.Tier.GOLD
        elif self.total_points >= 50:
            self.current_tier = self.Tier.SILVER
        else:
            self.current_tier = self.Tier.BRONZE

    def __str__(self):
        return f'{self.user_id} — {self.total_points} pts'


class HonestyPointLog(models.Model):
    """Immutable point award ledger for returned items."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentHonestyProfile,
        on_delete=models.CASCADE,
        related_name='point_logs',
    )
    found_item = models.ForeignKey(
        FoundItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='point_logs',
    )
    points = models.PositiveIntegerField(default=25)
    reason = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_honesty_point_logs'
        ordering = ['-created_at']


class DepartmentHonestyProfile(models.Model):
    """Gamified honesty leaderboard profile aggregated strictly per academic department/course."""

    class Tier(models.TextChoices):
        BRONZE = 'BRONZE', 'Bronze Samaritan'
        SILVER = 'SILVER', 'Silver Steward'
        GOLD = 'GOLD', 'Gold Guardian'
        CAMPUS_HERO = 'CAMPUS_HERO', 'Campus Honesty Hero'

    department = models.CharField(
        max_length=20,
        choices=FoundItem.Department.choices,
        primary_key=True,
    )
    total_items_surrendered = models.PositiveIntegerField(default=0)
    total_points = models.PositiveIntegerField(default=0)
    current_tier = models.CharField(
        max_length=20,
        choices=Tier.choices,
        default=Tier.BRONZE,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lnf_department_honesty_profiles'
        ordering = ['-total_points', '-total_items_surrendered', 'department']

    def recompute_tier(self):
        if self.total_points >= 200:
            self.current_tier = self.Tier.CAMPUS_HERO
        elif self.total_points >= 100:
            self.current_tier = self.Tier.GOLD
        elif self.total_points >= 50:
            self.current_tier = self.Tier.SILVER
        else:
            self.current_tier = self.Tier.BRONZE

    def __str__(self):
        return f'{self.department} — {self.total_points} pts'


class DepartmentHonestyPointLog(models.Model):
    """Immutable point award ledger crediting a department for a verified returned item."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        DepartmentHonestyProfile,
        on_delete=models.CASCADE,
        related_name='point_logs',
    )
    found_item = models.OneToOneField(
        FoundItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_point_log',
    )
    points = models.PositiveIntegerField(default=25)
    reason = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lnf_department_honesty_point_logs'
        ordering = ['-created_at']


class PortalConfiguration(models.Model):
    """Singleton portal configuration managed by OSAS Administrators."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    office_name = models.CharField(
        max_length=160,
        default='Office of Student Affairs and Services (OSAS)',
    )
    office_location = models.CharField(
        max_length=200,
        default='Student Center Building, Ground Floor, Room 102',
    )
    office_hours = models.CharField(
        max_length=160,
        default='Monday – Friday, 8:00 AM – 5:00 PM',
    )
    default_retention_days = models.PositiveIntegerField(default=90)
    allow_guest_found_reports = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lnf_portal_configuration'

    def __str__(self):
        return self.office_name
