# 全面超级增强子目录 用以 选择组织/细胞特异性位点 的智能体 构建

# 数据
```bash
rsync -rz -P root@172.20.13.132:/var/www/html/eRNAbase/public/data/annotation/human data/
```

# 软件
```bash
cp src/backend/server/{agent,llm_service,stream,tool_call}.js transagent/src/backend/server/
cp  {ConfigsWindow,globals,Install,MainWindow,Utils,Window,WindowManager}.js transagent/src/backend/modules/
```


# 任务案例
查看TP53在增强子上的覆盖情况
intersect
-a /tmp/gene_position@a3e84069-1030-11f0-8abc-bcfce71289ab.bed -b /data/human/human_Super_Enhancer_SEdbv2.bed -u

## 问题

查看ESR1,GATA3,FOXA1在相关增强子和SNP上的覆盖情况

### 工具

基因位置查询 (input: 基因列表, out_file: Gene-bed文件路径)
bed文件查询 (input: 生物学类型;Enhancer, out_str: Enhancer-bed文件路径)
执行bedtools (input: Gene-bed文件路径,Enhancer-bed文件路径, out_file: 结果文件)

## 问题

分析这套乳腺癌数据中关键调控子上SNP的覆盖情况

使用增强子来筛选细胞类型特异性区域

### 工具

询问用户数据类型 (基因列表/bed文件)
IF 基因列表:
  转录调控子预测 (input: 基因列表, out_file: 关键转录调控子)
  bed文件查询 (input: 生物学类型;TR, out_str: TR bed文件路径)
  bed文件查询 (input: 生物学类型;SNP, out_str: SNP bed文件路径)
  执行bedtools (input: TR-bed文件路径,SNP-bed文件路径, out_file: 结果文件)
IF bed文件:
  区域基因搜索 (input: bed文件,  out_file: 基因列表文件)
  转录调控子预测 (input: 基因列表, out_file: 关键转录调控子)
  bed文件查询 (input: 生物学类型;TR, out_str: TR-bed文件路径)
  bed文件查询 (input: 生物学类型;SNP, out_str: SNP-bed文件路径)
  执行bedtools (input: TR-bed文件路径,SNP-bed文件路径, out_file: 结果文件)

