"""Stateless domain service layer for Lost & Found custody, claiming, QR lookup, and leaderboard."""
from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.notifications.models import Notification
from apps.notifications.services import notify_user
from apps.users.models import User
from .image_utils import MAX_ITEM_PHOTOS, compress_uploaded_image
from .matching_service import run_matching_for_found_item, run_matching_for_lost_report
from .models import (
    CampusLocation,
    ClaimTicket,
    ClaimTransaction,
    DepartmentHonestyPointLog,
    DepartmentHonestyProfile,
    FoundItem,
    FoundItemPhoto,
    HonestyPointLog,
    ItemCategory,
    ItemMatchCandidate,
    LostItemReport,
    PortalConfiguration,
    StudentHonestyProfile,
)


def get_or_create_portal_config() -> PortalConfiguration:
    config, _ = PortalConfiguration.objects.get_or_create(pk=1)
    return config


@transaction.atomic
def update_portal_config(validated_data: dict) -> PortalConfiguration:
    config, _ = PortalConfiguration.objects.select_for_update().get_or_create(pk=1)
    for field, value in validated_data.items():
        setattr(config, field, value)
    config.save()
    return config


@transaction.atomic
def award_department_honesty_points(
    *,
    found_item: FoundItem,
    points: int = 25,
    reason: str = '',
) -> DepartmentHonestyProfile | None:
    """Award honesty leaderboard points to the finder's academic department/course."""
    department = (found_item.finder_department or '').strip().upper()
    if not department or department not in FoundItem.Department.values:
        return None
    if DepartmentHonestyPointLog.objects.filter(found_item=found_item).exists():
        return DepartmentHonestyProfile.objects.filter(department=department).first()

    profile, _ = DepartmentHonestyProfile.objects.select_for_update().get_or_create(
        department=department
    )
    profile.total_items_surrendered += 1
    profile.total_points += points
    profile.recompute_tier()
    profile.save()

    DepartmentHonestyPointLog.objects.create(
        profile=profile,
        found_item=found_item,
        points=points,
        reason=reason or f'Surrendered item {found_item.tracking_code} ({found_item.title})',
    )

    if found_item.finder_user and found_item.finder_user.role == User.RoleType.STUDENT:
        notify_user(
            recipient=found_item.finder_user,
            title='Department Honesty Points Awarded!',
            message=(
                f'Your return of "{found_item.title}" ({found_item.tracking_code}) '
                f'earned +{points} honesty points for {department}!'
            ),
            category=Notification.Category.INTAKE,
            link_path='/leaderboard',
        )
    return profile


def get_department_leaderboard() -> list[dict]:
    """Return all 7 campus departments ranked by honesty points and verified returns."""
    profiles_by_dept = {
        p.department: p
        for p in DepartmentHonestyProfile.objects.all()
    }
    rows = []
    for code, _label in FoundItem.Department.choices:
        profile = profiles_by_dept.get(code)
        if profile:
            rows.append({
                'department': profile.department,
                'total_items_surrendered': profile.total_items_surrendered,
                'total_points': profile.total_points,
                'current_tier': profile.current_tier,
                'tier_label': profile.get_current_tier_display(),
                'updated_at': profile.updated_at,
            })
        else:
            rows.append({
                'department': code,
                'total_items_surrendered': 0,
                'total_points': 0,
                'current_tier': DepartmentHonestyProfile.Tier.BRONZE,
                'tier_label': DepartmentHonestyProfile.Tier.BRONZE.label,
                'updated_at': None,
            })

    rows.sort(key=lambda r: (-r['total_points'], -r['total_items_surrendered'], r['department']))
    return rows


@transaction.atomic
def award_honesty_points(*, user: User, found_item: FoundItem, points: int = 25, reason: str = '') -> StudentHonestyProfile:
    """Award honesty leaderboard points to a verified student finder."""
    if not user or user.role != User.RoleType.STUDENT:
        return None
    if HonestyPointLog.objects.filter(found_item=found_item, profile__user=user).exists():
        return StudentHonestyProfile.objects.filter(user=user).first()

    profile, _ = StudentHonestyProfile.objects.select_for_update().get_or_create(user=user)
    profile.total_items_surrendered += 1
    profile.total_points += points
    profile.recompute_tier()
    profile.save()

    HonestyPointLog.objects.create(
        profile=profile,
        found_item=found_item,
        points=points,
        reason=reason or f'Surrendered item {found_item.tracking_code} ({found_item.title})',
    )
    notify_user(
        recipient=user,
        title='Honesty Points Awarded!',
        message=f'You earned +{points} honesty points for turning in "{found_item.title}" ({found_item.tracking_code}).',
        category=Notification.Category.INTAKE,
        link_path='/leaderboard',
    )
    return profile


@transaction.atomic
def create_found_item(*, actor, validated_data: dict, extra_photos=None) -> FoundItem:
    """
    Create a FoundItem report with server-side image compression and up to 4 public photos.
    - OSAS Admin intake logs directly as IN_CUSTODY and triggers auto-matching immediately.
    - Student/Guest reports log as PENDING_SURRENDER until physically verified by OSAS.
    """
    is_authenticated = bool(actor and getattr(actor, 'is_authenticated', False))
    is_admin = bool(is_authenticated and actor.role == User.RoleType.ADMIN)

    if not is_authenticated:
        raise PermissionDenied(
            'Sign in with a student account to report a found item online, or surrender it directly at the OSAS Office.'
        )

    if is_admin:
        custody_status = validated_data.pop('custody_status', FoundItem.CustodyStatus.IN_CUSTODY)
        if custody_status not in (
            FoundItem.CustodyStatus.IN_CUSTODY,
            FoundItem.CustodyStatus.PENDING_SURRENDER,
        ):
            custody_status = FoundItem.CustodyStatus.IN_CUSTODY
        finder_user = validated_data.pop('finder_user', None)
        if finder_user is not None:
            finder_type = FoundItem.FinderType.AUTHENTICATED_STUDENT
        else:
            finder_type = validated_data.pop('finder_type', FoundItem.FinderType.STAFF)
    else:
        custody_status = FoundItem.CustodyStatus.PENDING_SURRENDER
        validated_data.pop('custody_status', None)
        validated_data.pop('storage_shelf_bin', None)
        validated_data.pop('secret_identifiers', None)
        validated_data.pop('secret_photo', None)
        if is_authenticated:
            finder_user = actor
            finder_type = FoundItem.FinderType.AUTHENTICATED_STUDENT
        else:
            finder_user = None
            finder_type = FoundItem.FinderType.GUEST_ANONYMOUS

    # Gather public photos (prefer multi-upload `photos` list; fall back to `primary_photo`)
    raw_primary = validated_data.pop('primary_photo', None)
    raw_photos = [p for p in (extra_photos or []) if p]
    if raw_primary and not raw_photos:
        raw_photos = [raw_primary]
    elif raw_primary and raw_photos:
        raw_photos = [raw_primary, *raw_photos]

    if len(raw_photos) > MAX_ITEM_PHOTOS:
        raise ValidationError(
            {'photos': f'You can upload a maximum of {MAX_ITEM_PHOTOS} photos per item.'}
        )

    compressed_photos = [
        compress_uploaded_image(photo, field_name='photos') for photo in raw_photos
    ]

    if validated_data.get('secret_photo'):
        validated_data['secret_photo'] = compress_uploaded_image(
            validated_data['secret_photo'], field_name='secret_photo'
        )

    if compressed_photos:
        validated_data['primary_photo'] = compressed_photos[0]

    found_item = FoundItem.objects.create(
        **validated_data,
        custody_status=custody_status,
        finder_type=finder_type,
        finder_user=finder_user,
        created_by=actor if is_authenticated else None,
    )

    for order_idx, comp_file in enumerate(compressed_photos):
        if order_idx == 0 and found_item.primary_photo:
            # Share the already-saved cover file reference to avoid writing photo #1 twice
            FoundItemPhoto.objects.create(
                found_item=found_item,
                image=found_item.primary_photo.name,
                display_order=0,
            )
        else:
            FoundItemPhoto.objects.create(
                found_item=found_item,
                image=comp_file,
                display_order=order_idx,
            )

    if found_item.custody_status == FoundItem.CustodyStatus.IN_CUSTODY:
        award_department_honesty_points(found_item=found_item)
        run_matching_for_found_item(found_item)
    elif found_item.custody_status == FoundItem.CustodyStatus.PENDING_SURRENDER:
        loc_label = (
            found_item.found_location.label
            if found_item.found_location
            else (found_item.found_location_custom or 'Campus')
        )
        for admin_user in User.objects.filter(role=User.RoleType.ADMIN, is_active=True):
            notify_user(
                recipient=admin_user,
                title='New Found Item Pending Intake',
                message=(
                    f'A student reported "{found_item.title}" ({found_item.tracking_code}) '
                    f'found at {loc_label}. Verify physical surrender in Items Directory.'
                ),
                category=Notification.Category.INTAKE,
                link_path='/admin/directory?status=PENDING_SURRENDER',
            )

    return (
        FoundItem.objects.select_related(
            'category', 'found_location', 'finder_user', 'created_by'
        )
        .prefetch_related('photos')
        .get(pk=found_item.pk)
    )


@transaction.atomic
def approve_custody_intake(
    *,
    found_item_id,
    admin_user: User,
    storage_shelf_bin: str = '',
    secret_identifiers: str = '',
) -> FoundItem:
    """Confirm physical surrender at OSAS desk, award finder points, and run auto-matching."""
    item = FoundItem.objects.select_for_update(of=('self',)).select_related('finder_user').get(pk=found_item_id)
    if item.custody_status != FoundItem.CustodyStatus.PENDING_SURRENDER:
        raise ValidationError({'custody_status': 'Only items pending surrender can be approved into custody.'})

    item.custody_status = FoundItem.CustodyStatus.IN_CUSTODY
    if storage_shelf_bin:
        item.storage_shelf_bin = storage_shelf_bin
    if secret_identifiers:
        item.secret_identifiers = secret_identifiers
    item.save(update_fields=['custody_status', 'storage_shelf_bin', 'secret_identifiers', 'updated_at'])

    award_department_honesty_points(found_item=item)

    run_matching_for_found_item(item)
    return item


@transaction.atomic
def update_found_item(*, found_item_id, validated_data: dict) -> FoundItem:
    item = FoundItem.objects.select_for_update().get(pk=found_item_id)
    if item.custody_status == FoundItem.CustodyStatus.CLAIMED:
        raise ValidationError(
            {'detail': 'Claimed items are locked and cannot be edited. Reverse the mistaken claim first if needed.'}
        )

    requested_status = validated_data.get('custody_status')
    if requested_status == FoundItem.CustodyStatus.CLAIMED:
        raise ValidationError(
            {'custody_status': 'Items can only be marked CLAIMED through the Claim Counter verification workflow.'}
        )

    if validated_data.get('primary_photo'):
        validated_data['primary_photo'] = compress_uploaded_image(
            validated_data['primary_photo'], field_name='primary_photo'
        )
    if validated_data.get('secret_photo'):
        validated_data['secret_photo'] = compress_uploaded_image(
            validated_data['secret_photo'], field_name='secret_photo'
        )

    previous_status = item.custody_status
    for field, value in validated_data.items():
        setattr(item, field, value)
    item.save()

    if (
        previous_status != FoundItem.CustodyStatus.IN_CUSTODY
        and item.custody_status == FoundItem.CustodyStatus.IN_CUSTODY
    ):
        run_matching_for_found_item(item)

    return (
        FoundItem.objects.select_related(
            'category',
            'found_location',
            'finder_user__student_profile',
            'finder_user__staff_profile',
        )
        .prefetch_related(
            'photos',
            'claim_transactions__verifying_admin__staff_profile',
            'claim_transactions__voided_by__staff_profile',
        )
        .get(pk=item.pk)
    )


@transaction.atomic
def delete_found_item(*, found_item_id) -> None:
    item = FoundItem.objects.select_for_update().get(pk=found_item_id)
    if item.custody_status in (
        FoundItem.CustodyStatus.CLAIMED,
        FoundItem.CustodyStatus.DONATED,
        FoundItem.CustodyStatus.DISPOSED,
    ):
        raise ValidationError(
            {'detail': 'Finalized custody records (Claimed, Donated, or Disposed) cannot be deleted to preserve audit history.'}
        )
    if item.claim_transactions.exists():
        raise ValidationError({'detail': 'Cannot delete an item that has a claim transaction audit record.'})
    item.delete()


@transaction.atomic
def create_lost_item_report(*, student: User, validated_data: dict) -> LostItemReport:
    if validated_data.get('reference_photo'):
        validated_data['reference_photo'] = compress_uploaded_image(
            validated_data['reference_photo'], field_name='reference_photo'
        )
    report = LostItemReport.objects.create(student=student, **validated_data)
    run_matching_for_lost_report(report)
    return LostItemReport.objects.select_related('category', 'suspected_location', 'student').get(pk=report.pk)


@transaction.atomic
def close_lost_item_report(*, report_id, actor: User) -> LostItemReport:
    """Mark a student's own LostItemReport as CLOSED so auto-matching stops pinging them."""
    qs = LostItemReport.objects.select_for_update().filter(pk=report_id)
    if actor.role != User.RoleType.ADMIN:
        qs = qs.filter(student=actor)
    report = qs.first()
    if report is None:
        raise PermissionDenied('Lost item report not found or not owned by you.')

    report.status = LostItemReport.ReportStatus.CLOSED
    report.save(update_fields=['status', 'updated_at'])
    return LostItemReport.objects.select_related('category', 'suspected_location', 'student').prefetch_related(
        'match_candidates__found_item__category',
        'match_candidates__found_item__found_location',
    ).get(pk=report.pk)


@transaction.atomic
def delete_lost_item_report(*, report_id, actor: User) -> None:
    """Permanently delete a student's own LostItemReport and its match candidates."""
    qs = LostItemReport.objects.select_for_update().filter(pk=report_id)
    if actor.role != User.RoleType.ADMIN:
        qs = qs.filter(student=actor)
    report = qs.first()
    if report is None:
        raise PermissionDenied('Lost item report not found or not owned by you.')
    report.delete()


@transaction.atomic
def update_match_feedback(*, match_id, student: User, feedback: str) -> ItemMatchCandidate:
    candidate = ItemMatchCandidate.objects.select_for_update(of=('self',)).select_related('lost_report').get(pk=match_id)
    if candidate.lost_report.student_id != student.id and student.role != User.RoleType.ADMIN:
        raise PermissionDenied('You can only update feedback on your own lost item matches.')
    if feedback not in ItemMatchCandidate.Feedback.values:
        raise ValidationError({'student_feedback': 'Invalid feedback choice.'})
    candidate.student_feedback = feedback
    candidate.save(update_fields=['student_feedback'])
    return candidate


@transaction.atomic
def generate_walkin_claim_ticket(*, found_item_id, student: User) -> ClaimTicket:
    """
    Generate a 72-hour Walk-In QR Claim Pass so OSAS staff can pull up the item
    immediately when the student visits in person. Does NOT claim or reserve ownership.
    """
    item = FoundItem.objects.select_for_update().get(pk=found_item_id)
    if item.custody_status != FoundItem.CustodyStatus.IN_CUSTODY:
        raise ValidationError({'detail': 'Walk-in claim passes can only be generated for items currently in OSAS custody.'})

    now = timezone.now()
    existing = ClaimTicket.objects.filter(
        found_item=item,
        student=student,
        status=ClaimTicket.Status.ACTIVE,
        expires_at__gt=now,
    ).first()
    if existing:
        return existing

    ticket = ClaimTicket.objects.create(
        found_item=item,
        student=student,
        status=ClaimTicket.Status.ACTIVE,
        expires_at=now + timedelta(hours=72),
    )

    # Alert active OSAS Admins that a student generated a walk-in pass for in-person verification
    student_profile = getattr(student, 'student_profile', None)
    student_label = (
        f'{student.display_name} ({student_profile.student_number})'
        if student_profile and student_profile.student_number
        else student.display_name
    )
    for admin_user in User.objects.filter(role=User.RoleType.ADMIN, is_active=True):
        notify_user(
            recipient=admin_user,
            title='New Walk-In Claim Pass Generated',
            message=(
                f'{student_label} generated walk-in pass {ticket.ticket_code} for '
                f'"{item.title}" ({item.tracking_code}). Open Claim Counter to verify when they arrive.'
            ),
            category=Notification.Category.CLAIM,
            link_path=f'/admin/claim?code={ticket.ticket_code}',
        )

    return ticket


@transaction.atomic
def process_walkin_claim(*, found_item_id, admin_user: User, validated_data: dict) -> ClaimTransaction:
    """
    Finalize physical walk-in item release at OSAS office.
    Strictly ADMIN-only; enforces IN_CUSTODY state and creates immutable ClaimTransaction.
    """
    if admin_user.role != User.RoleType.ADMIN:
        raise PermissionDenied('Only OSAS Administrators can process physical item claims.')

    item = FoundItem.objects.select_for_update(of=('self',)).select_related('finder_user').get(pk=found_item_id)
    if item.custody_status != FoundItem.CustodyStatus.IN_CUSTODY:
        raise ValidationError({'detail': f'Item is currently "{item.get_custody_status_display()}" and cannot be claimed.'})
    if ClaimTransaction.objects.filter(found_item=item, is_voided=False).exists():
        raise ValidationError({'detail': 'An active claim transaction already exists for this item.'})

    claimant_student = validated_data.get('claimant_student')
    claimant_student_number = (validated_data.get('claimant_student_number') or '').strip()
    # Auto-link walk-in claims to the student's portal account via student number when not explicitly passed
    if claimant_student is None and claimant_student_number:
        claimant_student = User.objects.filter(
            role=User.RoleType.STUDENT,
            student_profile__student_number__iexact=claimant_student_number,
        ).first()

    ticket_code = (validated_data.pop('ticket_code', '') or '').strip()

    id_photo = validated_data.get('id_photo_evidence')
    if id_photo:
        id_photo = compress_uploaded_image(id_photo, field_name='id_photo_evidence')

    handover_photo = validated_data.get('public_handover_photo')
    if handover_photo:
        handover_photo = compress_uploaded_image(handover_photo, field_name='public_handover_photo')
    handover_consent = bool(validated_data.get('public_handover_consent', False)) and bool(handover_photo)

    tx = ClaimTransaction.objects.create(
        found_item=item,
        claimant_student=claimant_student,
        claimant_name=validated_data['claimant_name'],
        claimant_student_number=claimant_student_number,
        claimant_id_type=validated_data.get('claimant_id_type') or 'School ID',
        verifying_admin=admin_user,
        id_photo_evidence=id_photo,
        public_handover_photo=handover_photo,
        public_handover_consent=handover_consent,
        verification_notes=validated_data.get('verification_notes', ''),
    )

    item.custody_status = FoundItem.CustodyStatus.CLAIMED
    item.save(update_fields=['custody_status', 'updated_at'])

    # Capture other STUDENT accounts holding active walk-in passes before expiring them
    other_ticket_students = list(
        User.objects.filter(
            role=User.RoleType.STUDENT,
            claim_tickets__found_item=item,
            claim_tickets__status=ClaimTicket.Status.ACTIVE,
        )
        .exclude(pk=claimant_student.pk if claimant_student else None)
        .distinct()
    )

    # Update active walk-in tickets
    if ticket_code:
        ClaimTicket.objects.filter(
            found_item=item, ticket_code__iexact=ticket_code, status=ClaimTicket.Status.ACTIVE
        ).update(status=ClaimTicket.Status.USED)
    ClaimTicket.objects.filter(
        found_item=item, status=ClaimTicket.Status.ACTIVE
    ).update(status=ClaimTicket.Status.EXPIRED)

    # 1. Claimant confirmation + auto-resolve their matched LostItemReport(s)
    if claimant_student is not None:
        LostItemReport.objects.filter(
            student=claimant_student,
            match_candidates__found_item=item,
            status__in=[
                LostItemReport.ReportStatus.SEARCHING,
                LostItemReport.ReportStatus.POTENTIAL_MATCH,
            ],
        ).update(status=LostItemReport.ReportStatus.VERIFIED_CLAIMED)

        notify_user(
            recipient=claimant_student,
            title='Item Claimed & Released',
            message=(
                f'Your claim for "{item.title}" ({item.tracking_code}) was verified and released by OSAS.'
            ),
            category=Notification.Category.CLAIM,
            link_path='/report-lost',
        )

    # 2. Privacy-safe update to other students whose active lost report or walk-in pass pointed to this item
    other_matched_reports = list(
        LostItemReport.objects.select_related('student')
        .filter(
            student__role=User.RoleType.STUDENT,
            match_candidates__found_item=item,
            status__in=[
                LostItemReport.ReportStatus.SEARCHING,
                LostItemReport.ReportStatus.POTENTIAL_MATCH,
            ],
        )
        .exclude(match_candidates__student_feedback=ItemMatchCandidate.Feedback.NOT_MY_ITEM)
        .exclude(student=claimant_student)
        .distinct()
    )

    notified_other_ids = set()
    for report in other_matched_reports:
        # Revert POTENTIAL_MATCH back to SEARCHING if no other in-custody match candidates remain
        if report.status == LostItemReport.ReportStatus.POTENTIAL_MATCH:
            has_other_live_matches = (
                ItemMatchCandidate.objects.filter(
                    lost_report=report,
                    found_item__custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
                )
                .exclude(found_item=item)
                .exclude(student_feedback=ItemMatchCandidate.Feedback.NOT_MY_ITEM)
                .exists()
            )
            if not has_other_live_matches:
                report.status = LostItemReport.ReportStatus.SEARCHING
                report.save(update_fields=['status', 'updated_at'])

        if report.student_id not in notified_other_ids:
            notified_other_ids.add(report.student_id)
            notify_user(
                recipient=report.student,
                title='Suggested Match Claimed',
                message=(
                    f'A suggested match ("{item.title}", {item.tracking_code}) has been claimed by another '
                    'verified owner. Your lost item report remains active for new matches.'
                ),
                category=Notification.Category.CLAIM,
                link_path='/report-lost',
            )

    for ticket_student in other_ticket_students:
        if ticket_student.pk not in notified_other_ids:
            notified_other_ids.add(ticket_student.pk)
            notify_user(
                recipient=ticket_student,
                title='Item Already Claimed',
                message=(
                    f'The item on your walk-in pass ("{item.title}", {item.tracking_code}) has been claimed '
                    'by another verified owner at OSAS.'
                ),
                category=Notification.Category.CLAIM,
                link_path='/explore',
            )

    # 3. Good Samaritan update to the authenticated student who surrendered the item
    if (
        item.finder_user is not None
        and item.finder_user.role == User.RoleType.STUDENT
        and item.finder_user_id != getattr(claimant_student, 'id', None)
    ):
        notify_user(
            recipient=item.finder_user,
            title='Item Reunited with Owner!',
            message=(
                f'Good news! The item you turned in ("{item.title}", {item.tracking_code}) has been '
                'verified and reunited with its rightful owner at OSAS. Thank you for your honesty!'
            ),
            category=Notification.Category.CLAIM,
            link_path='/leaderboard',
        )

    return tx


@transaction.atomic
def void_mistaken_claim(*, found_item_id, admin_user: User, void_reason: str) -> FoundItem:
    """
    Reverse a mistaken walk-in claim while preserving the original ClaimTransaction
    in the audit trail, then return the item to IN_CUSTODY for the rightful owner.
    """
    if admin_user.role != User.RoleType.ADMIN:
        raise PermissionDenied('Only OSAS Administrators can void a mistaken claim.')

    cleaned_reason = (void_reason or '').strip()
    if not cleaned_reason:
        raise ValidationError({'void_reason': 'Please provide a reason for reversing this claim.'})

    item = FoundItem.objects.select_for_update().get(pk=found_item_id)
    if item.custody_status != FoundItem.CustodyStatus.CLAIMED:
        raise ValidationError({'detail': 'Only currently CLAIMED items can have their claim reversed.'})

    active_tx = (
        ClaimTransaction.objects.select_for_update(of=('self',))
        .select_related('claimant_student')
        .filter(found_item=item, is_voided=False)
        .first()
    )
    if active_tx is None:
        raise ValidationError({'detail': 'No active claim record found to void for this item.'})

    active_tx.is_voided = True
    active_tx.void_reason = cleaned_reason
    active_tx.voided_at = timezone.now()
    active_tx.voided_by = admin_user
    active_tx.save(update_fields=['is_voided', 'void_reason', 'voided_at', 'voided_by'])

    item.custody_status = FoundItem.CustodyStatus.IN_CUSTODY
    item.save(update_fields=['custody_status', 'updated_at'])

    # 1. Notify the previous claimant & reopen any LostItemReport auto-closed by the mistaken claim
    prev_claimant = active_tx.claimant_student
    if prev_claimant is None and active_tx.claimant_student_number:
        prev_claimant = User.objects.filter(
            role=User.RoleType.STUDENT,
            student_profile__student_number__iexact=active_tx.claimant_student_number,
        ).first()

    if prev_claimant is not None:
        LostItemReport.objects.filter(
            student=prev_claimant,
            match_candidates__found_item=item,
            status=LostItemReport.ReportStatus.VERIFIED_CLAIMED,
        ).update(status=LostItemReport.ReportStatus.SEARCHING)

        notify_user(
            recipient=prev_claimant,
            title='Claim Reversed — Action Required',
            message=(
                f'Your claim for "{item.title}" ({item.tracking_code}) has been reversed by OSAS. '
                f'Reason: {cleaned_reason}. If the item is still in your possession, please return it '
                'to the OSAS Office immediately and bring your Student ID for further verification.'
            ),
            category=Notification.Category.CLAIM,
            link_path='/claim',
        )

    # 2. Re-alert other students whose active lost report matched this item (privacy-safe: no claimant PII)
    existing_other_reports = list(
        LostItemReport.objects.select_related('student')
        .filter(
            match_candidates__found_item=item,
            status__in=[
                LostItemReport.ReportStatus.SEARCHING,
                LostItemReport.ReportStatus.POTENTIAL_MATCH,
            ],
        )
        .exclude(match_candidates__student_feedback=ItemMatchCandidate.Feedback.NOT_MY_ITEM)
        .exclude(student=prev_claimant)
        .distinct()
    )

    re_alerted_student_ids = set()
    for report in existing_other_reports:
        if report.status == LostItemReport.ReportStatus.SEARCHING:
            report.status = LostItemReport.ReportStatus.POTENTIAL_MATCH
            report.save(update_fields=['status', 'updated_at'])

        if report.student_id not in re_alerted_student_ids:
            re_alerted_student_ids.add(report.student_id)
            notify_user(
                recipient=report.student,
                title='Matched Item Back in OSAS Custody',
                message=(
                    f'Good news! "{item.title}" ({item.tracking_code}), which matched your lost item report, '
                    'has been returned to OSAS custody and is available for in-person verification again.'
                ),
                category=Notification.Category.MATCH_ALERT,
                link_path=f'/report-lost?highlight={report.id}',
            )

    run_matching_for_found_item(item)

    return (
        FoundItem.objects.select_related(
            'category',
            'found_location',
            'finder_user__student_profile',
            'finder_user__staff_profile',
        )
        .prefetch_related(
            'photos',
            'claim_transactions__verifying_admin__staff_profile',
            'claim_transactions__voided_by__staff_profile',
        )
        .get(pk=item.pk)
    )


def lookup_by_qr_or_code(*, code: str, user) -> dict:
    """
    Unified QR/tracking code resolver supporting:
    - FoundItem tracking_code (OSAS-2026-XXXXX) or qr_token UUID
    - ClaimTicket ticket_code (CLM-XXXXXX)
    - CampusLocation qr_slug
    """
    raw = (code or '').strip()
    if not raw:
        raise ValidationError({'code': 'A QR code or tracking code is required.'})

    # Support full URLs encoded in QR posters or item tags
    if 'code=' in raw:
        raw = raw.split('code=', 1)[1].split('&', 1)[0].strip()
    elif 'location=' in raw:
        raw = raw.split('location=', 1)[1].split('&', 1)[0].strip()

    is_admin = bool(user and getattr(user, 'is_authenticated', False) and user.role == User.RoleType.ADMIN)

    # 1. Check ClaimTicket
    ticket = (
        ClaimTicket.objects.select_related(
            'found_item__category',
            'found_item__found_location',
            'student__student_profile',
        )
        .filter(ticket_code__iexact=raw)
        .first()
    )
    if ticket:
        if not is_admin and (not user or not user.is_authenticated or ticket.student_id != user.id):
            raise PermissionDenied('Only OSAS staff or the ticket owner can inspect this walk-in pass.')
        return {
            'match_type': 'CLAIM_TICKET',
            'ticket': ticket,
            'found_item': ticket.found_item,
            'is_admin': is_admin,
        }

    # 2. Check FoundItem by tracking_code or qr_token
    item_query = Q(tracking_code__iexact=raw)
    try:
        import uuid as _uuid
        parsed_uuid = _uuid.UUID(raw)
        item_query |= Q(qr_token=parsed_uuid)
    except ValueError:
        pass

    found_item = (
        FoundItem.objects.select_related('category', 'found_location', 'finder_user')
        .filter(item_query)
        .first()
    )
    if found_item:
        return {
            'match_type': 'FOUND_ITEM',
            'found_item': found_item,
            'is_admin': is_admin,
        }

    # 3. Check CampusLocation poster QR slug
    location = CampusLocation.objects.filter(qr_slug__iexact=raw, is_active=True).first()
    if location:
        return {
            'match_type': 'CAMPUS_LOCATION',
            'location': location,
            'is_admin': is_admin,
        }

    raise ValidationError({'code': f'No item, claim pass, or campus station found matching "{raw}".'})


@transaction.atomic
def create_item_category(*, validated_data: dict) -> ItemCategory:
    """Create a configurable Lost & Found item category with normalized naming."""
    name = (validated_data.get('name') or '').strip()
    if not name:
        raise ValidationError({'name': 'Category name is required.'})
    if ItemCategory.objects.filter(name__iexact=name).exists():
        raise ValidationError({'name': f'A category named "{name}" already exists.'})
    validated_data['name'] = name
    return ItemCategory.objects.create(**validated_data)


@transaction.atomic
def update_item_category(*, category_id, validated_data: dict) -> ItemCategory:
    """Update an existing ItemCategory while enforcing case-insensitive name uniqueness."""
    category = ItemCategory.objects.select_for_update().get(pk=category_id)
    if 'name' in validated_data:
        name = (validated_data['name'] or '').strip()
        if not name:
            raise ValidationError({'name': 'Category name cannot be blank.'})
        if ItemCategory.objects.filter(name__iexact=name).exclude(pk=category.pk).exists():
            raise ValidationError({'name': f'A category named "{name}" already exists.'})
        validated_data['name'] = name

    for field, value in validated_data.items():
        setattr(category, field, value)
    category.save()
    return category


@transaction.atomic
def delete_item_category(*, category_id) -> None:
    """
    Delete an ItemCategory if no FoundItem or LostItemReport references it.
    Translates DB-level PROTECT constraints into a clear 400 domain error.
    """
    category = ItemCategory.objects.select_for_update().get(pk=category_id)
    if category.found_items.exists() or category.lost_reports.exists():
        raise ValidationError(
            {
                'detail': (
                    f'Cannot delete "{category.name}" because it is linked to existing found items '
                    'or lost reports. Edit the category and set it to Inactive instead.'
                )
            }
        )
    try:
        category.delete()
    except ProtectedError as exc:
        raise ValidationError(
            {
                'detail': (
                    f'Cannot delete "{category.name}" because it is referenced by existing records. '
                    'Set it to Inactive instead.'
                )
            }
        ) from exc


def _build_unique_location_slug(building_name: str, floor_room: str = '', exclude_pk=None) -> str:
    """Generate a unique URL-safe QR slug for a CampusLocation."""
    base_raw = f'{building_name}-{floor_room}'.strip('-') if floor_room else building_name
    base_slug = slugify(base_raw)[:72] or 'campus-location'
    candidate = base_slug
    suffix = 2
    while CampusLocation.objects.filter(qr_slug__iexact=candidate).exclude(pk=exclude_pk).exists():
        candidate = f'{base_slug[:68]}-{suffix}'
        suffix += 1
    return candidate


@transaction.atomic
def create_campus_location(*, validated_data: dict) -> CampusLocation:
    """Create a configurable campus/found location with unique QR slug."""
    building_name = (validated_data.get('building_name') or '').strip()
    floor_room = (validated_data.get('floor_room') or '').strip()
    if not building_name:
        raise ValidationError({'building_name': 'Building name is required.'})

    raw_slug = (validated_data.get('qr_slug') or '').strip()
    if raw_slug:
        qr_slug = slugify(raw_slug)[:80]
        if not qr_slug:
            raise ValidationError({'qr_slug': 'QR slug must contain letters or numbers.'})
        if CampusLocation.objects.filter(qr_slug__iexact=qr_slug).exists():
            raise ValidationError({'qr_slug': f'A location with QR slug "{qr_slug}" already exists.'})
    else:
        qr_slug = _build_unique_location_slug(building_name, floor_room)

    validated_data['building_name'] = building_name
    validated_data['floor_room'] = floor_room
    validated_data['qr_slug'] = qr_slug
    return CampusLocation.objects.create(**validated_data)


@transaction.atomic
def update_campus_location(*, location_id, validated_data: dict) -> CampusLocation:
    """Update an existing CampusLocation while enforcing unique QR slug."""
    location = CampusLocation.objects.select_for_update().get(pk=location_id)
    if 'building_name' in validated_data:
        bldg = (validated_data['building_name'] or '').strip()
        if not bldg:
            raise ValidationError({'building_name': 'Building name cannot be blank.'})
        validated_data['building_name'] = bldg

    if 'floor_room' in validated_data:
        validated_data['floor_room'] = (validated_data['floor_room'] or '').strip()

    if 'qr_slug' in validated_data:
        raw_slug = (validated_data['qr_slug'] or '').strip()
        if raw_slug:
            qr_slug = slugify(raw_slug)[:80]
            if not qr_slug:
                raise ValidationError({'qr_slug': 'QR slug must contain letters or numbers.'})
            if CampusLocation.objects.filter(qr_slug__iexact=qr_slug).exclude(pk=location.pk).exists():
                raise ValidationError({'qr_slug': f'A location with QR slug "{qr_slug}" already exists.'})
            validated_data['qr_slug'] = qr_slug
        else:
            validated_data.pop('qr_slug', None)

    for field, value in validated_data.items():
        setattr(location, field, value)
    location.save()
    return location


@transaction.atomic
def delete_campus_location(*, location_id) -> None:
    """
    Delete a CampusLocation only if no FoundItem or LostItemReport references it.
    Preserves historical custody logs and Campus Loss Hotspot analytics.
    """
    location = CampusLocation.objects.select_for_update().get(pk=location_id)
    if location.found_items.exists() or location.lost_reports.exists():
        raise ValidationError(
            {
                'detail': (
                    f'Cannot delete "{location.label}" because it is linked to existing found items '
                    'or lost reports. Edit the location and set it to Inactive instead.'
                )
            }
        )
    location.delete()


def get_student_activity_records(*, student: User) -> dict:
    """
    Return a student's complete Lost & Found custody history (claimed items,
    surrendered/returned items, and lost item reports) using efficient select_related
    joins without exposing confidential OSAS secret_identifiers.
    """
    student_profile = getattr(student, 'student_profile', None)
    student_number = (getattr(student_profile, 'student_number', '') or '').strip()

    claim_filter = Q(claimant_student=student)
    if student_number:
        claim_filter |= Q(claimant_student_number__iexact=student_number)

    claims_qs = (
        ClaimTransaction.objects.select_related(
            'found_item__category',
            'found_item__found_location',
            'verifying_admin__staff_profile',
        )
        .filter(claim_filter)
        .order_by('-claim_date')
    )

    claimed_items = []
    for tx in claims_qs:
        fi = tx.found_item
        loc_label = fi.found_location.label if fi.found_location else (fi.found_location_custom or 'Campus')
        admin_staff = getattr(tx.verifying_admin, 'staff_profile', None)
        verified_by = (
            f'{admin_staff.first_name} {admin_staff.last_name}'.strip()
            if admin_staff
            else tx.verifying_admin.email
        )
        claimed_items.append({
            'id': str(tx.id),
            'found_item_id': str(fi.id),
            'tracking_code': fi.tracking_code,
            'title': fi.title,
            'category_name': fi.category.name if fi.category else '',
            'location_label': loc_label,
            'claim_date': tx.claim_date.isoformat(),
            'is_voided': tx.is_voided,
            'void_reason': tx.void_reason,
            'voided_at': tx.voided_at.isoformat() if tx.voided_at else None,
            'verified_by_name': verified_by,
        })

    returned_qs = (
        FoundItem.objects.select_related('category', 'found_location')
        .filter(finder_user=student)
        .order_by('-date_found', '-created_at')
    )

    returned_items = []
    for fi in returned_qs:
        loc_label = fi.found_location.label if fi.found_location else (fi.found_location_custom or 'Campus')
        returned_items.append({
            'id': str(fi.id),
            'tracking_code': fi.tracking_code,
            'title': fi.title,
            'category_name': fi.category.name if fi.category else '',
            'location_label': loc_label,
            'date_found': str(fi.date_found),
            'custody_status': fi.custody_status,
            'custody_status_label': fi.get_custody_status_display(),
            'finder_department': fi.finder_department,
            'created_at': fi.created_at.isoformat(),
        })

    lost_qs = (
        LostItemReport.objects.select_related('category', 'suspected_location')
        .filter(student=student)
        .order_by('-created_at')
    )

    lost_reports = []
    for rep in lost_qs:
        loc_label = (
            rep.suspected_location.label
            if rep.suspected_location
            else (rep.suspected_location_custom or 'Unspecified')
        )
        lost_reports.append({
            'id': str(rep.id),
            'item_name': rep.item_name,
            'category_name': rep.category.name if rep.category else '',
            'location_label': loc_label,
            'date_lost': str(rep.date_lost),
            'status': rep.status,
            'created_at': rep.created_at.isoformat(),
        })

    return {
        'counts': {
            'claimed_active': sum(1 for c in claimed_items if not c['is_voided']),
            'claimed_voided': sum(1 for c in claimed_items if c['is_voided']),
            'returned': len(returned_items),
            'lost_reports': len(lost_reports),
        },
        'claimed_items': claimed_items,
        'returned_items': returned_items,
        'lost_reports': lost_reports,
    }
