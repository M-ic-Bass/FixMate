from rest_framework import serializers
from .models import Job, JobImage, JobApplication, JobUpdate
from services.models import ServiceCategory

class JobSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['customer', 'created_at', 'updated_at']

class JobImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobImage
        fields = '__all__'

class JobApplicationSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.business_name', read_only=True)
    
    class Meta:
        model = JobApplication
        fields = '__all__'
        read_only_fields = ['provider', 'applied_at']

class JobUpdateSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = JobUpdate
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
