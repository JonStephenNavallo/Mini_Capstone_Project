from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.serializers import (
    ChangePasswordSerializer,
    StudentRegistrationSerializer,
    UserMeSerializer,
)
from .services import (
    authenticate_user_session,
    change_user_password,
    logout_user_session,
    register_student_account,
)


class CSRFTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)}, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        user = authenticate_user_session(
            request,
            email=request.data.get('email', ''),
            identifier=request.data.get('identifier', ''),
            password=request.data.get('password', ''),
        )
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)


class RegisterStudentView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = register_student_account(request, serializer.validated_data)
        return Response(UserMeSerializer(user).data, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = User.objects.select_related('student_profile', 'staff_profile').get(pk=request.user.pk)
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout_user_session(request)
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = change_user_password(
            request,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
        )
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)
