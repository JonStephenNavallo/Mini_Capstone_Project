"""Stateless authentication service layer."""
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError

from apps.users.models import StudentProfile, User


def authenticate_user_session(request, email: str = '', password: str = '', identifier: str = '') -> User:
    """Validate email or student-number credentials and bind a Django session."""
    raw_identifier = (identifier or email or '').strip()
    if not raw_identifier or not password:
        raise ValidationError({'detail': 'Email or student number and password are required.'})

    if '@' in raw_identifier:
        resolved_email = raw_identifier.lower()
    else:
        profile = (
            StudentProfile.objects.select_related('user')
            .filter(student_number__iexact=raw_identifier)
            .first()
        )
        if profile is None:
            raise AuthenticationFailed('Invalid email, student number, or password.')
        resolved_email = profile.user.email

    user = authenticate(request, username=resolved_email, password=password)
    if user is None:
        raise AuthenticationFailed('Invalid email, student number, or password.')
    if not user.is_active:
        raise PermissionDenied('This account has been deactivated.')

    login(request, user)
    return User.objects.select_related('student_profile', 'staff_profile').get(pk=user.pk)


@transaction.atomic
def register_student_account(request, validated_data: dict) -> User:
    """Self-register a student account and sign into the session."""
    email = validated_data['email'].strip().lower()
    student_number = validated_data['student_number'].strip().upper()

    if User.objects.filter(email=email).exists():
        raise ValidationError({'email': 'An account with this email already exists.'})
    if StudentProfile.objects.filter(student_number=student_number).exists():
        raise ValidationError({'student_number': 'This student number is already registered.'})

    # Enforce Django's configured AUTH_PASSWORD_VALIDATORS on student self-registration
    candidate_user = User(email=email, role=User.RoleType.STUDENT)
    try:
        validate_password(validated_data['password'], user=candidate_user)
    except DjangoValidationError as exc:
        raise ValidationError({'password': list(exc.messages)}) from exc

    user = User.objects.create_user(
        email=email,
        password=validated_data['password'],
        role=User.RoleType.STUDENT,
        is_active=True,
    )
    StudentProfile.objects.create(
        user=user,
        student_number=student_number,
        first_name=validated_data['first_name'].strip(),
        last_name=validated_data['last_name'].strip(),
        program_year=(validated_data.get('department') or validated_data.get('program_year') or '').strip(),
        contact_number=(validated_data.get('contact_number') or '').strip(),
    )
    login(request, user)
    return User.objects.select_related('student_profile', 'staff_profile').get(pk=user.pk)


def logout_user_session(request) -> None:
    logout(request)


@transaction.atomic
def change_user_password(request, *, current_password: str, new_password: str) -> User:
    """
    Validate current credentials and update the authenticated user's password,
    clearing needs_password_change and preserving the active session.
    """
    user = User.objects.select_for_update().get(pk=request.user.pk)
    if not user.check_password(current_password):
        raise ValidationError({'current_password': 'Current password is incorrect.'})
    if current_password == new_password:
        raise ValidationError({'new_password': 'New password must be different from your current password.'})

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        raise ValidationError({'new_password': list(exc.messages)}) from exc

    user.set_password(new_password)
    user.needs_password_change = False
    user.save(update_fields=['password', 'needs_password_change'])
    update_session_auth_hash(request, user)
    return User.objects.select_related('student_profile', 'staff_profile').get(pk=user.pk)
