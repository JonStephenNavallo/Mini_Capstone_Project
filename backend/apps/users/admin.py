from django.contrib import admin
from .models import StaffProfile, StudentProfile, User

admin.site.register(User)
admin.site.register(StudentProfile)
admin.site.register(StaffProfile)
