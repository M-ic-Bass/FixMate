from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, Message, MessageReadStatus
from .serializers import ConversationSerializer, MessageSerializer, MessageReadStatusSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(customer=user) | Conversation.objects.filter(provider=user)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=request.data.get('content')
        )
        serializer = MessageSerializer(message)
        return Response(serializer.data)

class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Message.objects.filter(conversation__customer=self.request.user) | \
               Message.objects.filter(conversation__provider=self.request.user)