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

exp_data_db = {"GTEx": "/data/exp/GTEx.csv.gz"}


async def get_bed_data(biological_type: str) -> str:
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return "Biological type {biological_type} not found in local database"


async def get_express_data(data_source: str = "GTEx", genes: list = ["TP53"]) -> str:
    try:
        if data_source in bed_data_db:
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


async def get_gene_position(genes: list = ["TP53"]) -> str:
    try:
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
        "get_bed_data": get_bed_data,
        "get_gene_position": get_gene_position,
        "execute_bedtools": execute_bedtools,
        "get_express_data": get_express_data,
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
    The genes expression file.""",
            inputSchema={
                "type": "object",
                "required": ["data_source", "genes"],
                "properties": {
                    "data_source": {
                        "type": "string",
                        "description": f"Data sources in local database ({data_source_list})",
                    },
                    "genes": {
                        "type": "array",
                        "description": "A list of gene names (e.g. ['TP53'])",
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
