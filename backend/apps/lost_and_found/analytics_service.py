"""OSAS analytics aggregation service."""
from datetime import timedelta
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import FoundItem, LostItemReport, PortalConfiguration


def get_osas_dashboard_analytics() -> dict:
    """Compute KPI cards, category distribution, campus hotspots, and aging items."""
    total_found = FoundItem.objects.count()
    in_custody_count = FoundItem.objects.filter(
        custody_status=FoundItem.CustodyStatus.IN_CUSTODY
    ).count()
    pending_intake_count = FoundItem.objects.filter(
        custody_status=FoundItem.CustodyStatus.PENDING_SURRENDER
    ).count()
    claimed_count = FoundItem.objects.filter(
        custody_status=FoundItem.CustodyStatus.CLAIMED
    ).count()
    open_lost_reports = LostItemReport.objects.filter(
        status__in=[
            LostItemReport.ReportStatus.SEARCHING,
            LostItemReport.ReportStatus.POTENTIAL_MATCH,
        ]
    ).count()

    resolved_denominator = in_custody_count + claimed_count
    recovery_rate = round((claimed_count / resolved_denominator) * 100, 1) if resolved_denominator else 0.0

    # Category breakdown
    category_rows = (
        FoundItem.objects.values('category__name')
        .annotate(count=Count('id'))
        .order_by('-count')[:8]
    )
    category_breakdown = [
        {'label': row['category__name'] or 'Uncategorized', 'value': row['count']}
        for row in category_rows
    ]

    # Campus hotspots
    location_rows = (
        FoundItem.objects.filter(found_location__isnull=False)
        .values('found_location__building_name')
        .annotate(count=Count('id'))
        .order_by('-count')[:6]
    )
    campus_hotspots = [
        {'building': row['found_location__building_name'], 'count': row['count']}
        for row in location_rows
    ]

    # Monthly intake trend (last 6 months)
    monthly_rows = (
        FoundItem.objects.annotate(month=TruncMonth('date_found'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')[:6]
    )
    monthly_trend = [
        {
            'month': row['month'].strftime('%b %Y') if row['month'] else 'Unknown',
            'count': row['count'],
        }
        for row in monthly_rows
    ]

    # Aging items nearing or exceeding retention limit
    config, _ = PortalConfiguration.objects.get_or_create(pk=1)
    cutoff_date = timezone.localdate() - timedelta(days=max(config.default_retention_days - 15, 30))
    aging_items = list(
        FoundItem.objects.select_related('category')
        .filter(
            custody_status=FoundItem.CustodyStatus.IN_CUSTODY,
            date_found__lte=cutoff_date,
        )
        .values('id', 'tracking_code', 'title', 'date_found', 'storage_shelf_bin', 'category__name')[:10]
    )

    return {
        'kpis': {
            'total_logged': total_found,
            'in_custody': in_custody_count,
            'pending_intake': pending_intake_count,
            'claimed_count': claimed_count,
            'open_lost_reports': open_lost_reports,
            'recovery_rate': recovery_rate,
        },
        'category_breakdown': category_breakdown,
        'campus_hotspots': campus_hotspots,
        'monthly_trend': monthly_trend,
        'aging_items': aging_items,
    }
