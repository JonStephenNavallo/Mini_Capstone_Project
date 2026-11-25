from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import StudentProfile, User


class AuthenticationFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email='authstudent@campus.edu',
            password='StrongPassword123!',
            role=User.RoleType.STUDENT,
        )
        StudentProfile.objects.create(
            user=self.student,
            student_number='026A-18888',
            first_name='Mara',
            last_name='Santos',
        )

    def test_login_me_and_logout(self):
        res = self.client.post(
            '/api/auth/login/',
            {'email': 'authstudent@campus.edu', 'password': 'StrongPassword123!'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['role'], 'STUDENT')

        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['email'], 'authstudent@campus.edu')

        logout_res = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_res.status_code, 200)

        me_after = self.client.get('/api/auth/me/')
        self.assertIn(me_after.status_code, (401, 403))

    def test_dev_login_endpoint_removed(self):
        res = self.client.post('/api/auth/dev-login/', {'role': 'ADMIN'}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_student_registration_rejects_weak_passwords(self):
        weak = self.client.post(
            '/api/auth/register/',
            {
                'email': 'weakpass@campus.edu',
                'password': '12345678',
                'confirm_password': '12345678',
                'student_number': '026A-11749',
                'first_name': 'Weak',
                'last_name': 'Pass',
                'department': 'BSIT',
            },
            format='json',
        )
        self.assertEqual(weak.status_code, 400)
        self.assertIn('password', weak.data)

    def test_student_registration_enforces_student_number_format(self):
        invalid = self.client.post(
            '/api/auth/register/',
            {
                'email': 'badformat@campus.edu',
                'password': 'StrongPassword123!',
                'student_number': '2026-0001',
                'first_name': 'Bad',
                'last_name': 'Format',
            },
            format='json',
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertIn('student_number', invalid.data)

        valid = self.client.post(
            '/api/auth/register/',
            {
                'email': 'goodformat@campus.edu',
                'password': 'StrongPassword123!',
                'confirm_password': 'StrongPassword123!',
                'student_number': '026a-11745',
                'first_name': 'Good',
                'last_name': 'Format',
                'department': 'BSIT',
            },
            format='json',
        )
        self.assertEqual(valid.status_code, 201)
        self.assertEqual(valid.data['student_profile']['student_number'], '026A-11745')
        self.assertEqual(valid.data['student_profile']['program_year'], 'BSIT')

    def test_student_registration_rejects_mismatched_password_confirmation(self):
        res = self.client.post(
            '/api/auth/register/',
            {
                'email': 'mismatch@campus.edu',
                'password': 'StrongPassword123!',
                'confirm_password': 'DifferentPassword123!',
                'student_number': '026A-11746',
                'first_name': 'Jane',
                'last_name': 'Doe',
                'department': 'BSA',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('confirm_password', res.data)

    def test_login_with_student_number_succeeds(self):
        res = self.client.post(
            '/api/auth/login/',
            {'identifier': '026a-18888', 'password': 'StrongPassword123!'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'authstudent@campus.edu')

        bad = self.client.post(
            '/api/auth/login/',
            {'identifier': '026A-99999', 'password': 'StrongPassword123!'},
            format='json',
        )
        self.assertIn(bad.status_code, (401, 403))
