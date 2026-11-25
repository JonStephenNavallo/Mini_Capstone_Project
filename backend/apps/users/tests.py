from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import StaffProfile, StudentProfile, User


class AdminStudentRecoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            email='osas_admin@campus.edu',
            password='AdminPassword123!',
            role=User.RoleType.ADMIN,
            is_staff=True,
        )
        StaffProfile.objects.create(
            user=self.admin, employee_id='EMP-001', first_name='OSAS', last_name='Admin'
        )

        self.other_admin = User.objects.create_user(
            email='osas_admin2@campus.edu',
            password='AdminPassword456!',
            role=User.RoleType.ADMIN,
            is_staff=True,
        )
        StaffProfile.objects.create(
            user=self.other_admin, employee_id='EMP-002', first_name='Second', last_name='Admin'
        )

        self.student = User.objects.create_user(
            email='student1@campus.edu',
            password='InitialPassword123!',
            role=User.RoleType.STUDENT,
        )
        StudentProfile.objects.create(
            user=self.student,
            student_number='026A-15001',
            first_name='Clara',
            last_name='Santos',
            program_year='BSCS 2A',
        )

    def test_anonymous_and_student_denied_admin_user_endpoints(self):
        self.assertIn(self.client.get('/api/users/admin/students/').status_code, (401, 403))
        self.assertIn(
            self.client.post(f'/api/users/admin/students/{self.student.id}/reset-password/').status_code,
            (401, 403),
        )

        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get('/api/users/admin/students/').status_code, 403)
        self.assertEqual(
            self.client.post(f'/api/users/admin/students/{self.student.id}/reset-password/').status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                f'/api/users/admin/students/{self.student.id}/toggle-status/',
                {'is_active': False},
                format='json',
            ).status_code,
            403,
        )
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)
        self.assertFalse(self.student.needs_password_change)

    def test_admin_cannot_reset_or_deactivate_other_admin(self):
        self.client.force_authenticate(user=self.admin)
        reset_res = self.client.post(
            f'/api/users/admin/students/{self.other_admin.id}/reset-password/'
        )
        self.assertEqual(reset_res.status_code, 404)

        toggle_res = self.client.post(
            f'/api/users/admin/students/{self.other_admin.id}/toggle-status/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(toggle_res.status_code, 404)
        self.other_admin.refresh_from_db()
        self.assertTrue(self.other_admin.is_active)

    def test_admin_student_password_reset_and_forced_password_change_flow(self):
        self.client.force_authenticate(user=self.admin)

        # 1. Admin lists and searches student accounts
        list_res = self.client.get('/api/users/admin/students/', {'search': '026A-15001'})
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.data['count'], 1)
        self.assertEqual(list_res.data['results'][0]['email'], 'student1@campus.edu')

        # 2. Admin triggers one-time temporary password reset
        reset_res = self.client.post(
            f'/api/users/admin/students/{self.student.id}/reset-password/'
        )
        self.assertEqual(reset_res.status_code, 200)
        temp_password = reset_res.data['temporary_password']
        self.assertGreaterEqual(len(temp_password), 12)
        self.assertTrue(reset_res.data['student']['needs_password_change'])

        # 3. Student logs in with temporary password -> sees needs_password_change=True
        student_client = APIClient()
        login_res = student_client.post(
            '/api/auth/login/',
            {'email': 'student1@campus.edu', 'password': temp_password},
            format='json',
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.data['needs_password_change'])

        # 4. Student sets a new personal password -> clears needs_password_change
        change_res = student_client.post(
            '/api/auth/change-password/',
            {
                'current_password': temp_password,
                'new_password': 'MyStrongNewPassword!2026',
                'confirm_password': 'MyStrongNewPassword!2026',
            },
            format='json',
        )
        self.assertEqual(change_res.status_code, 200)
        self.assertFalse(change_res.data['needs_password_change'])

        # 5. Session remains valid and new password works
        me_res = student_client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertFalse(me_res.data['needs_password_change'])

    def test_admin_toggle_student_active_status(self):
        self.client.force_authenticate(user=self.admin)

        deactivate = self.client.post(
            f'/api/users/admin/students/{self.student.id}/toggle-status/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(deactivate.status_code, 200)
        self.assertFalse(deactivate.data['is_active'])

        # Deactivated student cannot log in
        student_client = APIClient()
        blocked = student_client.post(
            '/api/auth/login/',
            {'email': 'student1@campus.edu', 'password': 'InitialPassword123!'},
            format='json',
        )
        self.assertIn(blocked.status_code, (401, 403))

        # Reactivating restores access
        reactivate = self.client.post(
            f'/api/users/admin/students/{self.student.id}/toggle-status/',
            {'is_active': True},
            format='json',
        )
        self.assertEqual(reactivate.status_code, 200)
        self.assertTrue(reactivate.data['is_active'])

    def test_student_can_update_contact_and_profile_photo_without_mutating_protected_fields(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        # Anonymous cannot PATCH /api/users/me/
        anon = self.client.patch('/api/users/me/', {'contact_number': '09170000000'}, format='json')
        self.assertIn(anon.status_code, (401, 403))

        # Authenticated student uploads avatar + updates contact_number, attempting to tamper with role/student_number
        buf = io.BytesIO()
        Image.new('RGB', (600, 600), (20, 90, 140)).save(buf, format='PNG')
        avatar = SimpleUploadedFile('avatar.png', buf.getvalue(), content_type='image/png')

        self.client.force_authenticate(user=self.student)
        res = self.client.patch(
            '/api/users/me/',
            {
                'contact_number': '09171234567',
                'program_year': 'BSCS 3A',
                'profile_photo': avatar,
                'role': 'ADMIN',
                'student_number': '999Z-99999',
                'email': 'hacked@campus.edu',
            },
            format='multipart',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['student_profile']['contact_number'], '09171234567')
        self.assertEqual(res.data['student_profile']['program_year'], 'BSCS 3A')
        self.assertTrue(res.data['profile_photo'].endswith('.webp'))

        # Protected institutional identity fields remain unchanged
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, User.RoleType.STUDENT)
        self.assertEqual(self.student.email, 'student1@campus.edu')
        self.assertEqual(self.student.student_profile.student_number, '026A-15001')

        # Student can remove their profile photo
        remove_res = self.client.patch(
            '/api/users/me/',
            {'remove_profile_photo': True},
            format='json',
        )
        self.assertEqual(remove_res.status_code, 200)
        self.assertIsNone(remove_res.data['profile_photo'])
