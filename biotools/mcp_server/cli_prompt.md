当前工具可以用于复杂的生物信息分析流程，包括复杂的数据分析，绘图和系统级别指令调用。已经安装的软件如下：
- homer: 用于ChIP-seq和motif分析的软件
    输入: input.bed
    输出: output_dir
    例子: findMotifsGenome.pl input.bed hg38 output_dir -size 200 -mask
- chipseeker: 用于ChIP-seq数据的注释
    输入: input.bed
    输出: output_dir
    例子: mkdir -p output_dir && Rscript -e 'library(ChIPseeker); peakAnno <- annotatePeak("input.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg38.knownGene); write.csv(peakAnno@annoStat,"output_dir/ChIPseeker_annoStat.csv")'
- ucsc-liftover: 用于基因组坐标转换
    输入: input.bed
    输出: output.bed,unmapped.bed
    例子: liftOver input.bed /data/bam2bw/hg19ToHg38.over.chain.gz output.bed unmapped.bed
- BETA: Find Target Genes with only binding data: regulatiry potential score
    输入: input.bed
    输出: output_dir
    例子: awk '{print $1"\t"$2"\t"$3}' input.bed > BETA_input.bed && BETA minus -p BETA_input.bed -g hg38 -n BETA_targets -o output_dir
- fastqc: 用于测序数据的质量控制
    输入: read1.fastq,read2.fastq(双端测序需要)
    输出: output_dir
    例子: fastqc read1.fastq read2.fastq -o output_dir
- trim_galore: 用于测序数据的适配器修剪
    输入: read1.fastq,read2.fastq(双端测序需要)
    输出: output_dir
    例子: trim_galore -q 20 --phred33 --stringency 3 --length 20 -e 0.1 --paired --gzip read1.fastq read2.fastq -o output_dir
- bowtie2: 用于序列比对
    输入: read1.fastq,read2.fastq(双端测序需要)
    输出: 
    例子: bowtie2 --threads 16 -k 1 \
-x $ref_genome \
-1 analysis/fastqc/"$fasta_name"_R1_val_1.fq.gz \
-2 analysis/fastqc/"$fasta_name"_R2_val_2.fq.gz | \
samtools view -F 4 -bS | \
samtools sort --threads 16 -o analysis/BAM/"$fasta_name"_sorted.bam
- picard: 用于处理高通量测序数据的软件
    输入:
    输出:
    例子: picard MarkDuplicates I=input.bam O=marked_duplicates.bam M=metrics.txt
- macs2: 用于ChIP-seq峰值检测
    输入:
    输出:
    例子: macs2 callpeak -t ChIP.bam -c Control.bam -f BAM -g hs -n output_prefix
- deeptools: 用于高通量测序数据的可视化
    输入:
    输出:
    例子: computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R input.bed -S input.bw -out matrix.gz && plotProfile -m matrix.gz --plotTitle "final profile" --plotFileFormat svg -out output.svg
- pandas: 用于数据分析和操作
    输入:
    输出:
    例子: python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'
- seaborn: 用于数据可视化
    输入:
    输出:
    例子: python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'
