from rest_framework import serializers
from .models import Conversation, Message, MessageReadStatus

class ConversationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    
    class Meta:
        model = Conversation
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    
    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['sender', 'created_at']

class MessageReadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReadStatus
        fields = '__all__'
