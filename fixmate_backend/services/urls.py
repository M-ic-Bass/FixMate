from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ServiceCategoryViewSet)
router.register(r'providers', views.ServiceProviderViewSet)
router.register(r'providers/(?P<provider_pk>\d+)/reviews', views.ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
]