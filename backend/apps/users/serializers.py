import re
from rest_framework import serializers
from .models import STUDENT_NUMBER_REGEX, StaffProfile, StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ['student_number', 'first_name', 'last_name', 'program_year', 'contact_number']


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ['employee_id', 'first_name', 'last_name', 'office', 'contact_number']


class UserMeSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    staff_profile = StaffProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role',
            'is_active',
            'needs_password_change',
            'display_name',
            'profile_photo',
            'student_profile',
            'staff_profile',
        ]


class UserAccountSettingsUpdateSerializer(serializers.Serializer):
    """Self-service profile update serializer; intentionally excludes role, email, and student_number."""

    contact_number = serializers.CharField(max_length=25, required=False, allow_blank=True)
    program_year = serializers.CharField(max_length=100, required=False, allow_blank=True)
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    remove_profile_photo = serializers.BooleanField(required=False, default=False)


class AdminStudentAccountSerializer(serializers.ModelSerializer):
    """OSAS Admin directory serializer for student accounts and recovery state."""

    display_name = serializers.CharField(read_only=True)
    student_number = serializers.CharField(source='student_profile.student_number', read_only=True)
    first_name = serializers.CharField(source='student_profile.first_name', read_only=True)
    last_name = serializers.CharField(source='student_profile.last_name', read_only=True)
    program_year = serializers.CharField(source='student_profile.program_year', read_only=True)
    contact_number = serializers.CharField(source='student_profile.contact_number', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'is_active',
            'needs_password_change',
            'date_joined',
            'last_login',
            'display_name',
            'profile_photo',
            'student_number',
            'first_name',
            'last_name',
            'program_year',
            'contact_number',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'New passwords do not match.'})
        return attrs


class StudentLookupSerializer(serializers.ModelSerializer):
    student_number = serializers.CharField(source='student_profile.student_number', read_only=True)
    first_name = serializers.CharField(source='student_profile.first_name', read_only=True)
    last_name = serializers.CharField(source='student_profile.last_name', read_only=True)
    program_year = serializers.CharField(source='student_profile.program_year', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'student_number', 'first_name', 'last_name', 'program_year']


DEPARTMENT_CHOICES = (
    ('BSIT', 'BSIT'),
    ('BSSW', 'BSSW'),
    ('BSPA', 'BSPA'),
    ('DHRS', 'DHRS'),
    ('BSAIS', 'BSAIS'),
    ('BSA', 'BSA'),
    ('BSE', 'BSE'),
    ('BTVTED', 'BTVTED'),
    ('ABELS', 'ABELS'),
)


class StudentRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True, required=False)
    student_number = serializers.CharField(max_length=30)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    department = serializers.ChoiceField(choices=DEPARTMENT_CHOICES, required=False, allow_blank=True, default='')
    program_year = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    contact_number = serializers.CharField(max_length=25, required=False, allow_blank=True, default='')

    def validate_student_number(self, value):
        normalized = (value or '').strip().upper()
        if not re.match(STUDENT_NUMBER_REGEX, normalized):
            raise serializers.ValidationError(
                'Student number must follow the format 026A-11745 (3 digits, 1 letter, hyphen, 5 digits).'
            )
        return normalized

    def validate(self, attrs):
        confirm = attrs.get('confirm_password')
        if confirm is not None and attrs['password'] != confirm:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs
