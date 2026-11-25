from rest_framework import permissions
from apps.users.models import User


class IsOsasAdmin(permissions.BasePermission):
    """Deny-by-default permission allowing only active OSAS ADMIN users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.RoleType.ADMIN
        )


class IsStudentOrAdmin(permissions.BasePermission):
    """Allow authenticated active students or OSAS admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role in (User.RoleType.STUDENT, User.RoleType.ADMIN)
        )


class IsPublicReadOrAdminWrite(permissions.BasePermission):
    """Public read for safe methods; ADMIN-only for mutations."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.RoleType.ADMIN
        )
