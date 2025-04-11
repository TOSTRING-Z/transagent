FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS uv

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

ADD pyproject.toml /app/pyproject.toml
ADD uv.lock /app/uv.lock

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

FROM continuumio/miniconda3 AS conda

USER root

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

RUN bash /opt/conda/etc/profile.d/conda.sh
RUN conda install -y bioconda::bedtools
RUN conda install -y bioconda::homer
RUN conda install -y conda-forge::r-base
RUN conda install -y bioconda::deeptools
RUN conda install -y bioconda::bioconductor-chipseeker
RUN conda install -y bioconda::ucsc-liftover
RUN conda create -y -n beta_chip python=2.7.15
RUN conda install -y -n beta_chip bioconda::cistrome_beta
RUN conda install -y bioconda::fastqc
RUN conda install -y grst::trim_galore
RUN conda install -y bioconda::bowtie2
RUN conda install -y bioconda::picard
RUN conda install -y -n beta_chip bioconda::macs2
RUN conda install -y conda-forge::pandas
RUN conda install -y conda-forge::seaborn
RUN conda install -y bioconda::bioconductor-org.hs.eg.db
RUN conda install -y bioconda::bioconductor-txdb.hsapiens.ucsc.hg38.knowngene

FROM python:3.12-slim-bookworm

# 安装SSH服务
RUN apt-get update && apt-get install -y openssh-server && \
    mkdir /var/run/sshd && \
    echo 'root:password' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    rm -rf /var/lib/apt/lists/*

COPY --from=conda /opt/conda /opt/conda
COPY --from=uv /app/.venv /app/.venv
ADD server.py /app/server.py
ADD .bashrc /root/.bashrc

ENV PATH="/app/.venv/bin:$PATH"

ADD homer_config.txt /opt/conda/share/homer/config.txt

# https://reg-gen.readthedocs.io/en/latest/rgt/introduction.html

LABEL org.opencontainers.image.title="biotools"

# 暴露端口
EXPOSE 22 3001

ENTRYPOINT . /opt/conda/etc/profile.d/conda.sh && conda activate && service ssh start && /app/.venv/bin/python /app/server.py
   