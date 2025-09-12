from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ServiceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, blank=True)  # For emoji or icon class
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Service Categories"

    def __str__(self):
        return self.name

class ServiceProvider(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='service_provider')
    categories = models.ManyToManyField(ServiceCategory, related_name='providers')
    business_name = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    skills = models.TextField()
    experience_years = models.PositiveIntegerField(default=0)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    service_area = models.CharField(max_length=200)
    license_number = models.CharField(max_length=100, blank=True)
    insurance_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_jobs = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business_name or self.user.get_full_name()} - {self.user.username}"

    def update_rating(self):
        """Update provider rating based on reviews"""
        reviews = self.reviews.all()
        if reviews.exists():
            avg_rating = reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.rating = round(avg_rating, 2)
            self.save()

class Review(models.Model):
    RATING_CHOICES = [(i, i) for i in range(1, 6)]
    
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='reviews')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_reviews')
    job = models.OneToOneField('jobs.Job', on_delete=models.CASCADE, related_name='review', null=True, blank=True)
    rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['provider', 'customer', 'job']

    def __str__(self):
        return f"Review for {self.provider.business_name} - {self.rating} stars"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.provider.update_rating()

class ProviderAvailability(models.Model):
    DAYS_OF_WEEK = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ['provider', 'day_of_week']

    def __str__(self):
        return f"{self.provider.business_name} - {self.get_day_of_week_display()}"