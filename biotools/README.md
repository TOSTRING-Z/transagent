# Biotools

## MCP server

通用转录调控数据集和工具包：[MCP server](mcp_server)

# 简单案例

## 区域注释

```
查看TP53基因在增强子上的覆盖情况
```

```
查看ESR1，GATA3，FOXA1基因在相关增强子和SNP上的覆盖情况
```

## 表达分析

```
查看TP53基因的在TCGA乳腺癌中的表达情况
```

# 复杂案例

## Case1：

```
- Upload: /tmp/SRR9091032_1.fastq.gz（实验组）
- Upload: /tmp/SRR9091033_1.fastq.gz（对照组）
我提供了2个单末端测序文件(hg38),请进行如下分析：
1. 超级增强子识别和分析
2. 寻找转录调控环
- 保存路径：/tmp/KYSE200_hg38
```

## Case2:

```
- Upload: /tmp/top200_cardiomyocyte_development.csv
1.寻找关键转录因子
2.查看关键转录因子在正常组织和癌症组织中的表达
3.选择关键的心脏转录因子分析其绑定区域中的风险SNP位点、eQTL和超级增强子
4.寻找关键转录因子靶基因并按照得分绘制折线图
5.构建转录因子和靶基因在组织中的相关性网络图
- 保存路径：/tmp/cardiomyocyte
```