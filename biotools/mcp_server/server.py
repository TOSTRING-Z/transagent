# server.py
import asyncio
import pandas as pd
import uuid
from typing import Optional

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

bed_config = {"gene_bed_path": "/data/human/gene.bed"}

exp_data_db = {
    "GTEx":"/data/exp/GTEx.csv.gz"
}

# /data/zgr/data/TRAPT/tool/other/figure4/bw_download/deeptools_run.sh
# /data/zgr/data/TRAPT/tool/new/script/3.11/case_esr1.py
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


async def get_bed_data(biological_type: str) -> str:
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return "Biological type {biological_type} not found in local database"

async def get_express_data(data_source: str) -> str:
    if data_source in bed_data_db:
        return exp_data_db[data_source]
    return "Data source {data_source} not found in local database"


async def get_gene_position(genes: list = ["TP53"]) -> str:
    gene_bed = pd.read_csv(
        bed_config["gene_bed_path"], index_col=None, header=None, sep="\t"
    )
    gene_position = gene_bed[gene_bed[4].map(lambda gene: gene in genes)]
    uuid_ = uuid.uuid1()
    docker_gene_position_path = f"{tmp_docker}/gene_position_{uuid_}.bed"
    gene_position.to_csv(docker_gene_position_path, header=False, index=False, sep="\t")
    return docker_gene_position_path


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
        "execute_bash": execute_bash,
        "get_bed_data": get_bed_data,
        "get_gene_position": get_gene_position,
        "execute_bedtools": execute_bedtools,
    }
    try:
        result = await tools[name](**arguments)
        return [types.TextContent(type="text", text=result)]
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
    The path to the result-bed file.""",  # 工具描述
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
    The path to the Gene-bed file.""",
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
            name="get_bed_data",
            description="""Get bed data for a given biological type from the local database (hg38).
Returns:
    The path to the [biological_type]-bed file.""",
            inputSchema={
                "type": "object",
                "required": ["biological_type"],
                "properties": {
                    "biological_type": {
                        "type": "string",
                        "description": f"Biological types in local database ({biological_type_list})",
                    }
                },
            },
        ),
        types.Tool(
            name="get_express_data",
            description="""Get express data for a given data source from the local database (hg38).
Returns:
    The path to the [data_source]-bed file.""",
            inputSchema={
                "type": "object",
                "required": ["data_source"],
                "properties": {
                    "data_source": {
                        "type": "string",
                        "description": f"Data sources in local database ({data_source_list})",
                    }
                },
            },
        ),
        types.Tool(
            name="execute_bash",
            description="""Execute the bash tool with the given command.

当前工具可以用于复杂的生物信息分析流程，包括复杂的数据分析，绘图和系统级别指令调用。已经安装的工具如下：
- homer: 用于ChIP-seq和motif分析的工具
    Example: `execute_bash("findMotifsGenome.pl peaks.txt hg38 output_dir -size 200 -mask")`
- deeptools: 用于高通量测序数据的可视化
    Example: `execute_bash("computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R genes.bed -S coverage.bw -out matrix.gz")`
- chipseeker: 用于ChIP-seq数据的注释
    Example: `execute_bash("Rscript -e 'library(ChIPseeker); peakAnno <- annotatePeak("peaks.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg19.knownGene)'")`
- ucsc-liftover: 用于基因组坐标转换
    Example: `execute_bash("liftOver input.bed hg19ToHg38.over.chain output.bed unmapped.bed")`
- cistrome_beta: 用于ChIP-seq数据分析的beta版本工具
    Example: `execute_bash("cistrome beta --input peaks.bed --genome hg38 --output output_dir")`
- fastqc: 用于测序数据的质量控制
    Example: `execute_bash("fastqc seq.fastq -o output_dir")`
- trim_galore: 用于测序数据的适配器修剪
    Example: `execute_bash("trim_galore --paired --quality 20 --length 20 read1.fastq read2.fastq")`
- bowtie2: 用于序列比对
    Example: `execute_bash("bowtie2 -x index -1 read1.fastq -2 read2.fastq -S output.sam")`
- picard: 用于处理高通量测序数据的工具
    Example: `execute_bash("picard MarkDuplicates I=input.bam O=marked_duplicates.bam M=metrics.txt")`
- macs2: 用于ChIP-seq峰值检测
    Example: `execute_bash("macs2 callpeak -t ChIP.bam -c Control.bam -f BAM -g hs -n output_prefix")`
- pandas: 用于数据分析和操作
    Example: `execute_bash("python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'")
- seaborn: 用于数据可视化
    Example: `execute_bash("python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'")

Returns:
    The output of the bash command.

Examples:
    >>> execute_bash("ls -l")
    'total 4\ndrwxr-xr-x 2 root root 4096 Apr  5 12:34 data'""",
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
