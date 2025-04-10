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

FROM python:3.12-slim-bookworm

COPY --from=conda /opt/conda /opt/conda
COPY --from=uv /app/.venv /app/.venv
ADD server.py /app/server.py
ADD .bashrc /root/.bashrc

ENV PATH="/app/.venv/bin:$PATH"

ADD homer_config.txt /opt/conda/share/homer/config.txt

# https://reg-gen.readthedocs.io/en/latest/rgt/introduction.html

LABEL org.opencontainers.image.title="biotools"

ENTRYPOINT . /opt/conda/etc/profile.d/conda.sh && conda activate && /app/.venv/bin/python /app/server.py
