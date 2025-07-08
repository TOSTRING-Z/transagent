# server.py
import pandas as pd
from typing import Optional
import os
from mcp import types
from mcp.server.sse import SseServerTransport
from mcp.server.lowlevel.server import Server
from starlette.applications import Starlette
from starlette.routing import Mount, Route
import hashlib

## 创建SSE Server
sse = SseServerTransport("/messages/")  # 创建SSE服务器传输实例，路径为"/messages/"
app = Server("biotools")  # 创建MCP服务器实例，名称为"biotools"

tmp_docker = "/tmp"

bed_data_db = {
    "Super_Enhancer_SEdbv2": "/data/human/human_Super_Enhancer_SEdbv2.bed",
    "Super_Enhancer_SEAv3": "/data/human/human_Super_Enhancer_SEAv3.bed",
    "Super_Enhancer_dbSUPER": "/data/human/human_Super_Enhancer_dbSUPER.bed",
    "Enhancer": "/data/human/human_Enhancer.bed",
    "Common_SNP": "/data/human/human_Common_SNP.bed",
    "Risk_SNP": "/data/human/human_Risk_SNP.bed",
    "eQTL": "/data/human/human_eQTL.bed",
    "TFBS": "/data/human/human_TFBS.bed",
    "eRNA": "/data/human/human_eRNA.bed",
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

gene_expression_TCGA = "/data/exp/gene_expression_TCGA.feather"

exp_data_db = {
    "cancer_TCGA": "/data/exp/cancer_TCGA.csv.gz",
    "cell_line_CCLE": "/data/exp/cell_line_CCLE.csv.gz",
    "cell_line_ENCODE": "/data/exp/cell_line_ENCODE.csv.gz",
    "normal_tissue_GTEx": "/data/exp/normal_tissue_GTEx.csv.gz",
    "primary_cell_ENCODE": "/data/exp/primary_cell_ENCODE.csv.gz",
}

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
        async def get_mean_express_data(data_source: str, genes: list) -> str:
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


@validate_required_params("biological_type")
async def get_annotation_bed(biological_type: str) -> str:
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return f"Biological type {biological_type} not found in local database"


@validate_required_params("trs")
async def get_regulators_bed(trs: Optional[list | str]) -> str:
    try:
        if type(trs) == str:
            trs = pd.read_csv(trs, header=None).iloc[:, 0].to_list()
        if len(trs) == 0:
            return "TR list cannot be empty."
        tr_beds = []
        md5_value = hashlib.md5(
            "get_regulators_bed".join(trs).encode("utf-8")
        ).hexdigest()
        output = "output bed files:\n"
        os.system(f"mkdir /tmp/md5_{md5_value}")
        for tr in trs:
            tr_bed = tr_data_db.get(tr)
            if tr_bed:
                baseanme = os.path.basename(tr_bed)
                os.system(f"cp {tr_bed} /tmp/md5_{md5_value}/{baseanme}")
                tr_beds.append(f"/tmp/md5_{md5_value}/{baseanme}")
        output = f"{output}{"\n".join(tr_beds)}"
        return output
    except Exception as e:
        return str(e)


@validate_required_params("cancer", "genes")
async def get_tcga_cancer_express(
    cancer: str, genes: Optional[list | str] = "all"
) -> str:
    try:
        if type(genes) == str and genes != "all":
            genes = pd.read_csv(genes, header=None).iloc[:, 0].to_list()
        exp = pd.read_feather(gene_expression_TCGA)
        if genes == "all":
            exp_genes = exp
            genes = ["all"]
        else:
            exp_genes = exp[exp.index.map(lambda gene: gene in genes)]
        exp_genes = exp_genes.filter(regex=f"^{cancer}")
        md5_value = hashlib.md5(cancer.join(genes).encode("utf-8")).hexdigest()
        exp_genes_path = f"{tmp_docker}/TCGA_{cancer}_exp_md5_{md5_value}.csv"
        exp_genes.to_csv(exp_genes_path)
        return exp_genes_path
    except Exception as e:
        return str(e)


@validate_required_params("data_source", "genes")
async def get_mean_express_data(
    data_source: str, genes: Optional[list | str] = "all"
) -> str:
    try:
        if type(genes) == str and genes != "all":
            genes = pd.read_csv(genes, header=None).iloc[:, 0].to_list()
        if data_source in exp_data_db:
            exp_file = exp_data_db[data_source]
            exp = pd.read_csv(exp_file, index_col=0)
            if genes == "all":
                exp_genes = exp
                genes = ["all"]
            else:
                exp_genes = exp[exp.index.map(lambda gene: gene in genes)]
            md5_value = hashlib.md5(data_source.join(genes).encode("utf-8")).hexdigest()
            exp_genes_path = f"{tmp_docker}/exp_genes_md5_{md5_value}.csv"
            exp_genes.to_csv(exp_genes_path)
            return exp_genes_path
        return f"Data source {data_source} not found in local database"
    except Exception as e:
        return str(e)


@validate_required_params("genes")
async def get_gene_position(genes: Optional[list | str] = None) -> str:
    try:
        if type(genes) == str and genes != "all":
            genes = pd.read_csv(genes, header=None).iloc[:, 0].to_list()
        gene_bed = pd.read_csv(
            bed_config["gene_bed_path"], index_col=None, header=None, sep="\t"
        )
        if genes == "all":
            gene_position = gene_bed
            genes = ["all"]
        else:
            gene_position = gene_bed[gene_bed[4].map(lambda gene: gene in genes)]
        md5_value = hashlib.md5(
            "get_gene_position".join(genes).encode("utf-8")
        ).hexdigest()
        docker_gene_position_path = f"{tmp_docker}/gene_position_md5_{md5_value}.bed"
        gene_position.to_csv(
            docker_gene_position_path, header=False, index=False, sep="\t"
        )
        return docker_gene_position_path
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
        "get_gene_position": get_gene_position,
        "get_tcga_cancer_express": get_tcga_cancer_express,
        "get_mean_express_data": get_mean_express_data,
        "get_annotation_bed": get_annotation_bed,
        "get_regulators_bed": get_regulators_bed,
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
    cancer_list = ", ".join(
        pd.read_csv(exp_data_db.get("cancer_TCGA"), index_col=0).columns
    )
    return [
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
                        "type": "array|string",
                        "description": """Options: 
1. Gene name list (e.g., ['TP53'])
2. CSV file containing a list of gene names
3. The string "all" to return all genes""",
                    }
                },
            },
        ),
        types.Tool(
            name="get_annotation_bed",
            description="""Get annotation bed file for a given biological type from the local database (hg38).
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
            description="""Get TR binding region bed files for a given TR list from the local database (hg38).
Returns:
    The paths to the TR binding region bed files.""",
            inputSchema={
                "type": "object",
                "required": ["trs"],
                "properties": {
                    "trs": {
                        "type": "array|string",
                        "description": """Options: 
1. TR name list (e.g., ['TP53'])
2. CSV file containing a list of TR names
*Note*: There is no option to return all TRs.""",
                    }
                },
            },
        ),
        types.Tool(
            name="get_mean_express_data",
            description="""Get average gene expression data for a given data source from the local database.
Returns:
    The average gene expression file.""",
            inputSchema={
                "type": "object",
                "required": ["data_source", "genes"],
                "properties": {
                    "data_source": {
                        "type": "string",
                        "description": f"Data sources in local database (must be: {data_source_list})",
                    },
                    "genes": {
                        "type": "array|string",
                        "description": "Same as the description of `get_gene_position`",
                    },
                },
            },
        ),
        types.Tool(
            name="get_tcga_cancer_express",
            description="""Get multi-sample expression data for a given TCGA cancer type from the local TCGA database.
Returns:
    The TCGA cancer genes expression file.""",
            inputSchema={
                "type": "object",
                "required": ["cancer", "genes"],
                "properties": {
                    "cancer": {
                        "type": "string",
                        "description": f"Cancer types in local database (must be: {cancer_list})",
                    },
                    "genes": {
                        "type": "array|string",
                        "description": "Same as the description of `get_gene_position`",
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
