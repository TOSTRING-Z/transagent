from fastmcp import FastMCP
import pandas as pd
from typing import Optional
import os
import asyncio
import hashlib

mcp = FastMCP("biotools")

# workdir = "/data/zgr/transagent/biotools/mcp_server"
# data_docker = "/data/zgr/transagent/biotools/data"

data_docker = "/data"
workdir = "/app"
tmp_docker = "/tmp"

os.chdir(workdir)

bed_data_db = {
    "Super_Enhancer_SEdbv2": f"{data_docker}/human/human_Super_Enhancer_SEdbv2.bed",
    "Super_Enhancer_SEAv3": f"{data_docker}/human/human_Super_Enhancer_SEAv3.bed",
    "Super_Enhancer_dbSUPER": f"{data_docker}/human/human_Super_Enhancer_dbSUPER.bed",
    "Enhancer": f"{data_docker}/human/human_Enhancer.bed",
    "Common_SNP": f"{data_docker}/human/human_Common_SNP.bed",
    "Risk_SNP": f"{data_docker}/human/human_Risk_SNP.bed",
    "eQTL": f"{data_docker}/human/human_eQTL.bed",
    "TFBS": f"{data_docker}/human/human_TFBS.bed",
    "eRNA": f"{data_docker}/human/human_eRNA.bed",
    "RNA_Interaction": f"{data_docker}/human/human_RNA_Interaction.bed",
    "CRISPR": f"{data_docker}/human/human_CRISPR.bed",
}

tr_data_db = dict(
    map(
        lambda x: (x.split(".")[0], f"{data_docker}/trapt/TR_bed/{x}"),
        os.listdir(f"{data_docker}/trapt/TR_bed"),
    )
)

bed_config = {"gene_bed_path": f"{data_docker}/human/gene.bed"}

gene_expression_TCGA = f"{data_docker}/exp/gene_expression_TCGA.feather"

exp_data_db = {
    "cancer_TCGA": f"{data_docker}/exp/cancer_TCGA.csv.gz",
    "cell_line_CCLE": f"{data_docker}/exp/cell_line_CCLE.csv.gz",
    "cell_line_ENCODE": f"{data_docker}/exp/cell_line_ENCODE.csv.gz",
    "normal_tissue_GTEx": f"{data_docker}/exp/normal_tissue_GTEx.csv.gz",
    "primary_cell_ENCODE": f"{data_docker}/exp/primary_cell_ENCODE.csv.gz",
}

# global list
with open("cli_prompt.md", "r", encoding="utf8") as file:
    execute_bash_md = file.read()

biological_type_list = ", ".join(list(bed_data_db.keys()))
data_source_list = ", ".join(list(exp_data_db.keys()))
cancer_list = ", ".join(
    pd.read_csv(exp_data_db.get("cancer_TCGA"), index_col=0).columns
)


@mcp.tool(
    description=f"""
        {execute_bash_md}

        Args:
            command: The bash command to execute
            timeout: Timeout time (seconds), None means no timeout
    """
)
async def execute_bash(
    command: str = "echo hello!", timeout: Optional[float] = 6000.0
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


@mcp.tool(
    description=f"""
    Get annotation bed file for a given biological type from the local database (hg38).

    Args:
        biological_type: Biological types in local database (must be: {biological_type_list})

    Returns:
        The path to the annotation bed file.
    """
)
async def get_annotation_bed(biological_type: str) -> str:
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return f"Biological type {biological_type} not found in local database"


@mcp.tool()
async def get_regulators_bed(trs: Optional[list | str]) -> str:
    """
    Get TR binding region bed files for a given TR list from the local database (hg38).

    Args:
        trs: Transcriptional regulators. Can be either:
            - A list of TR names (e.g., ['TP53', 'BRCA1'])
            - Path to a CSV file containing TR names (one per line)

    Returns:
        The paths to the TR binding region bed files.
    """
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


@mcp.tool()
async def get_gene_position(genes: Optional[list | str] = None) -> str:
    """
    Query the positions of genes and return a Gene-bed file path (hg38).

    Args:
        genes: Gene names. Can be either:
            - Gene name list (e.g., ['TP53'])
            - CSV file containing a list of gene names
            - The string "all" to return all genes

    Returns:
        The path to the gene bed file.
    """
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


@mcp.tool(
    description=f"""
    Get multi-sample expression data for a given TCGA cancer type from the local TCGA database.

    Args:
        cancer: Cancer types in local database (must be: {cancer_list})
        genes: Gene names. Can be either:
            - Gene name list (e.g., ['TP53'])
            - CSV file containing a list of gene names
            - The string "all" to return all genes

    Returns:
        The TCGA cancer genes expression file.
    """
)
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


@mcp.tool(
    description=f"""
    Get average gene expression data for a given data source from the local database.

    Args:
        data_source: Data sources in local database (must be: {data_source_list})
        genes: Gene names. Can be either:
            - Gene name list (e.g., ['TP53'])
            - CSV file containing a list of gene names
            - The string "all" to return all genes
    
    Returns:
        The average gene expression file.
    """
)
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


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=3001, path="/biotools")
