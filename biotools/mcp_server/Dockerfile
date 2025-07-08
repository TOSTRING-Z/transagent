FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS uv

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

RUN --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --no-install-project --no-dev --no-editable

FROM python:3.12-slim-bookworm

# 安装SSH服务
RUN apt-get update && apt-get install -y openssh-server && \
    mkdir /var/run/sshd && \
    echo 'root:password' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    rm -rf /var/lib/apt/lists/*

COPY --from=uv /app/.venv /app/.venv
ADD server.py /app/server.py
ADD bashrc /root/.bashrc

ENV PATH="/app/.venv/bin:$PATH"

ADD homer_config.txt /opt/conda/share/homer/config.txt
ADD setup_env.sh /root/setup_env.sh

LABEL org.opencontainers.image.title="biotools"

EXPOSE 22 3001

ENTRYPOINT ["/bin/bash","/root/setup_env.sh"]
   