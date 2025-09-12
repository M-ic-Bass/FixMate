from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, JobApplicationViewSet, JobUpdateViewSet

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'applications', JobApplicationViewSet, basename='jobapplication')
router.register(r'updates', JobUpdateViewSet, basename='jobupdate')

urlpatterns = [
    path('', include(router.urls)),
]
