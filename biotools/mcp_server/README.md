# docker环境 

[docker](https://www.anaconda.com/docs/tools/working-with-conda/applications/docker#docker)
[mcp-fetch](https://github.com/modelcontextprotocol/servers/blob/main/src/fetch/Dockerfile)

```bash
# 构建 (使用代理Clash)
docker build \
  --add-host=host.docker.internal:host-gateway \
  --build-arg HTTP_PROXY=http://host.docker.internal:7890 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:7890 \
  -t biotools:latest .

# 构建 (无代理)
docker build -t biotools:latest .

# 打包
docker save -o biotools.tar biotools:latest

# 加载
docker load -i biotools.tar
```

## BixChat可视化虚拟终端启动方式

- 启动docker容器

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-v /mnt/ubuntu_zgr/install/bixchat/biotools/tmp:/tmp \
-v /mnt/ubuntu_zgr/install/bixchat/biotools/data:/data \
-v /mnt/ubuntu_zgr/install/bixchat/biotools/mcp_server/server_bixchat.py:/app/server.py \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/data:/data `
-v /C:/Users/Administrator/Desktop/Document/bixchat/biotools/mcp_server/server_bixchat.py:/app/server.py `
biotools

# 测试
docker exec biotools bash -c '. /opt/conda/etc/profile.d/conda.sh && conda activate' && bedtools --help
```

- 可视化终端配置

config.json

```json
"plugins": {
  "cli_execute": {
    "params": {
      "bash": "docker exec biotools bash -c '. /opt/conda/etc/profile.d/conda.sh && conda activate && {code}'",
      "delay_time": 5,
      "threshold": 10000,
      "cli_prompt": "/path/to/biotools/mcp_server/cli_prompt.md"
    },
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

## 第三方客户端启动方式
- 启动docker容器

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-v /mnt/ubuntu_zgr/install/bixchat/biotools/tmp:/tmp \
-v /mnt/ubuntu_zgr/install/bixchat/biotools/data:/data \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/bixchat/biotools/data:/data `
biotools

# 测试
docker exec biotools bash -c '. /opt/conda/etc/profile.d/conda.sh && conda activate' && bedtools --help
```

## MCP服务配置

config.json

```json
"mcp_server": {
  "biotools": {
    "url": "http://172.27.0.3:3001/sse",
    "enabled": true
  }
}
```

# MCP环境

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