"""Rule-based auto-matching engine connecting LostItemReport and FoundItem."""
from difflib import SequenceMatcher
from decimal import Decimal

from apps.notifications.models import Notification
from apps.notifications.services import notify_user
from .models import FoundItem, ItemMatchCandidate, LostItemReport

MATCH_THRESHOLD = Decimal('65.00')
MIN_TEXT_RELEVANCE = 6.0  # Prevents false positives when items share category/date/location but have unrelated text

_STOPWORDS = frozenset({
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'near', 'into', 'onto',
    'over', 'under', 'around', 'beside', 'inside', 'outside', 'left', 'lost',
    'found', 'item', 'thing', 'stuff', 'campus', 'school', 'building', 'room',
    'floor', 'table', 'desk', 'chair', 'area', 'very', 'just', 'some', 'have',
    'has', 'had', 'was', 'were', 'been', 'are', 'its', 'his', 'her', 'their',
    'our', 'your', 'you', 'please', 'help', 'return', 'color', 'colored',
})


def _tokenize(text: str) -> set[str]:
    cleaned = ''.join(ch.lower() if ch.isalnum() else ' ' for ch in (text or ''))
    return {
        tok
        for tok in cleaned.split()
        if len(tok) >= 3 and tok not in _STOPWORDS
    }


def compute_match_score(lost_report: LostItemReport, found_item: FoundItem) -> tuple[Decimal, dict]:
    """
    Compute weighted similarity score (0–100):
      - Text / keyword similarity (stopword-filtered): up to 35 pts
      - Category match: 25 pts
      - Date proximity (lost <= found, within 0–30 days): up to 20 pts
      - Location match (same location or building): up to 20 pts
    Requires MIN_TEXT_RELEVANCE so unrelated items in the same category/location
    never trigger false-positive notifications.
    """
    reasons = {}

    # 1. Category (25)
    cat_score = 25.0 if lost_report.category_id == found_item.category_id else 0.0
    reasons['category'] = round(cat_score, 2)

    # 2. Date proximity (20)
    date_score = 0.0
    if found_item.date_found and lost_report.date_lost:
        delta = (found_item.date_found - lost_report.date_lost).days
        if 0 <= delta <= 3:
            date_score = 20.0
        elif 4 <= delta <= 7:
            date_score = 16.0
        elif 8 <= delta <= 14:
            date_score = 12.0
        elif 15 <= delta <= 30:
            date_score = 6.0
        elif delta == -1:
            # Handle minor timezone/reporting off-by-one
            date_score = 12.0
    reasons['date_proximity'] = round(date_score, 2)

    # 3. Location proximity (20)
    loc_score = 0.0
    if lost_report.suspected_location_id and found_item.found_location_id:
        if lost_report.suspected_location_id == found_item.found_location_id:
            loc_score = 20.0
        elif (
            lost_report.suspected_location
            and found_item.found_location
            and lost_report.suspected_location.building_name.lower()
            == found_item.found_location.building_name.lower()
        ):
            loc_score = 12.0
    elif (
        lost_report.suspected_location_custom
        and found_item.found_location_custom
        and SequenceMatcher(
            None,
            lost_report.suspected_location_custom.lower(),
            found_item.found_location_custom.lower(),
        ).ratio() >= 0.6
    ):
        loc_score = 12.0
    reasons['location'] = round(loc_score, 2)

    # 4. Text / Keyword similarity (35)
    lost_title_tokens = _tokenize(lost_report.item_name)
    found_title_tokens = _tokenize(found_item.title)
    lost_tokens = _tokenize(
        f'{lost_report.item_name} {lost_report.detailed_description} {lost_report.distinctive_features}'
    )
    found_tokens = _tokenize(f'{found_item.title} {found_item.general_description}')

    shared_tokens = sorted(lost_tokens & found_tokens)
    shared_title_tokens = lost_title_tokens & found_title_tokens

    if lost_tokens and found_tokens:
        # Dice-like balanced overlap so long descriptions don't unfairly dilute matches
        overlap = (2.0 * len(shared_tokens)) / (len(lost_tokens) + len(found_tokens))
    else:
        overlap = 0.0

    title_overlap = (
        (2.0 * len(shared_title_tokens)) / (len(lost_title_tokens) + len(found_title_tokens))
        if (lost_title_tokens and found_title_tokens)
        else 0.0
    )
    title_ratio = SequenceMatcher(
        None,
        (lost_report.item_name or '').lower(),
        (found_item.title or '').lower(),
    ).ratio()

    effective_title_ratio = title_ratio if title_ratio >= 0.45 else 0.0
    best_text_signal = max(overlap, title_overlap, effective_title_ratio * 0.85)
    text_score = min(35.0, best_text_signal * 35.0)
    reasons['text_similarity'] = round(text_score, 2)
    reasons['matched_keywords'] = shared_tokens[:5]
    reasons['has_text_relevance'] = bool(shared_tokens or title_ratio >= 0.45)

    total = Decimal(str(round(cat_score + date_score + loc_score + text_score, 2)))
    return min(total, Decimal('100.00')), reasons


def _record_match_if_qualifies(lost_report: LostItemReport, found_item: FoundItem):
    score, reasons = compute_match_score(lost_report, found_item)
    if not reasons.get('has_text_relevance') or reasons.get('text_similarity', 0.0) < MIN_TEXT_RELEVANCE:
        return None
    if score < MATCH_THRESHOLD:
        return None

    existing = ItemMatchCandidate.objects.filter(
        lost_report=lost_report,
        found_item=found_item,
    ).first()
    if existing and existing.student_feedback == ItemMatchCandidate.Feedback.NOT_MY_ITEM:
        return None

    candidate, _ = ItemMatchCandidate.objects.update_or_create(
        lost_report=lost_report,
        found_item=found_item,
        defaults={
            'match_score': score,
            'match_reasons': reasons,
        },
    )

    if lost_report.status == LostItemReport.ReportStatus.SEARCHING:
        lost_report.status = LostItemReport.ReportStatus.POTENTIAL_MATCH
        lost_report.save(update_fields=['status', 'updated_at'])

    if not candidate.notification_sent:
        notify_user(
            recipient=lost_report.student,
            title='Potential Match Found for Your Lost Item!',
            message=(
                f'An item matching "{lost_report.item_name}" ({found_item.title}, '
                f'Tracking {found_item.tracking_code}) is in OSAS custody ({score}% match). '
                f'Visit OSAS with your Student ID to verify and claim it.'
            ),
            category=Notification.Category.MATCH_ALERT,
            link_path=f'/report-lost?highlight={lost_report.id}',
        )
        candidate.notification_sent = True
        candidate.save(update_fields=['notification_sent'])

    return candidate


def run_matching_for_found_item(found_item: FoundItem) -> list[ItemMatchCandidate]:
    """Evaluate an IN_CUSTODY found item against all active lost reports."""
    if found_item.custody_status != FoundItem.CustodyStatus.IN_CUSTODY:
        return []

    open_reports = (
        LostItemReport.objects.select_related('student', 'category', 'suspected_location')
        .filter(
            status__in=[
                LostItemReport.ReportStatus.SEARCHING,
                LostItemReport.ReportStatus.POTENTIAL_MATCH,
            ]
        )
    )
    matches = []
    for report in open_reports:
        candidate = _record_match_if_qualifies(report, found_item)
        if candidate is not None:
            matches.append(candidate)
    return matches


def run_matching_for_lost_report(lost_report: LostItemReport) -> list[ItemMatchCandidate]:
    """Evaluate a newly filed lost item report against all IN_CUSTODY found items."""
    custody_items = (
        FoundItem.objects.select_related('category', 'found_location')
        .filter(custody_status=FoundItem.CustodyStatus.IN_CUSTODY)
    )
    matches = []
    for item in custody_items:
        candidate = _record_match_if_qualifies(lost_report, item)
        if candidate is not None:
            matches.append(candidate)
    return matches
