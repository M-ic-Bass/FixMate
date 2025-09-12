from django.db import models
from django.contrib.auth import get_user_model
from jobs.models import Job

User = get_user_model()

class Conversation(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='conversation')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_conversations')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='provider_conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['job', 'customer', 'provider']

    def __str__(self):
        return f"Conversation for {self.job.title}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    image = models.ImageField(upload_to='chat_images/', blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation.job.title}"

class MessageReadStatus(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_status')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['message', 'user']

    def __str__(self):
        return f"{self.user.username} read message at {self.read_at}"