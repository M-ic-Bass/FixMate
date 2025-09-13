# FixMate WebSocket Chat Integration

This document provides a comprehensive guide to the WebSocket chat functionality integrated into the FixMate platform.

## Overview

The FixMate platform now supports real-time chat functionality using Django Channels and WebSockets. This enables instant messaging between customers and service providers, creating a seamless communication experience.

## Features

### Real-Time Messaging
- Instant message delivery between users
- Real-time message status updates (sent, delivered, read)
- Automatic message synchronization across multiple devices

### WebSocket Architecture
- **Django Channels**: Handles WebSocket connections and real-time communication
- **Redis**: Channel layer backend for scalable WebSocket messaging
- **ASGI**: Asynchronous server gateway interface for handling concurrent connections

### Chat Features
- **Text Messaging**: Send and receive text messages in real-time
- **Image Sharing**: Upload and share images in conversations
- **Read Receipts**: Track when messages have been read by recipients
- **Conversation Management**: View and manage multiple conversations
- **User Authentication**: Secure WebSocket connections with token-based authentication

### Frontend Integration
- **Modern UI**: Clean, responsive chat interface
- **WebSocket Client**: JavaScript WebSocket implementation for real-time updates
- **Auto-reconnection**: Automatic reconnection with exponential backoff
- **Connection Status**: Visual indicators for connection status

## Technical Implementation

### Backend Components

#### 1. Django Channels Configuration
- **File**: `fixmate_backend/settings.py`
- **Changes**: Added Channels to INSTALLED_APPS, configured ASGI application and Redis channel layer

#### 2. ASGI Configuration
- **File**: `fixmate_backend/asgi.py`
- **Purpose**: Routes HTTP and WebSocket traffic to appropriate handlers
- **Features**: Authentication middleware, protocol routing

#### 3. WebSocket Consumers
- **File**: `fixmate_backend/chat/consumers.py`
- **Classes**:
  - `ChatConsumer`: Handles real-time chat messaging
  - `NotificationConsumer`: Handles real-time notifications

#### 4. WebSocket Routing
- **File**: `fixmate_backend/chat/routing.py`
- **Purpose**: Maps WebSocket URLs to consumer classes

#### 5. Image Upload Endpoint
- **File**: `fixmate_backend/chat/views.py`
- **Function**: `upload_chat_image()`
- **Features**: File validation, secure storage, URL generation

### Frontend Components

#### 1. Chat Interface
- **File**: `chat/chat.html`
- **Features**: Conversation list, message display, input area, templates

#### 2. Chat Styling
- **File**: `css/chat.css`
- **Features**: Responsive design, modern UI, status indicators

#### 3. Chat JavaScript
- **File**: `js/chat.js`
- **Class**: `ChatManager`
- **Features**: WebSocket management, message handling, UI updates

## Setup Instructions

### Prerequisites
- Python 3.8+
- Django 5.0.6
- Redis Server
- Node.js (for frontend development)

### Installation

#### 1. Install Dependencies
```bash
pip install -r fixmate_backend/requirements.txt
```

#### 2. Install and Start Redis
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Windows
# Download Redis for Windows from https://redis.io/download
# Start Redis server
```

#### 3. Configure Django Settings
Ensure the following settings are in `fixmate_backend/settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'channels',
]

ASGI_APPLICATION = 'fixmate_backend.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

#### 4. Run Database Migrations
```bash
cd fixmate_backend
python manage.py makemigrations
python manage.py migrate
```

#### 5. Start the Development Server
```bash
cd fixmate_backend
python manage.py runserver
```

### Testing the WebSocket Connection

#### Automated Testing
Run the test script:
```bash
python test_websocket.py
```

#### Manual Testing
1. Open two different browsers or browser profiles
2. Log in as different users (customer and service provider)
3. Navigate to the chat page
4. Start a conversation and send messages
5. Verify real-time message delivery and read receipts

## WebSocket Endpoints

### Chat WebSocket
- **URL**: `ws://localhost:8000/ws/chat/{conversation_id}/`
- **Purpose**: Real-time messaging for specific conversations
- **Authentication**: Token-based authentication required

### Notification WebSocket
- **URL**: `ws://localhost:8000/ws/notifications/`
- **Purpose**: Real-time notifications for users
- **Authentication**: Token-based authentication required

### API Endpoints
- **Conversations**: `/api/chat/conversations/`
- **Messages**: `/api/chat/conversations/{id}/messages/`
- **Image Upload**: `/api/chat/upload-image/`

## WebSocket Message Formats

### Sending Messages
```javascript
{
    "type": "chat_message",
    "message": "Hello, how are you?",
    "image_url": ""
}
```

### Receiving Messages
```javascript
{
    "type": "chat_message",
    "message": "I'm doing well, thank you!",
    "sender_id": 2,
    "sender_name": "John Doe",
    "timestamp": "2023-12-01T10:30:00Z",
    "image_url": ""
}
```

### Mark as Read
```javascript
{
    "type": "mark_read"
}
```

### Read Receipt
```javascript
{
    "type": "messages_read",
    "reader_id": 1,
    "reader_name": "Jane Smith",
    "timestamp": "2023-12-01T10:31:00Z"
}
```

## Security Considerations

### Authentication
- WebSocket connections require valid authentication tokens
- Anonymous connections are automatically rejected
- User permissions are validated for each conversation

### Data Validation
- Message content is sanitized and validated
- Image uploads are validated for file type and size
- File paths are secured to prevent directory traversal

### Rate Limiting
- Consider implementing rate limiting for WebSocket connections
- Monitor connection usage patterns

## Performance Optimization

### Redis Configuration
- Configure Redis for optimal performance in production
- Consider Redis clustering for high-traffic scenarios
- Monitor Redis memory usage

### Connection Management
- Implement connection pooling for WebSocket connections
- Set appropriate timeout values
- Monitor connection health

### Frontend Optimization
- Implement message pagination for large conversations
- Use efficient DOM updates for message rendering
- Implement lazy loading for conversation history

## Troubleshooting

### Common Issues

#### WebSocket Connection Fails
**Symptoms**: Connection refused, timeout errors
**Solutions**:
1. Ensure Redis server is running
2. Check Django server is running with ASGI
3. Verify WebSocket URL is correct
4. Check authentication token is valid

#### Messages Not Delivered in Real-Time
**Symptoms**: Messages appear only after page refresh
**Solutions**:
1. Check WebSocket connection status
2. Verify Redis is functioning properly
3. Check browser console for errors
4. Ensure consumer permissions are correct

#### Image Upload Fails
**Symptoms**: Error when uploading images
**Solutions**:
1. Check file size limits (max 5MB)
2. Verify file type is supported
3. Ensure media directory permissions
4. Check Django media settings

### Debug Commands

#### Check Redis Status
```bash
redis-cli ping
# Should return: PONG
```

#### Check Django Channels Status
```bash
cd fixmate_backend
python manage.py shell
>>> from channels.layers import get_channel_layer
>>> layer = get_channel_layer()
>>> print(layer)
```

#### Test WebSocket Connection
```bash
python test_websocket.py
```

## Production Deployment

### Server Configuration
- Use production-grade ASGI server (Daphne, Uvicorn)
- Configure SSL/TLS for WebSocket connections (wss://)
- Set up proper CORS headers for WebSocket connections

### Redis Configuration
- Use Redis with persistence for production
- Configure Redis authentication
- Set up Redis monitoring and alerting

### Load Balancing
- Configure load balancer to support WebSocket connections
- Use sticky sessions for WebSocket connections
- Monitor connection counts and performance

### Monitoring
- Monitor WebSocket connection counts
- Track message delivery times
- Set up alerts for connection failures
- Monitor Redis memory usage and performance

## Future Enhancements

### Planned Features
- **Message Reactions**: Add emoji reactions to messages
- **Typing Indicators**: Show when users are typing
- **Message Search**: Search through conversation history
- **File Sharing**: Support for document and file sharing
- **Voice Messages**: Support for voice message recording
- **Video Calls**: Integration for video calling

### Performance Improvements
- **Message Compression**: Compress large messages
- **Caching**: Cache conversation data
- **Database Optimization**: Optimize database queries for chat
- **CDN Integration**: Use CDN for media files

### Security Enhancements
- **End-to-End Encryption**: Implement message encryption
- **Message Expiration**: Auto-delete old messages
- **Content Moderation**: Add content filtering
- **Audit Logging**: Log all chat activities

## Support

For issues or questions regarding the WebSocket chat integration:
1. Check this documentation
2. Review the test script output
3. Check browser console for errors
4. Verify server logs for WebSocket-related errors
5. Contact the development team for assistance

---

**Note**: This WebSocket integration is designed to scale with your FixMate platform. Ensure proper monitoring and maintenance for optimal performance in production environments.
