from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserVerification

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'user_type', 'is_verified', 'is_active', 'created_at')
    list_filter = ('user_type', 'is_verified', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'phone_number')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('user_type', 'phone_number', 'profile_picture', 'address', 'is_verified')
        }),
    )
    
    actions = ['approve_users', 'reject_users']
    
    def approve_users(self, request, queryset):
        queryset.update(is_verified=True)
        self.message_user(request, f"{queryset.count()} users have been approved.")
    approve_users.short_description = "Approve selected users"
    
    def reject_users(self, request, queryset):
        queryset.update(is_verified=False)
        self.message_user(request, f"{queryset.count()} users have been rejected.")
    reject_users.short_description = "Reject selected users"

@admin.register(UserVerification)
class UserVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'verification_status', 'submitted_at', 'reviewed_at')
    list_filter = ('verification_status', 'submitted_at')
    search_fields = ('user__username', 'user__email')
    ordering = ('-submitted_at',)
    readonly_fields = ('submitted_at',)
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Verification Images', {
            'fields': ('selfie_image', 'id_front_image', 'id_back_image')
        }),
        ('Review Information', {
            'fields': ('verification_status', 'reviewer_notes', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('submitted_at',)
        }),
    )
    
    actions = ['approve_verifications', 'reject_verifications']
    
    def approve_verifications(self, request, queryset):
        from django.utils import timezone
        queryset.update(verification_status='approved', reviewed_at=timezone.now())
        # Also update the user's is_verified status
        for verification in queryset:
            verification.user.is_verified = True
            verification.user.save()
        self.message_user(request, f"{queryset.count()} verifications have been approved.")
    approve_verifications.short_description = "Approve selected verifications"
    
    def reject_verifications(self, request, queryset):
        from django.utils import timezone
        queryset.update(verification_status='rejected', reviewed_at=timezone.now())
        # Also update the user's is_verified status
        for verification in queryset:
            verification.user.is_verified = False
            verification.user.save()
        self.message_user(request, f"{queryset.count()} verifications have been rejected.")
    reject_verifications.short_description = "Reject selected verifications"