from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Job, JobImage, JobApplication, JobUpdate
from .serializers import JobSerializer, JobImageSerializer, JobApplicationSerializer, JobUpdateSerializer

class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.user_type == 'customer':
            return Job.objects.filter(customer=self.request.user)
        elif self.request.user.user_type == 'provider':
            return Job.objects.filter(status__in=['open', 'in_progress'])
        return Job.objects.all()

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        job = self.get_object()
        if request.user.user_type != 'provider':
            return Response({'error': 'Only providers can apply to jobs'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        application, created = JobApplication.objects.get_or_create(
            job=job, 
            provider=request.user,
            defaults={'proposal': request.data.get('proposal', '')}
        )
        
        if not created:
            return Response({'error': 'Already applied to this job'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = JobApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(job__customer=self.request.user)

class JobUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = JobUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobUpdate.objects.filter(job__customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)