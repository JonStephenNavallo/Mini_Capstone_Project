from django.contrib import admin
from .models import (
    CampusLocation,
    ClaimTicket,
    ClaimTransaction,
    FoundItem,
    HonestyPointLog,
    ItemCategory,
    ItemMatchCandidate,
    LostItemReport,
    PortalConfiguration,
    StudentHonestyProfile,
)

admin.site.register(ItemCategory)
admin.site.register(CampusLocation)
admin.site.register(FoundItem)
admin.site.register(LostItemReport)
admin.site.register(ItemMatchCandidate)
admin.site.register(ClaimTicket)
admin.site.register(ClaimTransaction)
admin.site.register(StudentHonestyProfile)
admin.site.register(HonestyPointLog)
admin.site.register(PortalConfiguration)
