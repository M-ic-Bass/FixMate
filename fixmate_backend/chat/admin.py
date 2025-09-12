from django.contrib import admin
from .models import Conversation, Message, MessageReadStatus

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('job', 'customer', 'provider', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('job__title', 'customer__username', 'provider__username')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'sender', 'content_preview', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('content', 'sender__username')
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = "Content"

@admin.register(MessageReadStatus)
class MessageReadStatusAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'read_at')
    list_filter = ('read_at',)
    search_fields = ('user__username',)
