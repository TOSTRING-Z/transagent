# Django 聊天API后端

## 项目概述
这是一个基于Django的聊天数据收集API后端，主要功能包括：
- 接收并存储聊天数据
- 数据加密传输
- 使用SQLite数据库

## 安装步骤
1. 确保已安装Python 3.8+和pip
2. 安装依赖：
```bash
pip install django
```
3. 迁移数据库：
```bash
python manage.py migrate
```

## API文档
### 数据收集端点
- URL: `/data/collection`
- 方法: POST
- 请求示例:
```json
{
  "chat_id": 123,
  "message_id": 456,
  "user_message": "用户消息内容",
  "agent_messages": [
    {"memory_id": 1, "role": "user", "content": "测试内容"}
  ]
}
```

## 运行项目
```bash
python manage.py runserver 0.0.0.0:8003
```

## 线上部署
### 1. 服务器准备
```bash
sudo apt update
sudo apt install python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx
```

### 2. 创建虚拟环境
```bash
python3 -m venv myenv
source myenv/bin/activate
pip install django gunicorn psycopg2-binary
```

### 3. 配置PostgreSQL
```sql
CREATE DATABASE myproject;
CREATE USER myprojectuser WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE myproject TO myprojectuser;
```

### 4. 配置Gunicorn
创建服务文件 `/etc/systemd/system/transagent_web_gunicorn.service`:
```ini
[Unit]
Description=transagent_web gunicorn daemon
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/mnt/data/web/transagent_web
ExecStart=/usr/bin/gunicorn --access-logfile - --workers 3 --bind unix:/run/transagent_web_gunicorn.sock backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
daemon-reload
systemctl start transagent_web_gunicorn
systemctl status transagent_web_gunicorn
```


### 5. 配置Nginx
创建配置文件 `/etc/nginx/sites-available/myproject`:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    location /static/ {
        root /mnt/data/web/transagent_web;
    }

    location /transagent_web/ {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        rewrite ^/transagent_web(/.*)$ $1 break;
        proxy_pass http://unix:/run/transagent_web_gunicorn.sock;
    }
}
```

## 测试
运行单元测试：
```bash
python manage.py test chat
```

```bash
curl -X POST http://www.licpathway.net/transagent_web/data/collection \
-H "Content-Type: application/json" \
-d '{"chat_id":1, "message_id":1, "user_message":"test", "agent_messages":[{"memory_id":1, "role":"user", "content":"test"}]}'
```

```javascript
fetch('http://www.licpathway.net/transagent_web/data/collection', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chat_id: 1,
    message_id: 1,
    user_message: "test",
    agent_messages: [{
      memory_id: 1,
      role: "user",
      content: "test"
    }]
  })
}).then(response => console.log(response.json())).catch(error => console.error('Error:', console.log(error)));
```

## 项目结构
```
backend/
├── manage.py
├── backend/
│   ├── settings.py
│   ├── urls.py
│   └── __init__.py
└── chat/
    ├── migrations/
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── tests.py
    ├── urls.py
    └── views.py
```

## 上传服务器
rsync -avzL --progress web/ root@43.154.116.191:/mnt/data/web/transagent_web/

## 下载sqllite
rsync -avzL --progress root@43.154.116.191:/mnt/data/web/transagent_web/db.sqlite3 web/