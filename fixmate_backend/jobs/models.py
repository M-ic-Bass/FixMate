from django.db import models
from django.contrib.auth import get_user_model
from services.models import ServiceCategory, ServiceProvider

User = get_user_model()

class Job(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    URGENCY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
    ]
    
    TIME_PREFERENCES = [
        ('morning', 'Morning (8am-12pm)'),
        ('afternoon', 'Afternoon (12pm-5pm)'),
        ('evening', 'Evening (5pm-9pm)'),
    ]
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posted_jobs')
    provider = models.ForeignKey(ServiceProvider, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_jobs')
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    address = models.CharField(max_length=300)
    preferred_date = models.DateField()
    preferred_time = models.CharField(max_length=20, choices=TIME_PREFERENCES)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    estimated_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.customer.username}"

class JobImage(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='job_images/')
    description = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.job.title}"

class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='job_applications')
    message = models.TextField(blank=True)
    proposed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_duration = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['job', 'provider']

    def __str__(self):
        return f"{self.provider.business_name} applied for {self.job.title}"

class JobUpdate(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='updates')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    image = models.ImageField(upload_to='job_updates/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Update for {self.job.title} by {self.user.username}"