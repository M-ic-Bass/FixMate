from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator

class User(AbstractUser):
    USER_TYPES = (
        ('customer', 'Customer'),
        ('provider', 'Service Provider'),
        ('admin', 'Administrator'),
    )
    

    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='customer')
    phone_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$', message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.")],
        blank=True,
        null=True
    )
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class UserVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='verification')
    selfie_image = models.ImageField(upload_to='verification/selfies/')
    id_front_image = models.ImageField(upload_to='verification/id_front/')
    id_back_image = models.ImageField(upload_to='verification/id_back/')
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewer_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Verification for {self.user.username} - {self.verification_status}"