# Biotools

## MCP server

[mcp_server](mcp_server)

# 简单案例

## 区域注释

查看TP53基因在增强子上的覆盖情况
查看ESR1,GATA3,FOXA1基因在相关增强子和SNP上的覆盖情况

## 表达分析

查看TP53基因的表达情况

## 转录调控子活性分析

寻找调控/tmp/diff.txt中基因的关键调控子

# 复杂案例

Case1：
  输入Med1或者H3K27AC ChIP-seq，识别出peak和Super enhancer（DeepTools画出来区域活性图），SE区域HOMER（出motif的图），调用DeepTools画出来TF ChIP-seq在SE相关基因上的绑定活性，IGV可视化重点基因的多个track；下游靶基因的表达特异性（TCGA或者gtex）

Case2:
  https://www.ncbi.nlm.nih.gov/sra?term=SRP198938  （KYSE200）; 
  https://www.ncbi.nlm.nih.gov/sra?term=SRP123449 (TT)；TP63 ChIP-seq：https://www.ncbi.nlm.nih.gov/sra?term=SRP257490；这个文章是通过做了SE，然后crc环找到了TP63/SOX2/KLF5调控食管鳞癌，咱看只用SE的homer能不能富集出来这些TF
