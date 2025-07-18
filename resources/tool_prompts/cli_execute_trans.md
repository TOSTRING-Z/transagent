The current tool can be used for complex bioinformatics analysis workflows, including sophisticated data analysis, visualization, and system-level command execution. The following software is already installed:  

- **bed_preprocessing**: Deduplication, sorting, and merging overlapping regions  
  - Input: `input.bed`  
  - Output: `output.bed`  
  - Use: `sort -k1,1 -k2,2n input.bed | uniq | bedtools merge -i - > output.bed`  

- **bedtools**: Software for genomic region analysis  
  - Input: `a.bed`, `b.bed`  
  - Output: `output.bed`  
  - Use: `bedtools -a a.bed -b b.bed -wa -wb > output.bed`  

- **homer**: Software for ChIP-seq and motif analysis  
  - Input: `input.bed`  
  - Output: `output_dir`  
  - Use: `findMotifsGenome.pl input.bed hg38 output_dir -size 200 -mask`  

- **chipseeker**: Software for genome proportion analysis
  - Input: `input.bed`  
  - Output: `output_dir`  
  - Use: `mkdir -p output_dir && Rscript -e 'library(ChIPseeker);library(TxDb.Hsapiens.UCSC.hg38.knownGene); peakAnno <- annotatePeak("input.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg38.knownGene); write.csv(peakAnno@annoStat,"output_dir/ChIPseeker_annoStat.csv")'`  

- **BETA**: Find target genes with only binding data (regulatory potential score)  
  - Input: `input.bed`  
  - Output: `output_dir`  
  - Use: `awk '{print $1"\t"$2"\t"$3}' input.bed > BETA_input.bed && BETA minus -p BETA_input.bed -g hg38 -n BETA_targets -o output_dir`  

- **TRAPT**: Identify key transcriptional regulators for a set of genes in humans  
  - Input: `genes.txt` (a single column of gene names)  
  - Output: `top10_TR_detail.txt`  
  - Use: `head -n 200 genes.txt > top200_genes.txt && trapt --library /data/trapt/library --input top200_genes.txt --output output_dir && head -n 10 output_dir/TR_detail.txt > output_dir/top10_TR_detail.txt`  

- **fastqc**: Quality control for sequencing data  
  - Input: `read1.fastq`, `read2.fastq` (paired-end sequencing required)  
  - Output: `analysis/fastqc_dir`  
  - Use: `fastqc read1.fastq read2.fastq -o analysis/fastqc_dir`  

- **trim_galore**: Adapter trimming for sequencing data  
  - Input: `read1.fastq`, `read2.fastq` (paired-end sequencing required)  
  - Output: `trim_galore_dir`  
  - Use: `mkdir -p analysis/trim_galore_dir && trim_galore -q 20 --phred33 --stringency 3 --length 20 -e 0.1 --paired --gzip read1.fastq read2.fastq -o analysis/trim_galore_dir`  

- **bowtie2**: Sequence alignment  
  - Input: `read1_val_1.fq.gz`, `read2_val_2.fq.gz` (paired-end sequencing required)  
  - Output: `raw.bam`  
  - Use: `mkdir -p analysis/bam && bowtie2 --threads 16 -k 1 -x /data/rgtdata/hg38/genome_hg38 -1 analysis/trim_galore_dir/read1_val_1.fq.gz -2 analysis/trim_galore_dir/read2_val_2.fq.gz | samtools view -F 4 -bS | samtools sort --threads 16 -o analysis/bam/raw.bam`  

- **picard**: Remove PCR duplicates  
  - Input: `raw.bam`  
  - Output: `marked_duplicates.bam`  
  - Use: `picard MarkDuplicates I=analysis/bam/input.bam O=analysis/bam/marked_duplicates.bam M=metrics.txt && samtools index analysis/bam/marked_duplicates.bam analysis/bam/marked_duplicates.bam.bai`  

- **samtools**: Build BAM index  
  - Input: `marked_duplicates.bam`  
  - Output: `marked_duplicates.bam.bai`  
  - Use: `samtools index marked_duplicates.bam marked_duplicates.bam.bai`  

- **macs2**: Peak calling for ChIP-seq  
  - Input: `marked_duplicates.bam`, `control.bam` (optional reference)  
  - Output: `analysis/peak_dir`  
  - Use: `mkdir -p analysis/peak_dir && macs2 callpeak --shift -100 --extsize 200 --SPMR --nomodel -B -g hs -q 0.01 -t analysis/bam/marked_duplicates.bam -c control.bam -f BAM -g hs -n analysis/peak_dir`  

- **bamCoverage**: Convert BAM to bigWig  
  - Input: `marked_duplicates.bam`  
  - Output: `final.bw`  
  - Use: `mkdir -p analysis/bigwig && bamCoverage -b analysis/bam/marked_duplicates.bam --ignoreDuplicates --skipNonCoveredRegions --normalizeUsing RPKM --binSize 1 -p max -o analysis/bigwig/final.bw`  

- **bed2gff**: Convert BED to GFF  
  - Input: `peaks.narrowPeak`  
  - Output: `peaks.gff`  
  - Use: `bash /data/bed2gff/bed2gff.sh peaks.narrowPeak peaks.gff`  

- **ROSE**: A Python script that identifies super-enhancers and their target genes  
  - Input: `peaks.narrowPeak`, `marked_duplicates.bam`, `control.bam`  
  - Output: `output_dir`  
  - Use: `bash /data/bed2gff/bed2gff.sh peaks.narrowPeak peaks.gff && python2 /data/rose/ROSE_main.py -g HG38 -i peaks.gff -r marked_duplicates.bam -c control.bam -o output_dir -t 2000 && python2 ROSE_geneMapper.py -g HG38 -i output_dir/peaks_SuperEnhancers.table.txt -o output_dir`
  - Note: 
    - You cannot Use additional parameters other than those provided by use

- **CRCmapper**: A Python script that identifies Human Core Transcriptional Regulatory Circuitries
  - Input: `peaks_SuperEnhancers.table.txt`(Must be a super-enhancer table file), `marked_duplicates.bam`, `peaks.narrowPeak`, `output_dir`  
  - Output: `/path/to/output_dir/`  
  - Use: `python2 /data/crcmapper/CRCmapper.py -e peaks_SuperEnhancers.table.txt -b marked_duplicates.bam -g hg38 -f /data/homer/genomes/hg38/ -s peaks.narrowPeak -n sample_name -o /path/to/output_dir/`
  - Note: 
    - CRCmapper depends on `peaks_SuperEnhancers.table.txt` output by ROSE. Please ensure that this script is run after ROSE is successfully executed, otherwise, it is forbidden to run.

- **HINT_ATAC**: A Python script for Transcription factor footprint analysis  
  - Input: `peaks.narrowPeak`, `marked_duplicates.bam`  
  - Output: `output_dir`  
  - Use: `python3 /data/atac_seq/HINT_ATAC.py --peaks peaks.narrowPeak --bam marked_duplicates.bam --output-dir output_dir --organism hg38 --paired-end --threads 4`  

- **deeptools**: Visualization for high-throughput sequencing data  
  - Input: `region.bed`, `score.bw`
  - Output: `heatmap.pdf`, `profile.pdf`  
  - Use: `computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R region.bed -S input.bw -out matrix.gz && plotHeatmap -m matrix.gz --regionsLabel region --whatToShow 'heatmap and colorbar' --refPointLabel 0 --plotTitle title --plotFileFormat pdf -out heatmap.pdf && plotProfile -m matrix.gz --refPointLabel 0 --plotTitle title --plotFileFormat pdf -out profile.pdf`
  - Note:
    - `-S` can specify multiple `bw` files, and use `--samplesLabel` in `plotHeatmap` and `plotProfile` to set subtitles (e.g., `--samplesLabel label-1 label-2`).  
    - `-R` can specify multiple `bed` files, and use `--regionsLabel` in `plotHeatmap` and `plotProfile` to set subtitles (e.g., `--regionsLabel label-1 label-2`).  
    - `--perGroup`: The default is to plot all groups of regions by sample. Using this option instead plots all samples by group of regions. Note that this is only useful if you have multiple groups of regions. by sample rather than group.
    - `--colorMap`: Color map to use for the heatmap (e.g. –colorMap BrBG).
    - If a control group exists, please include it in the plotting as well.

- **ucsc-liftover**: Genome coordinate conversion  
  - Input: `input.bed`  
  - Output: `output.bed`, `unmapped.bed`  
  - Use: `liftOver input.bed /data/bam2bw/hg19ToHg38.over.chain.gz output.bed unmapped.bed`  

- **pathway_enrichment.R**: An R script for Pathway Enrichment Analysis
  - Input: genes.txt (tab-delimited with gene symbols in row names)
  - Output: `output_dir`
  - Use: `Rscript /data/enrichment/pathway_enrichment.R genes.txt output_dir 0.05`

- **diff_expression_analysis**: RNA-seq differential expression analysis  
  - Input: Expression matrix (`-e normalized_counts.tsv`), Sample metadata (`-s sample_metadata.tsv`)  
  - Output: `*_all_results.tsv`, `*_significant_genes.tsv`, `*_MA_plot.pdf`  
  - Use: `Rscript diff_expression_analysis.R -e normalized_counts.tsv -s sample_metadata.tsv -o results/HG_vs_LG -l 1.0 -p 0.01`
  - Note:
    - Expression matrix: Genes as rows, samples as columns
    - Sample info: Must contain `ID` and `Group` columns

- **pandas**: Data analysis and manipulation  
  - Use: `python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'`  

- **seaborn**: Data visualization  
  - Use: `python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'`  

Additional Notes:  
* Input for the above tools must be a single file—wildcards are not allowed.  
* Some tools may generate output files but return empty messages. If an empty response is observed, check whether output files have been 
generated.
* When an error occurs while running certain software, attempts should be made to resolve the issue and rerun it. Since there are strong dependencies between the inputs and outputs of various software, it is not allowed to directly skip the step where the error occurred. If an error is reported and multiple attempts fail to resolve it, user assistance should be sought.

Genome Fasta Files:
- hg38: 
  - bowtie2: `/data/rgtdata/hg38/genome_hg38`
  - CRCmapper: `/data/homer/genomes/hg38/`
- hg19:
  - bowtie2: `/data/rgtdata/hg38/genome_hg19`
  - CRCmapper: `/data/homer/genomes/hg19/`

Gene location files:
- hg38: 
  - deeptools: `/data/rgtdata/hg38/genes_RefSeq_hg38.bed`
- hg19: 
  - deeptools: `/data/rgtdata/hg19/genes_RefSeq_hg19.bed`