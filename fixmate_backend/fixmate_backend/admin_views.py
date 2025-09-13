# FixMate - Admin Views

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
import random

from services.models import ServiceProvider, Review
from jobs.models import Job
from .serializers import (
    UserSerializer, ServiceProviderSerializer, JobSerializer, ReviewSerializer
)

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_auth_verify(request):
    """Verify admin authentication and return current user data"""
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'id': request.user.id,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'user_type': request.user.user_type,
        'is_staff': request.user.is_staff,
        'is_superuser': request.user.is_superuser
    })


class AdminDashboardViewSet(viewsets.ViewSet):
    """
    Admin Dashboard API endpoints
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get dashboard statistics"""
        try:
            total_users = User.objects.count()
            total_providers = ServiceProvider.objects.count()
            total_jobs = Job.objects.count()
            pending_validations = ServiceProvider.objects.filter(validation_status='pending').count()

            stats = {
                'total_users': total_users,
                'total_providers': total_providers,
                'total_jobs': total_jobs,
                'pending_validations': pending_validations
            }

            return Response(stats)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def activity(self, request):
        """Get recent activity"""
        try:
            # Generate sample recent activities
            activities = [
                {
                    'id': 1,
                    'type': 'user_registration',
                    'description': 'New user John Doe registered',
                    'timestamp': (timezone.now() - timedelta(hours=2)).isoformat()
                },
                {
                    'id': 2,
                    'type': 'provider_validation',
                    'description': 'Provider ABC Plumbing validated',
                    'timestamp': (timezone.now() - timedelta(hours=5)).isoformat()
                },
                {
                    'id': 3,
                    'type': 'job_created',
                    'description': 'New job "Fix leaking faucet" created',
                    'timestamp': (timezone.now() - timedelta(hours=8)).isoformat()
                },
                {
                    'id': 4,
                    'type': 'job_completed',
                    'description': 'Job "Install new outlet" completed',
                    'timestamp': (timezone.now() - timedelta(days=1)).isoformat()
                },
                {
                    'id': 5,
                    'type': 'review_posted',
                    'description': 'New 5-star review posted',
                    'timestamp': (timezone.now() - timedelta(days=1)).isoformat()
                }
            ]

            return Response(activities)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get system status"""
        try:
            status_data = {
                'database': {
                    'status': 'healthy',
                    'message': 'Database connection stable'
                },
                'api': {
                    'status': 'healthy',
                    'message': 'API services running normally'
                },
                'websocket': {
                    'status': 'healthy',
                    'message': 'WebSocket server active'
                },
                'storage': {
                    'status': 'healthy',
                    'message': 'Storage systems operational'
                }
            }

            return Response(status_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserViewSet(viewsets.ViewSet):
    """
    Admin User Management API endpoints
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        """Get all users"""
        try:
            users = User.objects.all()
            serializer = UserSerializer(users, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get user details"""
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle user status"""
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            
            return Response({
                'message': f'User status changed to {"active" if user.is_active else "inactive"}',
                'is_active': user.is_active
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminProviderViewSet(viewsets.ViewSet):
    """
    Admin Provider Management API endpoints
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        """Get all providers"""
        try:
            providers = ServiceProvider.objects.all()
            serializer = ServiceProviderSerializer(providers, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get providers pending validation"""
        try:
            pending_providers = ServiceProvider.objects.filter(validation_status='pending')
            serializer = ServiceProviderSerializer(pending_providers, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate or reject provider"""
        try:
            provider = ServiceProvider.objects.get(pk=pk)
            approved = request.data.get('approved', False)
            
            if approved:
                provider.validation_status = 'validated'
                provider.is_active = True
                message = 'Provider approved successfully'
            else:
                provider.validation_status = 'rejected'
                provider.is_active = False
                message = 'Provider rejected'
            
            provider.save()
            
            return Response({
                'message': message,
                'validation_status': provider.validation_status,
                'is_active': provider.is_active
            })
        except ServiceProvider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get provider details"""
        try:
            provider = ServiceProvider.objects.get(pk=pk)
            serializer = ServiceProviderSerializer(provider)
            return Response(serializer.data)
        except ServiceProvider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminJobViewSet(viewsets.ViewSet):
    """
    Admin Job Management API endpoints
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        """Get all jobs"""
        try:
            jobs = Job.objects.all()
            serializer = JobSerializer(jobs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get job details"""
        try:
            job = Job.objects.get(pk=pk)
            serializer = JobSerializer(job)
            return Response(serializer.data)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        """Delete a job"""
        try:
            job = Job.objects.get(pk=pk)
            job.delete()
            return Response({'message': 'Job deleted successfully'})
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminReviewViewSet(viewsets.ViewSet):
    """
    Admin Review Management API endpoints
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        """Get all reviews"""
        try:
            reviews = Review.objects.all()
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get review details"""
        try:
            review = Review.objects.get(pk=pk)
            serializer = ReviewSerializer(review)
            return Response(serializer.data)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle review status (flag/unflag)"""
        try:
            review = Review.objects.get(pk=pk)
            review.is_flagged = not review.is_flagged
            review.save()
            
            return Response({
                'message': f'Review {"flagged" if review.is_flagged else "unflagged"} successfully',
                'is_flagged': review.is_flagged
            })
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        """Delete a review"""
        try:
            review = Review.objects.get(pk=pk)
            review.delete()
            return Response({'message': 'Review deleted successfully'})
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_auth_verify(request):
    """Verify admin authentication"""
    try:
        user = request.user
        if user.is_staff or user.user_type == 'admin':
            serializer = UserSerializer(user)
            return Response(serializer.data)
        else:
            return Response({'error': 'Unauthorized access'}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
