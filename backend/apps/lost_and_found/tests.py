from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.lost_and_found.models import (
    CampusLocation,
    ClaimTransaction,
    DepartmentHonestyProfile,
    FoundItem,
    ItemCategory,
    ItemMatchCandidate,
    PortalConfiguration,
)
from apps.notifications.models import Notification
from apps.users.models import StaffProfile, StudentProfile, User


class LostAndFoundDomainSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.config = PortalConfiguration.objects.create(pk=1, allow_guest_found_reports=True)

        self.admin = User.objects.create_user(
            email='osas_admin@campus.edu',
            password='AdminPassword123!',
            role=User.RoleType.ADMIN,
            is_staff=True,
        )
        StaffProfile.objects.create(
            user=self.admin, employee_id='EMP-100', first_name='OSAS', last_name='Staff'
        )

        self.student_owner = User.objects.create_user(
            email='owner@campus.edu',
            password='StudentPassword123!',
            role=User.RoleType.STUDENT,
        )
        StudentProfile.objects.create(
            user=self.student_owner,
            student_number='026A-11111',
            first_name='Juan',
            last_name='Dela Cruz',
        )

        self.student_finder = User.objects.create_user(
            email='finder_user@campus.edu',
            password='StudentPassword123!',
            role=User.RoleType.STUDENT,
        )
        StudentProfile.objects.create(
            user=self.student_finder,
            student_number='026A-12222',
            first_name='Maria',
            last_name='Clara',
        )

        self.cat_electronics = ItemCategory.objects.create(
            name='Electronics', icon_key='devices', retention_days=90
        )
        self.loc_library = CampusLocation.objects.create(
            building_name='Main Library', floor_room='2F', qr_slug='lib-2f', is_drop_off_point=True
        )

        self.custody_item = FoundItem.objects.create(
            tracking_code='OSAS-2026-TEST1',
            category=self.cat_electronics,
            title='Silver Scientific Calculator',
            general_description='Casio scientific calculator found near desk 4.',
            secret_identifiers='Initials JDC scratched on battery cover',
            found_location=self.loc_library,
            date_found=timezone.localdate(),
            finder_type=FoundItem.FinderType.STAFF,
            custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
            storage_shelf_bin='Shelf A1',
            created_by=self.admin,
        )

    def test_public_endpoints_never_expose_secret_identifiers(self):
        res_list = self.client.get('/api/lost-found/items/')
        self.assertEqual(res_list.status_code, 200)
        results = res_list.data['results']
        self.assertEqual(len(results), 1)
        self.assertNotIn('secret_identifiers', results[0])
        self.assertNotIn('secret_photo', results[0])
        self.assertNotIn('finder_contact', results[0])

        res_detail = self.client.get(f'/api/lost-found/items/{self.custody_item.id}/')
        self.assertEqual(res_detail.status_code, 200)
        self.assertNotIn('secret_identifiers', res_detail.data)

    def test_anonymous_found_report_denied_and_student_report_starts_pending(self):
        payload = {
            'category': str(self.cat_electronics.id),
            'title': 'USB-C Flash Drive',
            'general_description': '64GB silver drive on desk.',
            'found_location': str(self.loc_library.id),
        }
        # Anonymous guests cannot submit online found reports (must walk in to OSAS)
        blocked = self.client.post('/api/lost-found/report-found/', payload, format='json')
        self.assertIn(blocked.status_code, (401, 403))

        # Authenticated student report succeeds and starts in PENDING_SURRENDER
        self.client.force_authenticate(user=self.student_finder)
        res = self.client.post('/api/lost-found/report-found/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['custody_status'], FoundItem.CustodyStatus.PENDING_SURRENDER)

    def test_student_denied_admin_endpoints_and_cannot_claim_online(self):
        self.client.force_authenticate(user=self.student_owner)

        self.assertEqual(self.client.get('/api/lost-found/admin/items/').status_code, 403)
        self.assertEqual(self.client.get('/api/lost-found/admin/analytics/').status_code, 403)
        self.assertEqual(
            self.client.post(
                f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
                {'claimant_name': 'Juan', 'claimant_student_number': '026A-11111'},
                format='json',
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.patch('/api/lost-found/config/', {'allow_guest_found_reports': False}, format='json').status_code,
            403,
        )

        # Student CAN generate a walk-in QR claim pass, which leaves item IN_CUSTODY
        ticket_res = self.client.post(
            '/api/lost-found/claim-tickets/',
            {'found_item': str(self.custody_item.id)},
            format='json',
        )
        self.assertEqual(ticket_res.status_code, 201)
        self.custody_item.refresh_from_db()
        self.assertEqual(self.custody_item.custody_status, FoundItem.CustodyStatus.IN_CUSTODY)

    def test_admin_walkin_claim_and_double_claim_prevention(self):
        self.client.force_authenticate(user=self.admin)

        claim_payload = {
            'claimant_student': self.student_owner.id,
            'claimant_name': 'Juan Dela Cruz',
            'claimant_student_number': '026A-11111',
            'claimant_id_type': 'Validated School ID',
            'verification_notes': 'Matched JDC initials on battery cover.',
        }
        res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            claim_payload,
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.custody_item.refresh_from_db()
        self.assertEqual(self.custody_item.custody_status, FoundItem.CustodyStatus.CLAIMED)
        self.assertEqual(ClaimTransaction.objects.filter(found_item=self.custody_item).count(), 1)

        # Double claim blocked
        second = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            claim_payload,
            format='json',
        )
        self.assertEqual(second.status_code, 400)

    def test_intake_approval_awards_honesty_points_and_triggers_auto_match(self):
        # 1. Student owner reports lost calculator
        self.client.force_authenticate(user=self.student_owner)
        lost_res = self.client.post(
            '/api/lost-found/lost-reports/',
            {
                'category': str(self.cat_electronics.id),
                'item_name': 'Casio Scientific Calculator Black',
                'detailed_description': 'Lost my Casio scientific calculator on 2F library',
                'suspected_location': str(self.loc_library.id),
                'date_lost': str(timezone.localdate() - timedelta(days=1)),
            },
            format='json',
        )
        self.assertEqual(lost_res.status_code, 201)

        # 2. Student finder submits a found calculator with their department
        self.client.force_authenticate(user=self.student_finder)
        found_res = self.client.post(
            '/api/lost-found/report-found/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Casio Scientific Calculator Black',
                'general_description': 'Found a black Casio scientific calculator on library table',
                'found_location': str(self.loc_library.id),
                'date_found': str(timezone.localdate()),
                'finder_department': 'BSIT',
            },
            format='json',
        )
        self.assertEqual(found_res.status_code, 201)
        new_item_id = found_res.data['id']

        # 3. Admin approves intake -> awards department honesty points & matches lost report
        self.client.force_authenticate(user=self.admin)
        approve_res = self.client.post(
            f'/api/lost-found/admin/items/{new_item_id}/approve-intake/',
            {'storage_shelf_bin': 'Shelf B3', 'secret_identifiers': 'Name sticker underneath'},
            format='json',
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.data['custody_status'], FoundItem.CustodyStatus.IN_CUSTODY)

        dept_profile = DepartmentHonestyProfile.objects.get(department='BSIT')
        self.assertEqual(dept_profile.total_items_surrendered, 1)
        self.assertEqual(dept_profile.total_points, 25)

        # Public leaderboard returns department-level rankings only (no student names)
        lb_res = self.client.get('/api/lost-found/leaderboard/')
        self.assertEqual(lb_res.status_code, 200)
        self.assertEqual(len(lb_res.data), 9)
        self.assertEqual(lb_res.data[0]['department'], 'BSIT')
        self.assertEqual(lb_res.data[0]['total_points'], 25)
        self.assertNotIn('student_name', lb_res.data[0])

        self.assertTrue(
            ItemMatchCandidate.objects.filter(
                found_item_id=new_item_id,
                lost_report__student=self.student_owner,
                match_score__gte=65,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student_owner,
                category=Notification.Category.MATCH_ALERT,
            ).exists()
        )

    def test_item_category_admin_crud_and_protected_delete(self):
        # Anonymous & student actors cannot create, update, or delete categories
        anon_create = self.client.post(
            '/api/lost-found/categories/',
            {'name': 'Keys', 'retention_days': 60},
            format='json',
        )
        self.assertIn(anon_create.status_code, (401, 403))

        self.client.force_authenticate(user=self.student_owner)
        student_create = self.client.post(
            '/api/lost-found/categories/',
            {'name': 'Keys', 'retention_days': 60},
            format='json',
        )
        self.assertEqual(student_create.status_code, 403)
        self.assertEqual(
            self.client.patch(
                f'/api/lost-found/categories/{self.cat_electronics.id}/',
                {'name': 'Hacked'},
                format='json',
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(
                f'/api/lost-found/categories/{self.cat_electronics.id}/'
            ).status_code,
            403,
        )

        # OSAS Admin can Create, Update, and Delete unused categories
        self.client.force_authenticate(user=self.admin)
        create_res = self.client.post(
            '/api/lost-found/categories/',
            {
                'name': 'Keys & Lanyards',
                'retention_days': 45,
                'requires_secret_verification': False,
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        cat_id = create_res.data['id']

        update_res = self.client.patch(
            f'/api/lost-found/categories/{cat_id}/',
            {
                'name': 'Keys & ID Lanyards',
                'retention_days': 60,
                'requires_secret_verification': True,
                'is_active': False,
            },
            format='json',
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.data['name'], 'Keys & ID Lanyards')
        self.assertEqual(update_res.data['retention_days'], 60)
        self.assertFalse(update_res.data['is_active'])

        # Deleting an unused category succeeds (204)
        del_unused = self.client.delete(f'/api/lost-found/categories/{cat_id}/')
        self.assertEqual(del_unused.status_code, 204)
        self.assertFalse(ItemCategory.objects.filter(pk=cat_id).exists())

        # Deleting a category referenced by a FoundItem returns 400 (not 500) and keeps record intact
        del_in_use = self.client.delete(
            f'/api/lost-found/categories/{self.cat_electronics.id}/'
        )
        self.assertEqual(del_in_use.status_code, 400)
        self.assertTrue(ItemCategory.objects.filter(pk=self.cat_electronics.id).exists())

    def test_campus_location_admin_crud_and_protected_delete(self):
        # Anonymous & student actors cannot create, update, or delete campus locations
        anon_create = self.client.post(
            '/api/lost-found/locations/',
            {'building_name': 'New Annex', 'floor_room': 'Room 101'},
            format='json',
        )
        self.assertIn(anon_create.status_code, (401, 403))

        self.client.force_authenticate(user=self.student_owner)
        self.assertEqual(
            self.client.post(
                '/api/lost-found/locations/',
                {'building_name': 'New Annex', 'floor_room': 'Room 101'},
                format='json',
            ).status_code,
            403,
        )

        # OSAS Admin can create (with auto-generated slug), update, and delete unused locations
        self.client.force_authenticate(user=self.admin)
        create_res = self.client.post(
            '/api/lost-found/locations/',
            {'building_name': 'Engineering Hall', 'floor_room': '3F Room 302', 'is_drop_off_point': True},
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        self.assertEqual(create_res.data['qr_slug'], 'engineering-hall-3f-room-302')
        loc_id = create_res.data['id']

        update_res = self.client.patch(
            f'/api/lost-found/locations/{loc_id}/',
            {'floor_room': '3F Room 305', 'is_active': False},
            format='json',
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.data['floor_room'], '3F Room 305')
        self.assertFalse(update_res.data['is_active'])

        # Unused location can be deleted (204)
        self.assertEqual(self.client.delete(f'/api/lost-found/locations/{loc_id}/').status_code, 204)
        self.assertFalse(CampusLocation.objects.filter(pk=loc_id).exists())

        # Location referenced by FoundItem returns 400 and remains intact
        del_in_use = self.client.delete(f'/api/lost-found/locations/{self.loc_library.id}/')
        self.assertEqual(del_in_use.status_code, 400)
        self.assertTrue(CampusLocation.objects.filter(pk=self.loc_library.id).exists())

    def test_date_range_filtering_on_public_and_admin_item_endpoints(self):
        today = timezone.localdate()
        older_date = today - timedelta(days=10)
        older_item = FoundItem.objects.create(
            tracking_code='OSAS-2026-OLD01',
            category=self.cat_electronics,
            title='Older USB Charger',
            general_description='White USB-C wall charger.',
            found_location=self.loc_library,
            date_found=older_date,
            finder_type=FoundItem.FinderType.STAFF,
            custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
            storage_shelf_bin='Shelf A2',
            created_by=self.admin,
        )

        # Public endpoint: only recent item matches [today - 2d, today]
        pub_recent = self.client.get(
            '/api/lost-found/items/',
            {'date_from': str(today - timedelta(days=2)), 'date_to': str(today)},
        )
        self.assertEqual(pub_recent.status_code, 200)
        pub_ids = {row['id'] for row in pub_recent.data['results']}
        self.assertIn(str(self.custody_item.id), pub_ids)
        self.assertNotIn(str(older_item.id), pub_ids)

        # Admin endpoint: only older item matches [older_date - 1d, older_date + 1d]
        self.client.force_authenticate(user=self.admin)
        admin_older = self.client.get(
            '/api/lost-found/admin/items/',
            {
                'date_from': str(older_date - timedelta(days=1)),
                'date_to': str(older_date + timedelta(days=1)),
            },
        )
        self.assertEqual(admin_older.status_code, 200)
        admin_ids = {row['id'] for row in admin_older.data['results']}
        self.assertEqual(admin_ids, {str(older_item.id)})

    def test_image_compression_and_max_four_photos_enforcement(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        def _make_png(name, width=1800, height=1200, color=(40, 120, 200)):
            buf = io.BytesIO()
            Image.new('RGB', (width, height), color).save(buf, format='PNG')
            return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')

        self.client.force_authenticate(user=self.admin)

        # Uploading 5 photos is rejected with 400
        too_many = self.client.post(
            '/api/lost-found/admin/items/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Too Many Photos Item',
                'general_description': 'Should reject 5 photos.',
                'photos': [_make_png(f'img_{i}.png', 400, 400) for i in range(5)],
            },
            format='multipart',
        )
        self.assertEqual(too_many.status_code, 400)
        self.assertIn('photos', too_many.data)

        # Uploading 4 large PNGs succeeds, compresses to WebP, and resizes <= 1280px
        res = self.client.post(
            '/api/lost-found/admin/items/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Multi-Angle Headphones',
                'general_description': 'Black over-ear wireless headphones.',
                'photos': [_make_png(f'angle_{i}.png', 1800, 1200) for i in range(4)],
            },
            format='multipart',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.data['photos']), 4)
        self.assertTrue(res.data['primary_photo'].endswith('.webp'))

        saved_item = FoundItem.objects.prefetch_related('photos').get(pk=res.data['id'])
        self.assertEqual(saved_item.photos.count(), 4)
        with Image.open(saved_item.primary_photo.path) as compressed_img:
            self.assertEqual(compressed_img.format, 'WEBP')
            self.assertLessEqual(max(compressed_img.size), 1280)

    def test_void_mistaken_claim_preserves_audit_and_allows_reclaim(self):
        # Student cannot void a claim
        self.client.force_authenticate(user=self.student_owner)
        denied = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
            {'void_reason': 'Unauthorized attempt'},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)

        # 1. Admin releases item to wrong student
        self.client.force_authenticate(user=self.admin)
        first_claim = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_student': self.student_finder.id,
                'claimant_name': 'Maria Clara',
                'claimant_student_number': '026A-12222',
                'claimant_id_type': 'Validated Student ID',
                'verification_notes': 'Mistaken handover',
            },
            format='json',
        )
        self.assertEqual(first_claim.status_code, 201)

        # Blank reason rejected with 400
        blank_reason = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
            {'void_reason': '   '},
            format='json',
        )
        self.assertEqual(blank_reason.status_code, 400)

        # 2. Admin voids mistaken claim -> returns item to IN_CUSTODY while keeping audit log
        void_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
            {'void_reason': 'Student returned item after realizing it was not theirs.'},
            format='json',
        )
        self.assertEqual(void_res.status_code, 200)
        self.assertEqual(void_res.data['custody_status'], FoundItem.CustodyStatus.IN_CUSTODY)
        self.assertIsNone(void_res.data['claim_transaction'])
        self.assertEqual(len(void_res.data['claim_history']), 1)
        self.assertTrue(void_res.data['claim_history'][0]['is_voided'])

        # 3. Rightful owner can now claim the item
        second_claim = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_student': self.student_owner.id,
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11111',
                'claimant_id_type': 'Validated Student ID',
                'verification_notes': 'Verified rightful owner.',
            },
            format='json',
        )
        self.assertEqual(second_claim.status_code, 201)
        self.assertEqual(ClaimTransaction.objects.filter(found_item=self.custody_item).count(), 2)
        self.assertEqual(
            ClaimTransaction.objects.filter(found_item=self.custody_item, is_voided=False).count(),
            1,
        )

    def test_admin_item_edit_and_delete_custody_guardrails(self):
        self.client.force_authenticate(user=self.admin)

        # 1. Admin cannot jump directly to CLAIMED via PATCH (must use Claim Counter)
        direct_claim = self.client.patch(
            f'/api/lost-found/admin/items/{self.custody_item.id}/',
            {'custody_status': FoundItem.CustodyStatus.CLAIMED},
            format='json',
        )
        self.assertEqual(direct_claim.status_code, 400)

        # 2. Admin can edit IN_CUSTODY item details and mark as DONATED
        edit_res = self.client.patch(
            f'/api/lost-found/admin/items/{self.custody_item.id}/',
            {
                'title': 'Silver Scientific Calculator (Updated)',
                'storage_shelf_bin': 'Shelf D-09',
                'custody_status': FoundItem.CustodyStatus.DONATED,
            },
            format='json',
        )
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.data['storage_shelf_bin'], 'Shelf D-09')
        self.assertEqual(edit_res.data['custody_status'], FoundItem.CustodyStatus.DONATED)

        # 3. Finalized DONATED item cannot be hard-deleted
        del_donated = self.client.delete(
            f'/api/lost-found/admin/items/{self.custody_item.id}/'
        )
        self.assertEqual(del_donated.status_code, 400)

        # 4. Return to IN_CUSTODY, finalize a claim -> CLAIMED item is locked from editing
        self.custody_item.custody_status = FoundItem.CustodyStatus.IN_CUSTODY
        self.custody_item.save(update_fields=['custody_status'])
        claim_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_student': self.student_owner.id,
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11111',
                'claimant_id_type': 'Validated Student ID',
            },
            format='json',
        )
        self.assertEqual(claim_res.status_code, 201)

        edit_claimed = self.client.patch(
            f'/api/lost-found/admin/items/{self.custody_item.id}/',
            {'title': 'Tampered Title'},
            format='json',
        )
        self.assertEqual(edit_claimed.status_code, 400)

        # 5. PENDING_SURRENDER item with no claim history CAN be deleted
        pending = FoundItem.objects.create(
            tracking_code='OSAS-2026-PEND9',
            category=self.cat_electronics,
            title='Duplicate Notice',
            general_description='Duplicate entry.',
            custody_status=FoundItem.CustodyStatus.PENDING_SURRENDER,
        )
        del_pending = self.client.delete(f'/api/lost-found/admin/items/{pending.id}/')
        self.assertEqual(del_pending.status_code, 204)

    def test_auto_matching_blocks_unrelated_false_positives_in_same_category(self):
        # Student loses a MacBook charger in the same building/day/category as the existing calculator
        self.client.force_authenticate(user=self.student_owner)
        res = self.client.post(
            '/api/lost-found/lost-reports/',
            {
                'category': str(self.cat_electronics.id),
                'item_name': 'Apple MacBook USB-C Charger',
                'detailed_description': 'White 67W power adapter with braided cable.',
                'suspected_location': str(self.loc_library.id),
                'date_lost': str(timezone.localdate()),
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        # Must NOT match the unrelated Silver Scientific Calculator
        self.assertEqual(len(res.data['match_candidates']), 0)

    def test_student_can_close_or_delete_own_lost_report_and_stops_pings(self):
        self.client.force_authenticate(user=self.student_owner)
        create_res = self.client.post(
            '/api/lost-found/lost-reports/',
            {
                'category': str(self.cat_electronics.id),
                'item_name': 'Blue Sony Headphones',
                'detailed_description': 'Over-ear Sony Bluetooth headphones.',
                'suspected_location': str(self.loc_library.id),
                'date_lost': str(timezone.localdate()),
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        report_id = create_res.data['id']

        # Another student cannot close or delete this report (404 from queryset scoping)
        self.client.force_authenticate(user=self.student_finder)
        self.assertEqual(
            self.client.post(f'/api/lost-found/lost-reports/{report_id}/close/').status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(f'/api/lost-found/lost-reports/{report_id}/').status_code,
            404,
        )

        # Owner closes report -> status becomes CLOSED and new matching items do NOT ping them
        self.client.force_authenticate(user=self.student_owner)
        close_res = self.client.post(f'/api/lost-found/lost-reports/{report_id}/close/')
        self.assertEqual(close_res.status_code, 200)
        self.assertEqual(close_res.data['status'], 'CLOSED')

        # Admin logs identical headphones -> closed report gets 0 new matches
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            '/api/lost-found/admin/items/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Blue Sony Headphones',
                'general_description': 'Over-ear Sony Bluetooth headphones.',
                'found_location': str(self.loc_library.id),
                'date_found': str(timezone.localdate()),
            },
            format='json',
        )
        self.assertEqual(
            ItemMatchCandidate.objects.filter(lost_report_id=report_id).count(),
            0,
        )

        # Owner can also permanently delete their report
        self.client.force_authenticate(user=self.student_owner)
        del_res = self.client.delete(f'/api/lost-found/lost-reports/{report_id}/')
        self.assertEqual(del_res.status_code, 204)

    def test_claim_notifies_claimant_other_matched_students_and_student_finder(self):
        # Create a third student who also lost a similar item and gets matched to the same FoundItem
        other_student = User.objects.create_user(
            email='other_loser@campus.edu',
            password='StudentPassword123!',
            role=User.RoleType.STUDENT,
        )
        StudentProfile.objects.create(
            user=other_student,
            student_number='026A-13333',
            first_name='Pedro',
            last_name='Penduko',
        )

        # 1. Both student_owner and other_student file lost reports for a matte navy AquaFlask
        lost_payload = {
            'category': str(self.cat_electronics.id),
            'item_name': 'Matte Navy AquaFlask 32oz',
            'detailed_description': 'Navy blue insulated tumbler with rubber boot.',
            'suspected_location': str(self.loc_library.id),
            'date_lost': str(timezone.localdate()),
        }
        self.client.force_authenticate(user=self.student_owner)
        owner_report_res = self.client.post('/api/lost-found/lost-reports/', lost_payload, format='json')
        self.assertEqual(owner_report_res.status_code, 201)
        owner_report_id = owner_report_res.data['id']

        self.client.force_authenticate(user=other_student)
        other_report_res = self.client.post('/api/lost-found/lost-reports/', lost_payload, format='json')
        self.assertEqual(other_report_res.status_code, 201)
        other_report_id = other_report_res.data['id']

        # 2. student_finder reports the found AquaFlask and admin approves intake
        self.client.force_authenticate(user=self.student_finder)
        found_res = self.client.post(
            '/api/lost-found/report-found/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Matte Navy AquaFlask 32oz',
                'general_description': 'Navy blue insulated tumbler with rubber boot found in library.',
                'found_location': str(self.loc_library.id),
                'date_found': str(timezone.localdate()),
                'finder_department': 'BSIT',
            },
            format='json',
        )
        self.assertEqual(found_res.status_code, 201)
        found_item_id = found_res.data['id']

        self.client.force_authenticate(user=self.admin)
        approve_res = self.client.post(
            f'/api/lost-found/admin/items/{found_item_id}/approve-intake/',
            {'storage_shelf_bin': 'Shelf C1'},
            format='json',
        )
        self.assertEqual(approve_res.status_code, 200)

        # 3. Admin processes walk-in claim using ONLY student_number (auto-resolves claimant_student)
        claim_res = self.client.post(
            f'/api/lost-found/admin/items/{found_item_id}/process-claim/',
            {
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11111',
                'claimant_id_type': 'Validated School ID',
                'verification_notes': 'Verified ownership.',
            },
            format='json',
        )
        self.assertEqual(claim_res.status_code, 201)

        # Verify #1: Claimant received CLAIM confirmation and their lost report became VERIFIED_CLAIMED
        claimant_notif = Notification.objects.filter(
            recipient=self.student_owner,
            category=Notification.Category.CLAIM,
            title='Item Claimed & Released',
        ).first()
        self.assertIsNotNone(claimant_notif)
        from apps.lost_and_found.models import LostItemReport
        self.assertEqual(
            LostItemReport.objects.get(pk=owner_report_id).status,
            LostItemReport.ReportStatus.VERIFIED_CLAIMED,
        )

        # Verify #2: Other matched student received privacy-safe notification (no claimant PII) and reverted to SEARCHING
        other_notif = Notification.objects.filter(
            recipient=other_student,
            category=Notification.Category.CLAIM,
            title='Suggested Match Claimed',
        ).first()
        self.assertIsNotNone(other_notif)
        self.assertNotIn('Juan Dela Cruz', other_notif.message)
        self.assertNotIn('026A-11111', other_notif.message)
        self.assertEqual(
            LostItemReport.objects.get(pk=other_report_id).status,
            LostItemReport.ReportStatus.SEARCHING,
        )

        # Verify #3: Student finder received Good Samaritan reunion notification
        finder_notif = Notification.objects.filter(
            recipient=self.student_finder,
            category=Notification.Category.CLAIM,
            title='Item Reunited with Owner!',
        ).first()
        self.assertIsNotNone(finder_notif)

    def test_qr_lookup_resolves_item_ticket_location_and_enforces_ticket_privacy(self):
        # 1. Public lookup by FoundItem tracking_code and qr_token UUID (never leaks secret_identifiers)
        by_code = self.client.get('/api/lost-found/qr-lookup/', {'code': self.custody_item.tracking_code})
        self.assertEqual(by_code.status_code, 200)
        self.assertEqual(by_code.data['match_type'], 'FOUND_ITEM')
        self.assertEqual(by_code.data['found_item']['id'], str(self.custody_item.id))
        self.assertNotIn('secret_identifiers', by_code.data['found_item'])

        by_url = self.client.get(
            '/api/lost-found/qr-lookup/',
            {'code': f'https://campus.edu/scan?code={self.custody_item.qr_token}'},
        )
        self.assertEqual(by_url.status_code, 200)
        self.assertEqual(by_url.data['match_type'], 'FOUND_ITEM')

        # 2. Public lookup by CampusLocation qr_slug
        by_loc = self.client.get('/api/lost-found/qr-lookup/', {'code': self.loc_library.qr_slug})
        self.assertEqual(by_loc.status_code, 200)
        self.assertEqual(by_loc.data['match_type'], 'CAMPUS_LOCATION')
        self.assertEqual(by_loc.data['location']['qr_slug'], self.loc_library.qr_slug)

        # 3. Walk-in ClaimTicket lookup: owner and OSAS Admin allowed; anonymous and other students denied (403)
        self.client.force_authenticate(user=self.student_owner)
        ticket_res = self.client.post(
            '/api/lost-found/claim-tickets/',
            {'found_item': str(self.custody_item.id)},
            format='json',
        )
        self.assertEqual(ticket_res.status_code, 201)
        ticket_code = ticket_res.data['ticket_code']

        owner_lookup = self.client.get('/api/lost-found/qr-lookup/', {'code': ticket_code})
        self.assertEqual(owner_lookup.status_code, 200)
        self.assertEqual(owner_lookup.data['match_type'], 'CLAIM_TICKET')

        self.client.force_authenticate(user=self.student_finder)
        other_lookup = self.client.get('/api/lost-found/qr-lookup/', {'code': ticket_code})
        self.assertEqual(other_lookup.status_code, 403)

        self.client.force_authenticate(user=None)
        anon_lookup = self.client.get('/api/lost-found/qr-lookup/', {'code': ticket_code})
        self.assertEqual(anon_lookup.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        admin_lookup = self.client.get('/api/lost-found/qr-lookup/', {'code': ticket_code})
        self.assertEqual(admin_lookup.status_code, 200)
        self.assertEqual(admin_lookup.data['match_type'], 'CLAIM_TICKET')
        self.assertIn('secret_identifiers', admin_lookup.data['found_item'])

        # 4. Unknown code returns 400
        bad = self.client.get('/api/lost-found/qr-lookup/', {'code': 'INVALID-99999'})
        self.assertEqual(bad.status_code, 400)

    def test_void_mistaken_claim_notifies_previous_claimant_and_realerts_other_matched_student(self):
        from apps.lost_and_found.models import LostItemReport

        # Both student_finder (mistaken claimant) and student_owner (rightful owner) file lost reports
        lost_payload = {
            'category': str(self.cat_electronics.id),
            'item_name': 'Silver Scientific Calculator',
            'detailed_description': 'Casio scientific calculator lost at 2F library desk 4.',
            'suspected_location': str(self.loc_library.id),
            'date_lost': str(timezone.localdate()),
        }
        self.client.force_authenticate(user=self.student_finder)
        finder_report = self.client.post('/api/lost-found/lost-reports/', lost_payload, format='json')
        self.assertEqual(finder_report.status_code, 201)
        finder_report_id = finder_report.data['id']

        self.client.force_authenticate(user=self.student_owner)
        owner_report = self.client.post('/api/lost-found/lost-reports/', lost_payload, format='json')
        self.assertEqual(owner_report.status_code, 201)
        owner_report_id = owner_report.data['id']

        # 1. Admin mistakenly releases item to student_finder
        self.client.force_authenticate(user=self.admin)
        claim_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_student': self.student_finder.id,
                'claimant_name': 'Maria Clara',
                'claimant_student_number': '026A-12222',
                'claimant_id_type': 'Validated Student ID',
            },
            format='json',
        )
        self.assertEqual(claim_res.status_code, 201)
        self.assertEqual(
            LostItemReport.objects.get(pk=finder_report_id).status,
            LostItemReport.ReportStatus.VERIFIED_CLAIMED,
        )
        self.assertEqual(
            LostItemReport.objects.get(pk=owner_report_id).status,
            LostItemReport.ReportStatus.SEARCHING,
        )

        # 2. Admin reverses the mistaken claim
        void_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
            {'void_reason': 'Returned to OSAS after student realized wrong calculator.'},
            format='json',
        )
        self.assertEqual(void_res.status_code, 200)

        # Previous claimant gets reversal notification instructing return to OSAS and their report reopens
        reversal_notif = Notification.objects.filter(
            recipient=self.student_finder,
            category=Notification.Category.CLAIM,
            title='Claim Reversed — Action Required',
        ).first()
        self.assertIsNotNone(reversal_notif)
        self.assertIn('wrong calculator', reversal_notif.message)
        self.assertIn('return it to the OSAS Office', reversal_notif.message)
        self.assertNotEqual(
            LostItemReport.objects.get(pk=finder_report_id).status,
            LostItemReport.ReportStatus.VERIFIED_CLAIMED,
        )

        # Rightful owner gets privacy-safe re-alert (no previous claimant PII) and status returns to POTENTIAL_MATCH
        realert_notif = Notification.objects.filter(
            recipient=self.student_owner,
            category=Notification.Category.MATCH_ALERT,
            title='Matched Item Back in OSAS Custody',
        ).first()
        self.assertIsNotNone(realert_notif)
        self.assertNotIn('Maria Clara', realert_notif.message)
        self.assertNotIn('026A-12222', realert_notif.message)
        self.assertEqual(
            LostItemReport.objects.get(pk=owner_report_id).status,
            LostItemReport.ReportStatus.POTENTIAL_MATCH,
        )

    def test_student_my_records_and_admin_student_records_endpoints(self):
        # Anonymous users cannot access either endpoint
        self.assertIn(self.client.get('/api/lost-found/my-records/').status_code, (401, 403))
        self.assertIn(
            self.client.get(f'/api/users/admin/students/{self.student_owner.id}/records/').status_code,
            (401, 403),
        )

        # Student finder surrenders an item; student owner claims self.custody_item
        self.client.force_authenticate(user=self.student_finder)
        self.client.post(
            '/api/lost-found/report-found/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Surrendered Powerbank',
                'general_description': 'Black 10000mAh powerbank.',
                'found_location': str(self.loc_library.id),
                'finder_department': 'BSIT',
            },
            format='json',
        )

        self.client.force_authenticate(user=self.admin)
        self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11111',
                'claimant_id_type': 'Validated Student ID',
            },
            format='json',
        )

        # Student owner sees their claimed item in /my-records/ (no secret_identifiers) and is denied admin endpoint
        self.client.force_authenticate(user=self.student_owner)
        my_res = self.client.get('/api/lost-found/my-records/')
        self.assertEqual(my_res.status_code, 200)
        self.assertEqual(my_res.data['counts']['claimed_active'], 1)
        self.assertEqual(my_res.data['claimed_items'][0]['tracking_code'], self.custody_item.tracking_code)
        self.assertNotIn('secret_identifiers', my_res.data['claimed_items'][0])

        self.assertEqual(
            self.client.get(f'/api/users/admin/students/{self.student_finder.id}/records/').status_code,
            403,
        )

        # Admin can inspect student_finder's surrendered items via /api/users/admin/students/<id>/records/
        self.client.force_authenticate(user=self.admin)
        admin_res = self.client.get(f'/api/users/admin/students/{self.student_finder.id}/records/')
        self.assertEqual(admin_res.status_code, 200)
        self.assertEqual(admin_res.data['counts']['returned'], 1)
        self.assertEqual(admin_res.data['returned_items'][0]['title'], 'Surrendered Powerbank')

    def test_admin_receives_pending_intake_and_walkin_claim_pass_notifications(self):
        # 1. Student reports a found item -> active OSAS Admin receives Pending Intake notification
        self.client.force_authenticate(user=self.student_finder)
        found_res = self.client.post(
            '/api/lost-found/report-found/',
            {
                'category': str(self.cat_electronics.id),
                'title': 'Found Bluetooth Mouse',
                'general_description': 'Black Logitech mouse left in computer lab.',
                'found_location': str(self.loc_library.id),
                'finder_department': 'BSIT',
            },
            format='json',
        )
        self.assertEqual(found_res.status_code, 201)
        intake_notif = Notification.objects.filter(
            recipient=self.admin,
            category=Notification.Category.INTAKE,
            title='New Found Item Pending Intake',
        ).first()
        self.assertIsNotNone(intake_notif)
        self.assertEqual(intake_notif.link_path, '/admin/directory?status=PENDING_SURRENDER')

        # 2. Student generates a walk-in claim pass -> active OSAS Admin receives Claim Counter notification
        self.client.force_authenticate(user=self.student_owner)
        ticket_res = self.client.post(
            '/api/lost-found/claim-tickets/',
            {'found_item': str(self.custody_item.id)},
            format='json',
        )
        self.assertEqual(ticket_res.status_code, 201)
        ticket_code = ticket_res.data['ticket_code']

        pass_notif = Notification.objects.filter(
            recipient=self.admin,
            category=Notification.Category.CLAIM,
            title='New Walk-In Claim Pass Generated',
        ).first()
        self.assertIsNotNone(pass_notif)
        self.assertEqual(pass_notif.link_path, f'/admin/claim?code={ticket_code}')

    def test_public_handover_photo_exposed_separately_from_private_id_evidence(self):
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        def make_test_image(name, color):
            buf = BytesIO()
            Image.new('RGB', (40, 40), color=color).save(buf, format='JPEG')
            return SimpleUploadedFile(name, buf.getvalue(), content_type='image/jpeg')

        # 1. Without explicit claimant consent, handover photo must NOT be exposed publicly
        self.client.force_authenticate(user=self.admin)
        no_consent_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11745',
                'claimant_id_type': 'Validated Student ID',
                'id_photo_evidence': make_test_image('private_id.jpg', (200, 30, 30)),
                'public_handover_photo': make_test_image('unconsented.jpg', (30, 80, 150)),
                'public_handover_consent': 'false',
            },
            format='multipart',
        )
        self.assertEqual(no_consent_res.status_code, 201)
        self.assertFalse(no_consent_res.data.get('public_handover_consent'))

        self.client.force_authenticate(user=None)
        pub_no_consent = self.client.get(f'/api/lost-found/items/{self.custody_item.id}/')
        self.assertEqual(pub_no_consent.status_code, 200)
        self.assertIsNone(pub_no_consent.data.get('public_handover_photo'))
        self.assertNotIn('id_photo_evidence', pub_no_consent.data)

        # Void first claim so we can test consented handover photo on the same item
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(
            self.client.post(
                f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
                {'void_reason': 'Reset for consent test'},
                format='json',
            ).status_code,
            200,
        )

        # 2. With explicit claimant consent, handover photo IS exposed publicly (never id_photo_evidence)
        claim_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/process-claim/',
            {
                'claimant_name': 'Juan Dela Cruz',
                'claimant_student_number': '026A-11745',
                'claimant_id_type': 'Validated Student ID',
                'id_photo_evidence': make_test_image('private_id_2.jpg', (200, 30, 30)),
                'public_handover_photo': make_test_image('reunion.jpg', (30, 150, 80)),
                'public_handover_consent': 'true',
            },
            format='multipart',
        )
        self.assertEqual(claim_res.status_code, 201)
        self.assertTrue(claim_res.data.get('public_handover_consent'))
        self.assertTrue((claim_res.data.get('id_photo_evidence') or '').startswith('/media/'))
        self.assertTrue((claim_res.data.get('public_handover_photo') or '').startswith('/media/'))

        # Public endpoint exposes ONLY public_handover_photo (root-relative), never id_photo_evidence
        self.client.force_authenticate(user=None)
        pub_res = self.client.get(f'/api/lost-found/items/{self.custody_item.id}/')
        self.assertEqual(pub_res.status_code, 200)
        self.assertTrue((pub_res.data.get('public_handover_photo') or '').startswith('/media/'))
        self.assertNotIn('id_photo_evidence', pub_res.data)
        self.assertNotIn('claim_transaction', pub_res.data)

        # Voiding the claim clears public_handover_photo on the public endpoint
        self.client.force_authenticate(user=self.admin)
        void_res = self.client.post(
            f'/api/lost-found/admin/items/{self.custody_item.id}/void-claim/',
            {'void_reason': 'Mistaken claim test'},
            format='json',
        )
        self.assertEqual(void_res.status_code, 200)
        self.client.force_authenticate(user=None)
        pub_after_void = self.client.get(f'/api/lost-found/items/{self.custody_item.id}/')
        self.assertEqual(pub_after_void.status_code, 200)
        self.assertIsNone(pub_after_void.data.get('public_handover_photo'))
