from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from .models import Conversation
from conn import Mysql
import json
import re

mysql = Mysql()


@csrf_exempt
@require_POST
def collection(request):
    try:
        data = json.loads(request.body)
        data = {
            "chat_id": data.get("chat_id"),
            "message_id": data.get("message_id"),
            "user_message": data.get("user_message"),
            "agent_messages": data.get("agent_messages"),
        }

        # Check if conversation with chat_id exists
        existing_conversation = Conversation.objects.filter(
            chat_id=data["chat_id"], message_id=data["message_id"]
        ).first()
        if existing_conversation:
            # Update existing conversation
            for key, value in data.items():
                setattr(existing_conversation, key, value)
            existing_conversation.save()
            conversation = existing_conversation
        else:
            # Create new conversation
            conversation = Conversation.objects.create(**data)

        return JsonResponse({"status": "success", "id": conversation.id})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_GET
def query_mysql(request):
    """
    执行安全的SQL查询
    仅允许SELECT查询，禁止其他操作
    """
    try:
        sql = request.GET.get("sql", "").strip()

        # 安全校验：只允许SELECT查询
        if not re.match(r"^\s*SELECT\s", sql, re.IGNORECASE):
            raise ValueError("只允许执行SELECT查询")

        # 创建MySQL连接
        mysql_conn = mysql.connect()

        # 执行查询
        with mysql_conn.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
            columns = list(rows[0].keys()) if rows else []

        mysql_conn.close()

        # 格式化结果
        result = {"columns": columns, "data": rows, "count": len(rows)}

        return JsonResponse({"status": "success", "result": result})

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)
