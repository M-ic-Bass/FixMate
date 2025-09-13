#!/usr/bin/env python
"""
Test script to verify provider registration functionality
"""
import os
import sys
import django
import requests
import json

# Setup Django
sys.path.append('fixmate_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fixmate_backend.settings')
django.setup()

from services.models import ServiceCategory, ServiceProvider
from users.models import User

def test_service_categories():
    """Test if service categories exist and create them if needed"""
    print("Testing service categories...")
    
    # Define default services
    default_services = [
        ('plumbing', 'Professional plumbing services for repairs and installations'),
        ('electrical', 'Expert electrical work from certified electricians'),
        ('carpentry', 'Custom carpentry and woodworking services'),
        ('painting', 'Professional painting services for interior and exterior projects'),
        ('general', 'Comprehensive repair services for all household needs'),
        ('maintenance', 'Regular maintenance services to keep your home in perfect condition')
    ]
    
    for service_name, description in default_services:
        category, created = ServiceCategory.objects.get_or_create(
            name=service_name.capitalize(),
            defaults={'description': description, 'icon': 'fas fa-tools'}
        )
        if created:
            print(f"Created service category: {category.name}")
        else:
            print(f"Service category exists: {category.name}")
    
    print(f"Total service categories: {ServiceCategory.objects.count()}")
    return ServiceCategory.objects.all()

def test_provider_registration_api():
    """Test the provider registration API endpoint"""
    print("\nTesting provider registration API...")
    
    # Test registration data
    registration_data = {
        "username": "testprovider@example.com",
        "email": "testprovider@example.com",
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "John",
        "last_name": "Provider",
        "user_type": "provider",
        "phone_number": "123-456-7890",
        "address": "123 Test St",
        "business_name": "John's Plumbing Services",
        "services": ["plumbing", "general"],
        "location": "Test City, State",
        "experience": 5
    }
    
    try:
        response = requests.post(
            'http://127.0.0.1:8000/api/auth/users/register/',
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Provider registration successful!")
            return True
        else:
            print("❌ Provider registration failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing registration: {e}")
        return False

def test_provider_profile_creation():
    """Test if provider profile was created correctly"""
    print("\nTesting provider profile creation...")
    
    try:
        # Check if test user was created
        user = User.objects.filter(username='testprovider@example.com').first()
        if not user:
            print("❌ Test user not found")
            return False
            
        print(f"✅ User found: {user.get_full_name()} ({user.user_type})")
        
        # Check if provider profile was created
        provider = ServiceProvider.objects.filter(user=user).first()
        if not provider:
            print("❌ Provider profile not found")
            return False
            
        print(f"✅ Provider profile found: {provider.business_name}")
        print(f"   - Categories: {[cat.name for cat in provider.categories.all()]}")
        print(f"   - Experience: {provider.experience_years} years")
        print(f"   - Service Area: {provider.service_area}")
        print(f"   - Validation Status: {provider.validation_status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking provider profile: {e}")
        return False

def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    try:
        # Delete test user and associated provider profile
        user = User.objects.filter(username='testprovider@example.com').first()
        if user:
            print(f"Deleting test user: {user.username}")
            user.delete()
            print("✅ Test data cleaned up")
        else:
            print("No test data to clean up")
    except Exception as e:
        print(f"❌ Error cleaning up: {e}")

if __name__ == "__main__":
    print("=== FixMate Provider Registration Test ===\n")
    
    # Test service categories
    categories = test_service_categories()
    
    # Test provider registration
    registration_success = test_provider_registration_api()
    
    if registration_success:
        # Test provider profile creation
        profile_success = test_provider_profile_creation()
        
        if profile_success:
            print("\n🎉 All tests passed! Provider registration is working correctly.")
        else:
            print("\n❌ Provider profile creation failed.")
    else:
        print("\n❌ Provider registration failed.")
    
    # Clean up test data
    cleanup_test_data()
    
    print("\n=== Test Complete ===")
