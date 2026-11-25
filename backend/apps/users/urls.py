from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AdminStudentManagementViewSet, StudentDirectoryLookupView, UserMeView

router = DefaultRouter()
router.register(r'admin/students', AdminStudentManagementViewSet, basename='admin-students')

urlpatterns = [
    path('me/', UserMeView.as_view(), name='users-me'),
    path('students/', StudentDirectoryLookupView.as_view(), name='users-students-lookup'),
    path('', include(router.urls)),
]
