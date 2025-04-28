

# conda build

```dockerfile
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
RUN conda install -y bioconda::bowtie2
RUN conda install -y bioconda::samtools
RUN conda install -y bioconda::picard
RUN conda install -y -n beta_chip bioconda::macs2
RUN conda install -y conda-forge::pandas
RUN conda install -y conda-forge::seaborn
RUN conda install -y bioconda::bioconductor-org.hs.eg.db
RUN conda install -y bioconda::bioconductor-txdb.hsapiens.ucsc.hg38.knowngene
RUN conda install -y bioconda::bioconductor-txdb.hsapiens.ucsc.hg38.knowngene
RUN conda create -y -n cutadapt python=3.7
RUN conda install -y -n cutadapt bioconda::cutadapt
RUN conda install -c bioconda ucsc-bedgraphtobigwig
RUN conda install -y -n cutadapt trapt
RUN conda install -y -n cutadapt bioconda::meme
RUN conda install -y -n cutadapt -c conda-forge -c bioconda rgt
RUN conda install -y -n cutadapt conda-forge::scipy
RUN conda install -y -n cutadapt bioconda::bioconductor-deseq2

RUN conda clean --all
```

# Export conda environment
```bash
docker cp my_conda_container:/opt/conda /path/to/data/conda
```