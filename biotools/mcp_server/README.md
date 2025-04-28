# docker Environment

[docker](https://www.anaconda.com/docs/tools/working-with-conda/applications/docker#docker)
[mcp-fetch](https://github.com/modelcontextprotocol/servers/blob/main/src/fetch/Dockerfile)

```bash
# Build (using Clash proxy)
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

# Build (without proxy)
docker build -t biotools:latest .

# Save image
docker save -o biotools.tar biotools:latest

# Load image
docker load -i biotools.tar
```

## TransAgent Visual Terminal Startup (Recommended method)

### Download basic environment data

[OSF](https://osf.io/dbfne/files/osfstorage)

### Start docker container

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-p 3002:22 \
-v /data/zgr/transagent/biotools/analysis/case1/tmp:/tmp \
-v /data/zgr/transagent/biotools/data:/data \
-v /data/zgr/transagent/biotools/mcp_server/server_transagent.py:/app/server.py \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-p 3002:22 `
-v C:/Users/Administrator/Desktop/Document/transagent/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/transagent/biotools/data:/data `
-v C:/Users/Administrator/Desktop/Document/transagent/biotools/mcp_server/server_transagent.py:/app/server.py `
biotools
```

### Visual terminal configuration

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

### System information configuration

```bash
# View system information
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
  "extra_prompt": "/path/to/extra_prompt.md",
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

* tmpdir: Path to save running results (should match docker mapping path)
* language: Language used for LLM responses
```

## Third-party client startup method

### Start docker container

```bash
# linux
docker run -it --name biotools --rm \
-p 3001:3001 \
-v /data/zgr/transagent/biotools/tmp:/tmp \
-v /data/zgr/transagent/biotools/data:/data \
biotools

# window
docker run -it --name biotools --rm `
-p 3001:3001 `
-v C:/Users/Administrator/Desktop/Document/transagent/biotools/tmp:/tmp `
-v C:/Users/Administrator/Desktop/Document/transagent/biotools/data:/data `
biotools

# Test
docker exec -it biotools bash -i -c 'bedtools --help'
```

### MCP service configuration

config.json

```json
"mcp_server": {
  "biotools": {
    "url": "http://172.27.0.3:3001/sse",
    "enabled": true
  }
}
```

# MCP environment

[python-sdk](https://github.com/modelcontextprotocol/python-sdk)

```bash
# Installation
~/.local/bin/uv add "mcp[cli]"

# Environment

* linux
source mcp_server/.venv/bin/activate

* window
.\mcp_server\.venv\Scripts\activate

# Test
mcp dev mcp_server/server.py
```

# dev

```bash
npx @modelcontextprotocol/inspector
```
