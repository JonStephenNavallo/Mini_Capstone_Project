"""Stateless domain service layer for OSAS Admin student account recovery & status management."""
import secrets
from django.db import transaction
from rest_framework.exceptions import NotFound

from apps.lost_and_found.image_utils import compress_uploaded_image
from .models import User

# Unambiguous character sets so walk-in students can easily read & type the temporary password
_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
_LOWER = 'abcdefghijkmnopqrstuvwxyz'
_DIGITS = '23456789'
_SYMBOLS = '!@#$%&*'
_ALL = _UPPER + _LOWER + _DIGITS + _SYMBOLS


def _generate_temporary_password(length: int = 12) -> str:
    """Generate a cryptographically random temporary password satisfying complexity rules."""
    required = [
        secrets.choice(_UPPER),
        secrets.choice(_LOWER),
        secrets.choice(_DIGITS),
        secrets.choice(_SYMBOLS),
    ]
    remaining = [secrets.choice(_ALL) for _ in range(max(4, length - len(required)))]
    chars = required + remaining
    secrets.SystemRandom().shuffle(chars)
    return ''.join(chars)


@transaction.atomic
def reset_student_password(*, student_id: int) -> tuple[User, str]:
    """
    Generate a one-time temporary password for a STUDENT account and require
    a password change on their next sign-in. Strictly scoped to STUDENT role.
    """
    student = (
        User.objects.select_for_update(of=('self',))
        .select_related('student_profile')
        .filter(pk=student_id, role=User.RoleType.STUDENT)
        .first()
    )
    if student is None:
        raise NotFound('Student account not found.')

    temporary_password = _generate_temporary_password(12)
    student.set_password(temporary_password)
    student.needs_password_change = True
    student.save(update_fields=['password', 'needs_password_change'])
    return student, temporary_password


@transaction.atomic
def set_student_active_status(*, student_id: int, is_active: bool) -> User:
    """Activate or deactivate a STUDENT account. Strictly scoped to STUDENT role."""
    student = (
        User.objects.select_for_update(of=('self',))
        .select_related('student_profile')
        .filter(pk=student_id, role=User.RoleType.STUDENT)
        .first()
    )
    if student is None:
        raise NotFound('Student account not found.')

    student.is_active = bool(is_active)
    student.save(update_fields=['is_active'])
    return student


@transaction.atomic
def update_own_account_profile(*, user: User, validated_data: dict) -> User:
    """
    Update the authenticated user's self-service contact details and/or profile photo.
    Institutional identity fields (email, role, student_number) are never mutable here.
    """
    locked_user = (
        User.objects.select_for_update(of=('self',))
        .select_related('student_profile', 'staff_profile')
        .get(pk=user.pk)
    )

    remove_photo = bool(validated_data.get('remove_profile_photo', False))
    new_photo = validated_data.get('profile_photo')

    if remove_photo:
        if locked_user.profile_photo:
            locked_user.profile_photo.delete(save=False)
        locked_user.profile_photo = None
        locked_user.save(update_fields=['profile_photo'])
    elif new_photo is not None:
        compressed = compress_uploaded_image(new_photo, field_name='profile_photo')
        if locked_user.profile_photo:
            locked_user.profile_photo.delete(save=False)
        locked_user.profile_photo = compressed
        locked_user.save(update_fields=['profile_photo'])

    if hasattr(locked_user, 'student_profile'):
        profile = locked_user.student_profile
        update_fields = []
        if 'contact_number' in validated_data:
            profile.contact_number = (validated_data['contact_number'] or '').strip()
            update_fields.append('contact_number')
        if 'program_year' in validated_data:
            profile.program_year = (validated_data['program_year'] or '').strip()
            update_fields.append('program_year')
        if update_fields:
            profile.save(update_fields=update_fields)
    elif hasattr(locked_user, 'staff_profile'):
        profile = locked_user.staff_profile
        if 'contact_number' in validated_data:
            profile.contact_number = (validated_data['contact_number'] or '').strip()
            profile.save(update_fields=['contact_number'])

    return (
        User.objects.select_related('student_profile', 'staff_profile')
        .get(pk=locked_user.pk)
    )
