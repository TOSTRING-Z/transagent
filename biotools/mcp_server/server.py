# server.py
import asyncio
import pandas as pd
import uuid
from typing import Optional
import os
from mcp import types
from mcp.server.sse import SseServerTransport
from mcp.server.lowlevel.server import Server
from starlette.applications import Starlette
from starlette.routing import Mount, Route

## 创建SSE Server
sse = SseServerTransport("/messages/")  # 创建SSE服务器传输实例，路径为"/messages/"
app = Server("biotools")  # 创建MCP服务器实例，名称为"biotools"

tmp_docker = "/tmp"

bed_data_db = {
    "Super_Enhancer_SEdbv2": "/data/human/human_Super_Enhancer_SEdbv2.bed",
    "Super_Enhancer_SEAv3": "/data/human/human_Super_Enhancer_SEAv3.bed",
    "Super_Enhancer_dbSUPER": "/data/human/human_Super_Enhancer_dbSUPER.bed",
    "Enhancer": "/data/human/human_Enhancer.bed",
    "Common_SNP": "data/human/human_Common_SNP.bed",
    "Risk_SNP": "/data/human/human_Risk_SNP.bed",
    "eQTL": "/data/human/human_eQTL.bed",
    "TFBS": "/data/human/human_TFBS.bed",
    "RNA_Interaction": "/data/human/human_RNA_Interaction.bed",
    "CRISPR": "/data/human/human_CRISPR.bed",
}

tr_data_db = dict(
    map(
        lambda x: (x.split(".")[0], f"/data/trapt/TR_bed/{x}"),
        os.listdir("/data/trapt/TR_bed"),
    )
)

bed_config = {"gene_bed_path": "/data/human/gene.bed"}

exp_data_db = {"GTEx": "/data/exp/GTEx.csv.gz"}

from functools import wraps
from typing import Callable, Any, Dict, Tuple, Optional


def validate_required_params(
    *required_params: str, param_types: Optional[Dict[str, Tuple[type, str]]] = None
):
    """
    参数验证装饰器

    Args:
        *required_params: 必须存在的参数名列表
        param_types: 参数类型检查字典 {参数名: (期望类型, 类型描述)}

    Example:
        @validate_required_params('data_source', 'genes',
                                param_types={'genes': (list, '列表')})
        async def get_express_data(data_source: str, genes: list) -> str:
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # 合并所有参数
            all_params = kwargs.copy()
            if args:
                # 获取同步方法的参数名
                import inspect

                sig = inspect.signature(func)
                params = list(sig.parameters.keys())
                all_params.update(dict(zip(params, args)))

            # 检查必填参数
            missing = [
                p
                for p in required_params
                if p not in all_params or all_params[p] is None
            ]
            if missing:
                return f"Missing the following parameters: {', '.join(missing)}"

            # 检查参数类型
            type_errors = []
            if param_types:
                for param, (expected_type, type_name) in param_types.items():
                    if param in all_params and not isinstance(
                        all_params[param], expected_type
                    ):
                        type_errors.append(f"The {param} must be of type {type_name}")

            if type_errors:
                return ";".join(type_errors)

            # 调用原函数
            return await func(*args, **kwargs)

        return async_wrapper

    return decorator


@validate_required_params("command")
async def execute_bash(
    command: str = "echo hello!", timeout: Optional[float] = 600.0
) -> str:
    try:
        print(f"Executing: {command}")  # 打印完整命令用于调试

        # 关键修改：使用 create_subprocess_exec 并合并 stderr 到 stdout
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,  # 将 stderr 重定向到 stdout
        )

        try:
            # 读取所有输出（合并 stdout 和 stderr）
            output, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            output_str = output.decode("utf-8", errors="replace").strip()

            if proc.returncode != 0:
                return f"Command failed (exit {proc.returncode}):\n{output_str}"

            return (
                output_str
                if output_str
                else "Command executed successfully (no output)"
            )

        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return f"Command timed out after {timeout} seconds"

    except Exception as e:
        return f"Execution error: {str(e)}"


@validate_required_params("biological_type")
async def get_annotation_bed(biological_type: str) -> str:
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return "Biological type {biological_type} not found in local database"


@validate_required_params("trs")
async def get_regulators_bed(trs: list) -> str:
    try:
        tr_beds = []
        for tr in trs:
            tr_bed = tr_data_db.get(tr)
            if tr_bed:
                tr_beds.append(tr_bed)
        return "\n".join(tr_beds)
    except Exception as e:
        return str(e)


@validate_required_params("data_source", "genes")
async def get_express_data(data_source: str, genes: list) -> str:
    try:
        if data_source in exp_data_db:
            exp_file = exp_data_db[data_source]
            exp = pd.read_csv(exp_file, index_col=0)
            exp_genes = exp[exp.index.map(lambda gene: gene in genes)]
            uuid_ = uuid.uuid1()
            exp_genes_path = f"{tmp_docker}/exp_genes_{uuid_}.csv"
            exp_genes.to_csv(exp_genes_path)
            return exp_genes_path
        return "Data source {data_source} not found in local database"
    except Exception as e:
        return str(e)


async def get_gene_position(genes: Optional[list] = None) -> str:
    try:
        if not genes:
            return bed_config["gene_bed_path"]
        gene_bed = pd.read_csv(
            bed_config["gene_bed_path"], index_col=None, header=None, sep="\t"
        )
        gene_position = gene_bed[gene_bed[4].map(lambda gene: gene in genes)]
        uuid_ = uuid.uuid1()
        docker_gene_position_path = f"{tmp_docker}/gene_position_{uuid_}.bed"
        gene_position.to_csv(
            docker_gene_position_path, header=False, index=False, sep="\t"
        )
        return docker_gene_position_path
    except Exception as e:
        return str(e)


@validate_required_params("subcommand", "options")
async def execute_bedtools(
    subcommand: str = "intersect",
    options: str = "--help",
    timeout: Optional[float] = 600.0,
) -> str:
    try:
        uuid_ = uuid.uuid1()
        docker_out_path = f"{tmp_docker}/result_bed_{uuid_}.bed"

        command = [
            "bedtools",
            subcommand,
            options,
        ]

        # 打印可复制的完整命令
        command = " ".join(command)

        # 使用 create_subprocess_exec 避免 shell 解析问题
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return f"Timeout after {timeout}s"

        if proc.returncode != 0:
            return stderr.decode().strip()

        # 写入结果文件
        with open(docker_out_path, "w") as f:
            f.write(stdout.decode())
        return docker_out_path

    except Exception as e:
        return str(e)


@app.call_tool()
async def fetch_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    # 定义异步函数fetch_tool，作为MCP工具调用处理器
    # 参数: name - 工具名称, arguments - 工具参数字典
    # 返回: 包含文本、图像或嵌入资源的列表

    tools = {
        "get_annotation_bed": get_annotation_bed,
        "get_regulators_bed": get_regulators_bed,
        "get_express_data": get_express_data,
        "get_gene_position": get_gene_position,
        "execute_bedtools": execute_bedtools,
    }
    try:
        if name in tools:
            result = await tools[name](**arguments)
            return [types.TextContent(type="text", text=result)]
        else:
            return [
                types.TextContent(
                    type="text",
                    text=f"The '{name}' MCP service does not exist. Please check and try again!",
                )
            ]
    except Exception as e:
        return [types.TextContent(type="text", text=str(e))]


# https://json-schema.org/understanding-json-schema/about
# https://platform.openai.com/docs/guides/function-calling?api-mode=responses
@app.list_tools()
async def list_tools() -> list[types.Tool]:
    # 定义异步函数list_tools，用于列出可用的工具
    # 返回: Tool对象列表，描述可用工具
    biological_type_list = ", ".join(list(bed_data_db.keys()))
    data_source_list = ", ".join(list(exp_data_db.keys()))
    return [
        types.Tool(
            name="execute_bedtools",  # 工具名称
            description="""bedtools is a powerful toolset for genome arithmetic.
Returns:
    The path to the result bed file.""",  # 工具描述
            inputSchema={  # 输入模式定义
                "type": "object",
                "required": ["subcommand", "options"],
                "properties": {
                    "subcommand": {
                        "type": "string",
                        "description": "The bedtools sub-commands (e.g. intersect)",
                    },
                    "options": {
                        "type": "string",
                        "description": "The parameter list of the sub-command (e.g. '-a a.bed -b b.bed -wa -wb'])",
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Timeout time (seconds), None means no timeout",
                    },
                },
            },
        ),
        types.Tool(
            name="get_gene_position",
            description="""Query the positions of genes and return a Gene-bed file path (hg38).
Returns:
    The path to the gene bed file.""",
            inputSchema={
                "type": "object",
                "required": ["genes"],
                "properties": {
                    "genes": {
                        "type": "array",
                        "description": "A list of gene names (e.g. ['TP53'])",
                    }
                },
            },
        ),
        types.Tool(
            name="get_annotation_bed",
            description="""Get bed data for a given biological type from the local database (hg38).
Returns:
    The path to the annotation bed file.""",
            inputSchema={
                "type": "object",
                "required": ["biological_type"],
                "properties": {
                    "biological_type": {
                        "type": "string",
                        "description": f"Biological types in local database (must be: {biological_type_list})",
                    }
                },
            },
        ),
        types.Tool(
            name="get_regulators_bed",
            description="""Get bed data for a given TR list from the local database (hg38).
Returns:
    The paths to the TR bed files.""",
            inputSchema={
                "type": "object",
                "required": ["trs"],
                "properties": {
                    "trs": {
                        "type": "array",
                        "description": f"A list of TR names (e.g. ['GATA4@Sample_02_4106'])",
                    }
                },
            },
        ),
        types.Tool(
            name="get_express_data",
            description="""Get express data for a given data source from the local database (hg38).
Returns:
    The genes expression file.""",
            inputSchema={
                "type": "object",
                "required": ["data_source", "genes"],
                "properties": {
                    "data_source": {
                        "type": "string",
                        "description": f"Data sources in local database (must be: {data_source_list})",
                    },
                    "genes": {
                        "type": "array",
                        "description": "A list of gene names (e.g. ['TP53'])",
                    },
                },
            },
        ),
        types.Tool(
            name="execute_bash",
            description="""Execute the bash tool with the given command.
当前工具可以用于复杂的生物信息分析流程，包括复杂的数据分析，绘图和系统级别指令调用。已经安装的软件如下：
- homer: 用于ChIP-seq和motif分析的软件
    - 输入: input.bed
    - 输出: output_dir
    - 例子: findMotifsGenome.pl input.bed hg38 output_dir -size 200 -mask
- chipseeker: 用于ChIP-seq数据的注释
    - 输入: input.bed
    - 输出: output_dir
    - 例子: mkdir -p output_dir && Rscript -e 'library(ChIPseeker);library(TxDb.Hsapiens.UCSC.hg38.knownGene); peakAnno <- annotatePeak("input.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg38.knownGene); write.csv(peakAnno@annoStat,"output_dir/ChIPseeker_annoStat.csv")'
- BETA: Find Target Genes with only binding data: regulatiry potential score
    - 输入: input.bed
    - 输出: output_dir
    - 例子: awk '{print $1"\t"$2"\t"$3}' input.bed > BETA_input.bed && BETA minus -p BETA_input.bed -g hg38 -n BETA_targets -o output_dir
- TRAPT: 识别人类中调控基因集合的关键转录调控子
    - 输入: genes.txt(一列基因名)
    - 输出: output_dir
    - 例子: head -n 200 genes.txt > top200_genes.txt && trapt --library /data/trapt/library --input top200_genes.txt --output output_dir
- fastqc: 用于测序数据的质量控制
    - 输入: read1.fastq,read2.fastq(双端测序需要)
    - 输出: analysis/fastqc_dir
    - 例子: fastqc read1.fastq read2.fastq -o analysis/fastqc_dir
- trim_galore: 用于测序数据的适配器修剪
    - 输入: read1.fastq,read2.fastq(双端测序需要)
    - 输出: trim_galore_dir
    - 例子: mkdir -p analysis/trim_galore_dir && trim_galore -q 20 --phred33 --stringency 3 --length 20 -e 0.1 --paired --gzip read1.fastq read2.fastq -o analysis/trim_galore_dir
- bowtie2: 用于序列比对
    - 输入: read1_val_1.fq.gz,read2_val_2.fq.gz(双端测序需要)
    - 输出: raw.bam
    - 例子: mkdir -p analysis/bam && bowtie2 --threads 16 -k 1 -x /data/rgtdata/hg38/genome_hg38 -1 analysis/trim_galore_dir/read1_val_1.fq.gz -2 analysis/trim_galore_dir/read2_val_2.fq.gz | samtools view -F 4 -bS | samtools sort --threads 16 -o analysis/bam/raw.bam
- picard: 去除PCR重复
    - 输入: raw.bam
    - 输出: marked_duplicates.bam
    - 例子: picard MarkDuplicates I=analysis/bam/input.bam O=analysis/bam/marked_duplicates.bam M=metrics.txt && samtools index analysis/bam/marked_duplicates.bam analysis/bam/marked_duplicates.bam.bai
- samtools: 构建bam索引
    - 输入: marked_duplicates.bam
    - 输出: marked_duplicates.bam.bai
    - 例子: samtools index marked_duplicates.bam marked_duplicates.bam.bai
- macs2: 用于ChIP-seq峰值检测
    - 输入: marked_duplicates.bam,control.bam(可选参考)
    - 输出: analysis/peak_dir
    - 例子: mkdir -p analysis/peak_dir && macs2 callpeak --shift -100 --extsize 200 --SPMR --nomodel -B -g hs -q 0.01 -t analysis/bam/marked_duplicates.bam -c control.bam -f BAM -g hs -n analysis/peak_dir
- bamCoverage: 转换bam为bw
    - 输入: marked_duplicates.bam
    - 输出: final.bw
    - 例子: mkdir -p analysis/bigwig && bamCoverage -b analysis/bam/marked_duplicates.bam --ignoreDuplicates  --skipNonCoveredRegions  --normalizeUsing RPKM --binSize 1 -p max -o analysis/bigwig/final.bw
- bed2gff: bed转换gff文件
    - 输入: peaks.narrowPeak
    - 输出: peaks.gff
    - 例子: bash /data/bed2gff/bed2gff.sh peaks.narrowPeak peaks.gff
- ROSE: 识别超级增强子机器靶基因
    - 输入: peaks.narrowPeak,marked_duplicates.bam,control.bam
    - 输出: output_dir
    - 例子: bash /data/bed2gff/bed2gff.sh peaks.narrowPeak peaks.gff && python2 /data/rose/ROSE_main.py -g HG38 -i peaks.gff -r marked_duplicates.bam -c control.bam -o output_dir -t 2000 && python2 ROSE_geneMapper.py -g HG38 -i output_dir/peaks_AllEnhancers.table.txt -o output_dir
- deeptools: 用于高通量测序数据的可视化
    - 输入: input.bed,input.bw
    - 输出: matrix.gz,output.svg
    - 例子: computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R input.bed -S input.bw -out matrix.gz && plotHeatmap -m matrix.gz -out output.svg
- ucsc-liftover: 用于基因组坐标转换
    - 输入: input.bed
    - 输出: output.bed,unmapped.bed
    - 例子: liftOver input.bed /data/bam2bw/hg19ToHg38.over.chain.gz output.bed unmapped.bed
- pandas: 用于数据分析和操作
    - 例子: python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'
- seaborn: 用于数据可视化
    - 例子: python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'
""",
            inputSchema={
                "type": "object",
                "required": ["command"],
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The bash command to execute",
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Timeout time (seconds), None means no timeout",
                    },
                },
            },
        ),
    ]


async def handle_sse(request):
    # 定义异步函数handle_sse，处理SSE请求
    # 参数: request - HTTP请求对象

    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as streams:
        # 建立SSE连接，获取输入输出流
        await app.run(
            streams[0], streams[1], app.create_initialization_options()
        )  # 运行MCP应用，处理SSE连接


starlette_app = Starlette(
    debug=True,  # 启用调试模式
    routes=[
        Route("/sse", endpoint=handle_sse),  # 设置/sse路由，处理函数为handle_sse
        Mount(
            "/messages/", app=sse.handle_post_message
        ),  # 挂载/messages/路径，处理POST消息
    ],
)  # 创建Starlette应用实例，配置路由

import uvicorn  # 导入uvicorn ASGI服务器

uvicorn.run(
    starlette_app, host="0.0.0.0", port=3001
)  # 运行Starlette应用，监听0.0.0.0和指定端口
