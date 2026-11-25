from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminFoundItemViewSet,
    CampusLocationViewSet,
    ClaimTicketViewSet,
    ItemCategoryViewSet,
    LeaderboardView,
    LostItemReportViewSet,
    MyActivityRecordsView,
    OsasAnalyticsView,
    PortalConfigurationView,
    PublicFoundItemViewSet,
    QrLookupView,
    ReportFoundItemView,
)

router = DefaultRouter()
router.register(r'items', PublicFoundItemViewSet, basename='public-found-items')
router.register(r'lost-reports', LostItemReportViewSet, basename='lost-reports')
router.register(r'claim-tickets', ClaimTicketViewSet, basename='claim-tickets')
router.register(r'categories', ItemCategoryViewSet, basename='item-categories')
router.register(r'locations', CampusLocationViewSet, basename='campus-locations')
router.register(r'admin/items', AdminFoundItemViewSet, basename='admin-found-items')

urlpatterns = [
    path('', include(router.urls)),
    path('report-found/', ReportFoundItemView.as_view(), name='report-found-item'),
    path('qr-lookup/', QrLookupView.as_view(), name='qr-lookup'),
    path('leaderboard/', LeaderboardView.as_view(), name='honesty-leaderboard'),
    path('my-records/', MyActivityRecordsView.as_view(), name='my-activity-records'),
    path('admin/analytics/', OsasAnalyticsView.as_view(), name='osas-analytics'),
    path('config/', PortalConfigurationView.as_view(), name='portal-config'),
]
