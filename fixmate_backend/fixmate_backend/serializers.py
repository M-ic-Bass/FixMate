# FixMate - Main Serializers

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models
from services.models import ServiceProvider, ServiceCategory, Review
from jobs.models import Job

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """User serializer for admin views"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 
                 'phone_number', 'address', 'profile_picture', 'is_verified', 
                 'is_active', 'date_joined', 'created_at']
        read_only_fields = ['date_joined', 'created_at']


class ServiceProviderSerializer(serializers.ModelSerializer):
    """Service Provider serializer for admin views"""
    owner_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    total_jobs = serializers.IntegerField(read_only=True)
    validation_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = ServiceProvider
        fields = ['id', 'business_name', 'owner_name', 'email', 'description', 
                 'skills', 'experience_years', 'hourly_rate', 'service_area',
                 'license_number', 'insurance_verified', 'is_available',
                 'rating', 'total_jobs', 'validation_status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class JobSerializer(serializers.ModelSerializer):
    """Job serializer for admin views"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    provider_name = serializers.CharField(source='provider.business_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Job
        fields = ['id', 'title', 'description', 'category_name', 'address', 
                 'preferred_date', 'preferred_time', 'urgency', 'status',
                 'estimated_price', 'final_price', 'customer_name', 'provider_name',
                 'created_at', 'updated_at', 'accepted_at', 'completed_at']
        read_only_fields = ['created_at', 'updated_at', 'accepted_at', 'completed_at']


class ReviewSerializer(serializers.ModelSerializer):
    """Review serializer for admin views"""
    reviewer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    reviewed_name = serializers.CharField(source='provider.business_name', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'reviewer_name', 'reviewed_name', 'job_title', 'rating',
                 'comment', 'is_flagged', 'created_at']
        read_only_fields = ['created_at']


