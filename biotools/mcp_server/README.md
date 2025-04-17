# docker 环境

[docker](https://www.anaconda.com/docs/tools/working-with-conda/applications/docker#docker)
[mcp-fetch](https://github.com/modelcontextprotocol/servers/blob/main/src/fetch/Dockerfile)

```bash
# 构建 (使用代理Clash)
* linux
docker build \
  --add-host=host.docker.internal:host-gateway \
  --build-arg HTTP_PROXY=http://host.docker.internal:7890 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:7890 \
  -t biotools:latest .

* windows
docker build `
  --add-host=host.docker.internal:host-gateway `
  --build-arg HTTP_PROXY=http://host.docker.internal:7890 `
  --build-arg HTTPS_PROXY=http://host.docker.internal:7890 `
  -t biotools:latest .

# 构建 (无代理)
docker build -t biotools:latest .

# 打包
docker save -o biotools.tar biotools:latest

# 加载
docker load -i biotools.tar
```

## BixChat 可视化虚拟终端启动方式 (推荐方式)

### data 基础环境数据下载

[data](http://www.data.com)

### 启动 docker 容器

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-p 3002:22 \
-v /data/zgr/bixchat/biotools/tmp:/tmp \
-v /data/zgr/bixchat/biotools/data:/data \
-v /data/zgr/bixchat/biotools/mcp_server/server_bixchat.py:/app/server.py \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-p 3002:22 `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/data:/data `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/mcp_server/server_bixchat.py:/app/server.py `
biotools
```

### 可视化终端配置

config.json

```json
"plugins": {
  "cli_execute": {
    "params": {
      "cli_prompt": "/path/to/cli_prompt.md",
      "bashrc": "/root/.bashrc",
      "delay_time": 5,
      "threshold": 10000
    },
    "enabled": true
  },
  "display_file": {
    "enabled": true
  }
},
"mcp_server": {
  "biotools": {
    "url": "http://172.27.0.3:3001/sse",
    "enabled": true
  }
}
```

### 系统信息配置

```bash
# 查看系统信息
echo -n '{
  "system_type": "linux",
  "system_platform": "'$( (lsb_release -si 2>/dev/null || grep -E '^ID=' /etc/os-release | cut -d= -f2) | tr '[:upper:]' '[:lower:]')$((lsb_release -sr 2>/dev/null || grep -E '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"') | cut -d. -f1)'",
  "system_arch": "'$(uname -m | sed 's/aarch64/arm64/;s/x86_64/amd64/')'"
}' | jq -c . 2>/dev/null || cat
```

config.json

```json
"tool_call": {
  "memory_length": 20,
  "mcp_timeout": 6000,
  "extra_prompt": "{resourcesPath}/resources/system_prompts/prompt.md",
  "tmpdir": "/tmp",
  "language": "english",
  "system_type": "linux",
  "system_platform": "debian12",
  "system_arch": "x86_64",
  "ssh_config": {
    "host": "172.0.0.1",
    "port": 3002,
    "username": "root",
    "password": "password"
  },
  "llm_parmas": {
    "max_tokens": 4000,
    "temperature": 0.5,
    "stream": true,
    "response_format": {
      "type": "json_object"
    }
  }
}

* tmpdir: 运行结果保存的路径（请和docker映射路径保存一致）
* language: 大模型回答使用的语言
```

## 第三方客户端启动方式

### 启动 docker 容器

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-v /data/zgr/bixchat/biotools/tmp:/tmp \
-v /data/zgr/bixchat/biotools/data:/data \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/data:/data `
biotools

# 测试
docker exec -it biotools bash -i -c 'bedtools --help'
```

### MCP 服务配置

config.json

```json
"mcp_server": {
  "biotools": {
    "url": "http://172.27.0.3:3001/sse",
    "enabled": true
  }
}
```

# MCP 环境

[python-sdk](https://github.com/modelcontextprotocol/python-sdk)

```bash
# 安装
~/.local/bin/uv add "mcp[cli]"

# 环境

* linux
source mcp_server/.venv/bin/activate

* window
.\mcp_server\.venv\Scripts\activate

# 测试
mcp dev mcp_server/server.py
```

# dev

```bash
npx @modelcontextprotocol/inspector
```
