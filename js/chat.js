class ChatManager {
    constructor() {
        this.currentConversation = null;
        this.websocket = null;
        this.notificationSocket = null;
        this.currentUser = null;
        this.conversations = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }

    async init() {
        // Check if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '../auth.html';
            return;
        }

        // Get current user info
        await this.getCurrentUser();
        
        // Initialize UI elements
        this.initUI();
        
        // Check if provider parameter is in URL
        const urlParams = new URLSearchParams(window.location.search);
        const providerId = urlParams.get('provider');
        
        if (providerId && this.currentUser.user_type === 'customer') {
            // Start conversation with provider
            await this.startConversationWithProvider(providerId);
        }
        
        // Load conversations
        await this.loadConversations();
        
        // Initialize notification WebSocket
        this.initNotificationSocket();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/users/profile/', {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
            } else {
                window.location.href = '../auth.html';
            }
        } catch (error) {
            console.error('Error getting user info:', error);
            window.location.href = '../auth.html';
        }
    }

    initUI() {
        this.conversationList = document.getElementById('conversation-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatTitle = document.getElementById('chat-title');
        this.chatStatus = document.getElementById('chat-status');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.chatInputContainer = document.getElementById('chat-input-container');
        this.attachBtn = document.getElementById('attach-btn');
        this.imageInput = document.getElementById('image-input');
        
        // Update status
        this.updateConnectionStatus('connecting');
    }

    setupEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        // Image attachment
        this.attachBtn.addEventListener('click', () => {
            this.imageInput.click();
        });

        this.imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('auth_token');
            window.location.href = '../auth.html';
        });
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/chat/conversations/', {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                this.conversations = await response.json();
                this.renderConversations();
            } else {
                console.error('Error loading conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations() {
        this.conversationList.innerHTML = '';
        
        this.conversations.forEach(conversation => {
            const conversationElement = this.createConversationElement(conversation);
            this.conversationList.appendChild(conversationElement);
        });
    }

    createConversationElement(conversation) {
        const template = document.getElementById('conversation-template');
        const element = template.content.cloneNode(true);
        
        const conversationItem = element.querySelector('.conversation-item');
        const nameElement = element.querySelector('.conversation-name');
        const timeElement = element.querySelector('.conversation-time');
        const previewElement = element.querySelector('.conversation-preview');
        
        // Determine other participant
        const otherParticipant = conversation.customer.id === this.currentUser.id 
            ? conversation.provider 
            : conversation.customer;
        
        nameElement.textContent = otherParticipant.business_name || otherParticipant.get_full_name || otherParticipant.username;
        timeElement.textContent = this.formatTime(conversation.updated_at);
        previewElement.textContent = conversation.job.title;
        
        conversationItem.addEventListener('click', () => {
            this.selectConversation(conversation);
        });
        
        return element;
    }

    selectConversation(conversation) {
        // Update active state
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        this.currentConversation = conversation;
        
        // Update UI
        const otherParticipant = conversation.customer.id === this.currentUser.id 
            ? conversation.provider 
            : conversation.customer;
        
        this.chatTitle.textContent = otherParticipant.business_name || otherParticipant.get_full_name || otherParticipant.username;
        this.chatInputContainer.style.display = 'block';
        
        // Clear messages and load history
        this.chatMessages.innerHTML = '';
        this.loadMessages(conversation.id);
        
        // Connect to WebSocket for this conversation
        this.connectToConversation(conversation.id);
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages/`, {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.renderMessages(messages);
            } else {
                console.error('Error loading messages');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        this.chatMessages.innerHTML = '';
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    createMessageElement(message) {
        const isOwnMessage = message.sender === this.currentUser.id;
        const template = document.getElementById(isOwnMessage ? 'own-message-template' : 'message-template');
        const element = template.content.cloneNode(true);
        
        const messageElement = element.querySelector('.message');
        const textElement = element.querySelector('.message-text');
        const timeElement = element.querySelector('.message-time');
        const imageContainer = element.querySelector('.message-image-container');
        const imageElement = element.querySelector('.message-image');
        
        if (!isOwnMessage) {
            const senderElement = element.querySelector('.message-sender');
            senderElement.textContent = message.sender_name;
        }
        
        textElement.textContent = message.content;
        timeElement.textContent = this.formatTime(message.created_at);
        
        if (message.image) {
            imageContainer.style.display = 'block';
            imageElement.src = message.image;
        }
        
        return element;
    }

    connectToConversation(conversationId) {
        // Close existing WebSocket connection
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Determine WebSocket protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat/${conversationId}/`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus('connected');
            this.reconnectAttempts = 0;
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus('disconnected');
            this.attemptReconnect(conversationId);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('disconnected');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'chat_message':
                this.handleNewMessage(data);
                break;
            case 'messages_read':
                this.handleMessagesRead(data);
                break;
        }
    }

    handleNewMessage(data) {
        // Add message to chat
        const messageElement = this.createMessageElement({
            content: data.message,
            created_at: data.timestamp,
            sender: data.sender_id,
            sender_name: data.sender_name,
            image: data.image_url,
            is_own: data.sender_id === this.currentUser.id
        });
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Mark as read if it's not our message
        if (data.sender_id !== this.currentUser.id) {
            this.markMessagesAsRead();
        }
    }

    handleMessagesRead(data) {
        // Update read status indicators
        console.log(`Messages read by ${data.reader_name}`);
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        const message = {
            type: 'chat_message',
            message: content,
            image_url: ''
        };
        
        this.websocket.send(JSON.stringify(message));
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
    }

    markMessagesAsRead() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'mark_read' }));
        }
    }

    async handleImageUpload(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch('/api/chat/upload-image/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                
                // Send message with image
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(JSON.stringify({
                        type: 'chat_message',
                        message: '',
                        image_url: data.image_url
                    }));
                }
            } else {
                console.error('Error uploading image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    initNotificationSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;
        
        this.notificationSocket = new WebSocket(wsUrl);
        
        this.notificationSocket.onopen = () => {
            console.log('Notification socket connected');
        };
        
        this.notificationSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleNotification(data);
        };
        
        this.notificationSocket.onclose = () => {
            console.log('Notification socket disconnected');
        };
    }

    handleNotification(data) {
        // Handle real-time notifications
        console.log('Notification received:', data);
        
        // Show notification popup
        this.showNotification(data);
        
        // Refresh conversations if needed
        if (data.notification_type === 'new_message') {
            this.loadConversations();
        }
    }

    showNotification(data) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification-popup';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${data.title}</h4>
                <p>${data.message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    attemptReconnect(conversationId) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connectToConversation(conversationId);
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    updateConnectionStatus(status) {
        const statusElement = this.chatStatus.querySelector('.status-indicator');
        const statusText = this.chatStatus.querySelector('span:last-child');
        
        statusElement.className = `status-indicator ${status}`;
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }
    
    async startConversationWithProvider(providerId) {
        try {
            const response = await fetch('/api/chat/conversations/start_conversation/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    provider_id: providerId
                })
            });
            
            if (response.ok) {
                const conversation = await response.json();
                // Load conversations to include the new one
                await this.loadConversations();
                // Open the new conversation
                this.openConversation(conversation.id);
            } else {
                const error = await response.json();
                alert(`Failed to start conversation: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            alert('Failed to start conversation. Please try again.');
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatManager();
});
