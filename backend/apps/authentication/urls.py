from django.urls import path
from .views import (
    CSRFTokenView,
    ChangePasswordView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterStudentView,
)

urlpatterns = [
    path('csrf/', CSRFTokenView.as_view(), name='auth-csrf'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('register/', RegisterStudentView.as_view(), name='auth-register'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
]
