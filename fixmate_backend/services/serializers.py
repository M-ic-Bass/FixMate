from rest_framework import serializers
from .models import ServiceCategory, ServiceProvider, Review

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = '__all__'

class ServiceProviderSerializer(serializers.ModelSerializer):
    categories = ServiceCategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = ServiceProvider
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 'customer_name', 'created_at']
        read_only_fields = ['id', 'customer_name', 'created_at']
