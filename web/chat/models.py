from django.db import models


class Conversation(models.Model):
    chat_id = models.CharField()
    message_id = models.IntegerField()
    user_message = models.TextField()
    agent_messages = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversations"
        indexes = [
            models.Index(fields=["chat_id"]),
            models.Index(fields=["message_id"]),
        ]
