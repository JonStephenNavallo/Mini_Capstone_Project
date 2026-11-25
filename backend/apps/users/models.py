from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models

STUDENT_NUMBER_REGEX = r'^\d{3}[A-Z]-\d{5}$'
STUDENT_NUMBER_VALIDATOR = RegexValidator(
    regex=STUDENT_NUMBER_REGEX,
    message='Student number must follow the format 026A-11745 (3 digits, 1 uppercase letter, hyphen, 5 digits).',
)


class CustomUserManager(BaseUserManager):
    """Email-based user manager without username."""

    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', self.model.RoleType.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model with email login and streamlined ADMIN / STUDENT roles."""

    class RoleType(models.TextChoices):
        ADMIN = 'ADMIN', 'OSAS Admin'
        STUDENT = 'STUDENT', 'Student'

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=RoleType.choices,
        default=RoleType.STUDENT,
    )
    is_active = models.BooleanField(default=True)
    needs_password_change = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='users/avatars/', null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    @property
    def display_name(self):
        if hasattr(self, 'student_profile'):
            return f'{self.student_profile.first_name} {self.student_profile.last_name}'.strip()
        if hasattr(self, 'staff_profile'):
            return f'{self.staff_profile.first_name} {self.staff_profile.last_name}'.strip()
        return self.email

    def __str__(self):
        return f'{self.email} ({self.get_role_display()})'


class StudentProfile(models.Model):
    """Extended profile data for campus students."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='student_profile',
    )
    student_number = models.CharField(
        max_length=30,
        unique=True,
        validators=[STUDENT_NUMBER_VALIDATOR],
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    program_year = models.CharField(max_length=100, blank=True, default='')
    contact_number = models.CharField(max_length=25, blank=True, default='')

    class Meta:
        db_table = 'student_profiles'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name}, {self.first_name} ({self.student_number})'


class StaffProfile(models.Model):
    """Extended profile details for OSAS Administrators and Custodians."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='staff_profile',
    )
    employee_id = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    office = models.CharField(max_length=100, default='OSAS')
    contact_number = models.CharField(max_length=25, blank=True, default='')

    class Meta:
        db_table = 'staff_profiles'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name}, {self.first_name} ({self.employee_id})'
