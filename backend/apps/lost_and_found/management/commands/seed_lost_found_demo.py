"""Idempotent demo seeder for Campus Property Lost & Found Portal."""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.lost_and_found.models import (
    CampusLocation,
    ClaimTransaction,
    FoundItem,
    ItemCategory,
    LostItemReport,
    PortalConfiguration,
)
from apps.lost_and_found.services import (
    award_department_honesty_points,
    create_lost_item_report,
)
from apps.users.models import StaffProfile, StudentProfile, User


class Command(BaseCommand):
    help = 'Seed demo accounts, categories, locations, and Lost & Found records.'

    @transaction.atomic
    def handle(self, *args, **options):
        PortalConfiguration.objects.get_or_create(pk=1)

        admin_user, created = User.objects.get_or_create(
            email='admin@campus.edu',
            defaults={'role': User.RoleType.ADMIN, 'is_staff': True},
        )
        if created:
            admin_user.set_password('AdminPass123!')
            admin_user.save()
        StaffProfile.objects.get_or_create(
            user=admin_user,
            defaults={
                'employee_id': 'OSAS-001',
                'first_name': 'Elena',
                'last_name': 'Navarro',
                'office': 'OSAS Student Center',
            },
        )

        student1, created = User.objects.get_or_create(
            email='student@campus.edu',
            defaults={'role': User.RoleType.STUDENT},
        )
        if created:
            student1.set_password('StudentPass123!')
            student1.save()
        StudentProfile.objects.get_or_create(
            user=student1,
            defaults={
                'student_number': '026A-11745',
                'first_name': 'Alex',
                'last_name': 'Reyes',
                'program_year': 'BSIT 3A',
                'contact_number': '09171234567',
            },
        )

        student2, created = User.objects.get_or_create(
            email='finder@campus.edu',
            defaults={'role': User.RoleType.STUDENT},
        )
        if created:
            student2.set_password('StudentPass123!')
            student2.save()
        StudentProfile.objects.get_or_create(
            user=student2,
            defaults={
                'student_number': '026A-11746',
                'first_name': 'Bianca',
                'last_name': 'Mendoza',
                'program_year': 'BSCS 2B',
                'contact_number': '09187654321',
            },
        )

        categories_data = [
            ('Electronics', 'devices', 90, True),
            ('IDs & Documents', 'badge', 120, True),
            ('Tumblers & Bottles', 'water_drop', 60, False),
            ('Keys & Access Cards', 'vpn_key', 90, True),
            ('Bags & Apparel', 'backpack', 90, True),
            ('Wallets & Valuables', 'wallet', 120, True),
        ]
        categories = {}
        for name, icon, days, secret in categories_data:
            cat, _ = ItemCategory.objects.get_or_create(
                name=name,
                defaults={
                    'icon_key': icon,
                    'retention_days': days,
                    'requires_secret_verification': secret,
                },
            )
            categories[name] = cat

        locations_data = [
            ('Main Library', '2F Quiet Study Wing', 'lib-2f-study', True),
            ('Student Center', 'OSAS Front Desk', 'osas-desk', True),
            ('Science Building', 'Lab Room 304', 'sci-lab-304', True),
            ('University Cafeteria', 'North Dining Hall', 'cafeteria-north', True),
            ('Main Gymnasium', 'Bleachers West', 'gym-bleachers', False),
            ('IT Annex', 'Computer Lab 1', 'it-lab-1', True),
        ]
        locations = {}
        for bldg, room, slug, drop in locations_data:
            loc, _ = CampusLocation.objects.get_or_create(
                qr_slug=slug,
                defaults={
                    'building_name': bldg,
                    'floor_room': room,
                    'is_drop_off_point': drop,
                },
            )
            locations[slug] = loc

        today = timezone.localdate()
        if not FoundItem.objects.exists():
            item1 = FoundItem.objects.create(
                tracking_code='OSAS-2026-1001',
                category=categories['Tumblers & Bottles'],
                title='Matte Navy AquaFlask 32oz',
                general_description='Insulated stainless steel bottle left near study tables.',
                secret_identifiers='Small scratch near base; cap has a tiny cat sticker inside rim.',
                found_location=locations['lib-2f-study'],
                date_found=today - timedelta(days=1),
                finder_type=FoundItem.FinderType.AUTHENTICATED_STUDENT,
                finder_user=student2,
                finder_department=FoundItem.Department.BSIT,
                custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
                storage_shelf_bin='Shelf A - Bin 02',
                created_by=admin_user,
            )
            award_department_honesty_points(found_item=item1, points=25)

            item2 = FoundItem.objects.create(
                tracking_code='OSAS-2026-1002',
                category=categories['Electronics'],
                title='White Wireless Earbuds Case',
                general_description='Compact wireless charging case found after lab session.',
                secret_identifiers='Serial suffix 9K4M; protective silicone sleeve is mint green inside.',
                found_location=locations['it-lab-1'],
                date_found=today - timedelta(days=2),
                finder_type=FoundItem.FinderType.AUTHENTICATED_STUDENT,
                finder_user=student2,
                finder_department=FoundItem.Department.BSIT,
                custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
                storage_shelf_bin='Vault Drawer 1',
                created_by=admin_user,
            )
            award_department_honesty_points(found_item=item2, points=35)

            item3 = FoundItem.objects.create(
                tracking_code='OSAS-2026-1003',
                category=categories['IDs & Documents'],
                title='Student ID Lanyard (Blue Strap)',
                general_description='University ID card inside clear vertical sleeve.',
                secret_identifiers='ID holder belongs to BSCE sophomore; sticker on reverse.',
                found_location=locations['cafeteria-north'],
                date_found=today - timedelta(days=3),
                finder_type=FoundItem.FinderType.GUEST_ANONYMOUS,
                finder_name='Cafeteria Staff',
                finder_department=FoundItem.Department.BSSW,
                custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
                storage_shelf_bin='ID Tray 01',
                created_by=admin_user,
            )
            award_department_honesty_points(found_item=item3, points=25)

            FoundItem.objects.create(
                tracking_code='OSAS-2026-1004',
                category=categories['Keys & Access Cards'],
                title='Silver Dorm Keychain with Tag',
                general_description='Set of two brass keys on a blue braided ring.',
                secret_identifiers='Engraved room tag #204 on key fob.',
                found_location=locations['gym-bleachers'],
                date_found=today,
                finder_type=FoundItem.FinderType.GUEST_ANONYMOUS,
                finder_name='Walk-in Guard',
                finder_department=FoundItem.Department.BSPA,
                custody_status=FoundItem.CustodyStatus.PENDING_SURRENDER,
            )

            claimed_item = FoundItem.objects.create(
                tracking_code='OSAS-2026-0998',
                category=categories['Bags & Apparel'],
                title='Black Canvas Laptop Sleeve 14"',
                general_description='Padded zip sleeve with front pocket recovered at Science Building.',
                secret_identifiers='Contains Logitech USB receiver in front pocket.',
                found_location=locations['sci-lab-304'],
                date_found=today - timedelta(days=6),
                finder_type=FoundItem.FinderType.AUTHENTICATED_STUDENT,
                finder_user=student1,
                finder_department=FoundItem.Department.BSA,
                custody_status=FoundItem.CustodyStatus.CLAIMED,
                storage_shelf_bin='Shelf C - Bin 01',
                created_by=admin_user,
            )
            award_department_honesty_points(found_item=claimed_item, points=30)
            ClaimTransaction.objects.create(
                found_item=claimed_item,
                claimant_student=student2,
                claimant_name='Bianca Mendoza',
                claimant_student_number='026A-11746',
                claimant_id_type='Student ID',
                verifying_admin=admin_user,
                verification_notes='Correctly identified USB receiver inside front pocket.',
            )

        if not LostItemReport.objects.exists():
            create_lost_item_report(
                student=student1,
                validated_data={
                    'category': categories['Tumblers & Bottles'],
                    'item_name': 'Navy AquaFlask 32oz Bottle',
                    'detailed_description': 'Left my matte navy insulated tumbler at the library study wing.',
                    'distinctive_features': 'Small cat sticker inside the lid rim',
                    'suspected_location': locations['lib-2f-study'],
                    'date_lost': today - timedelta(days=2),
                },
            )

        self.stdout.write(self.style.SUCCESS('Seeded Lost & Found demo data successfully.'))
