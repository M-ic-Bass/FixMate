import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation_group_name = f'chat_{self.conversation_id}'
        
        # Check if user has permission to join this conversation
        if not await self.has_conversation_permission():
            await self.close()
            return
        
        # Join conversation group
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Mark messages as read when user connects
        await self.mark_messages_as_read()

    async def disconnect(self, close_code):
        # Leave conversation group
        await self.channel_layer.group_discard(
            self.conversation_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'chat_message':
            message = text_data_json['message']
            image_url = text_data_json.get('image_url', '')
            
            # Save message to database
            message_obj = await self.save_message(message, image_url)
            
            # Send message to conversation group
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'message_id': message_obj.id,
                    'sender': self.scope['user'].username,
                    'sender_id': self.scope['user'].id,
                    'sender_name': self.scope['user'].get_full_name(),
                    'image_url': image_url,
                    'timestamp': message_obj.created_at.isoformat(),
                }
            )
        
        elif message_type == 'mark_read':
            # Mark messages as read
            await self.mark_messages_as_read()
            
            # Notify other participants that messages were read
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'messages_read',
                    'reader_id': self.scope['user'].id,
                    'reader_name': self.scope['user'].get_full_name(),
                }
            )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'message_id': event['message_id'],
            'sender': event['sender'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'image_url': event['image_url'],
            'timestamp': event['timestamp'],
        }))

    async def messages_read(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'reader_id': event['reader_id'],
            'reader_name': event['reader_name'],
        }))

    @database_sync_to_async
    def has_conversation_permission(self):
        """Check if user has permission to access this conversation"""
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            user = self.scope['user']
            return conversation.customer == user or conversation.provider == user
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, message_content, image_url):
        """Save message to database"""
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.scope['user'],
            content=message_content,
            image=image_url if image_url else None
        )
        return message

    @database_sync_to_async
    def mark_messages_as_read(self):
        """Mark unread messages as read for current user"""
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            user = self.scope['user']
            
            # Mark messages from other participants as read
            unread_messages = Message.objects.filter(
                conversation=conversation,
                is_read=False
            ).exclude(sender=user)
            
            for message in unread_messages:
                message.is_read = True
                message.save()
                
                # Create read status record
                from .models import MessageReadStatus
                MessageReadStatus.objects.get_or_create(
                    message=message,
                    user=user
                )
        except Conversation.DoesNotExist:
            pass


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for real-time notifications"""
    
    async def connect(self):
        if self.scope['user'].is_anonymous:
            await self.close()
            return
        
        self.user_group_name = f'user_{self.scope["user"].id}'
        
        # Join user group for personal notifications
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # Handle incoming notifications if needed
        pass

    async def send_notification(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'title': event['title'],
            'message': event['message'],
            'notification_type': event['notification_type'],
            'data': event.get('data', {}),
            'timestamp': event['timestamp'],
        }))
