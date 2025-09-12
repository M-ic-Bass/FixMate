"""
URL configuration for fixmate_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import HttpResponse
import os

def serve_frontend(request, path=''):
    """Serve the frontend HTML files"""
    if not path:
        path = 'index.html'
    
    # Path to the frontend files (one level up from backend)
    frontend_root = os.path.join(os.path.dirname(settings.BASE_DIR))
    file_path = os.path.join(frontend_root, path)
    
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Set appropriate content type
        if path.endswith('.html'):
            content_type = 'text/html'
        elif path.endswith('.css'):
            content_type = 'text/css'
        elif path.endswith('.js'):
            content_type = 'application/javascript'
        else:
            content_type = 'text/plain'
            
        return HttpResponse(content, content_type=content_type)
    else:
        return HttpResponse('File not found', status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/services/', include('services.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/chat/', include('chat.urls')),
    path('<path:path>', serve_frontend, name='frontend'),
    path('', serve_frontend, name='home'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)