# BioTools

## MCP server

General transcriptional regulation dataset and toolkit: [MCP server](mcp_server)

# Simple Cases

## Region Annotation

```
Check TP53 gene coverage on enhancers
```

```
Check ESR1, GATA3, FOXA1 gene coverage on related enhancers and SNPs
```

## Expression Analysis

```
Check TP53 gene expression in TCGA breast cancer
```

# Complex Cases

## Case1：

```
- Upload: /tmp/SRR9091032_1.fastq.gz (Experimental group)
- Upload: /tmp/SRR9091033_1.fastq.gz (Control group)
I have provided 2 single-end sequencing files (hg38), please perform the following analysis:
1. Super enhancer identification and analysis
2. Find core transcriptional regulatory circuitries
- Save path: /tmp/KYSE200_hg38
```

## Case2:

```
- Upload: /tmp/top200_cardiomyocyte_development.csv
1. Identify key transcription factors
2. Check expression of key transcription factors in normal and cancer tissues
3. Select key cardiac transcription factors and analyze risk SNPs, eQTLs and super enhancers in their binding regions
4. Find target genes of key transcription factors and plot line charts by score
5. Build correlation network of transcription factors and target genes in tissues
- Save path: /tmp/cardiomyocyte
```