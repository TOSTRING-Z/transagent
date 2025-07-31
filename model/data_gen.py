import random
import requests
import json
import csv
import numpy as np

# Ollama API配置
OLLAMA_API_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3:14b"
# DeepSeek API配置
API_URL = "https://api.deepseek.com/chat/completions"
API_KEY = ""
MODEL = "deepseek-chat"

# 生成100个主题
topics = [
    "ChIP-seq peak calling with MACS2",
    "Super-enhancer identification using ROSE",
    "TF footprint analysis with HINT_ATAC",
    "Core Regulatory Circuitry mapping with CRCmapper",
    "Motif discovery using HOMER",
    "Peak annotation with ChIPseeker",
    "TF-target prediction using BETA",
    "Enhancer-gene linking with ABC model",
    "Gene regulatory network inference with ARACNe",
    "Co-expression network analysis with GENIE3",
    "Transcriptional regulator prediction with TRAPT",
    "ATAC-seq data processing pipeline",
    "ChIP-seq quality control metrics",
    "Differential binding analysis",
    "Chromatin accessibility peak calling",
    "Histone mark peak analysis",
    "Promoter-enhancer interaction analysis",
    "TF binding site characterization",
    "Nucleosome positioning analysis",
    "Chromatin state segmentation",
    "Comparative ChIP-seq analysis",
    "Time-series ChIP-seq analysis",
    "Integration of ChIP-seq and RNA-seq",
    "TF cooperativity analysis",
    "Composite peak profile analysis",
    "Motif enrichment in differential peaks",
    "Peak overlap analysis with bedtools",
    "Genomic distribution of binding sites",
    "TSS-proximal vs distal binding analysis",
    "Cell-type specific regulatory elements",
    "Super-enhancer target gene analysis",
    "Enhancer RNA identification",
    "Silencer element identification",
    "Insulator element analysis",
    "3D chromatin structure analysis",
    "Hi-C and ChIP-seq integration",
    "ATAC-seq footprinting analysis",
    "Nucleosome-free region detection",
    "Pioneer factor binding analysis",
    "Chromatin remodeling factor analysis",
    "Epigenetic modifier analysis",
    "DNA methylation and TF binding",
    "Allele-specific binding analysis",
    "SNP effects on TF binding",
    "Disease-associated regulatory variants",
    "Evolutionary conservation of regulatory elements",
    "Cross-species regulatory element comparison",
    "Strain-specific regulatory differences",
    "Single-cell ATAC-seq analysis",
    "Single-cell ChIP-seq analysis",
    "Multi-omics regulatory integration",
    "Epigenetic clock analysis",
    "Aging-related regulatory changes",
    "Cell differentiation regulatory dynamics",
    "Cell cycle-dependent regulation",
    "Stress response regulatory programs",
    "Disease-specific regulatory networks",
    "Cancer-specific super-enhancers",
    "Oncogenic TF network analysis",
    "Tumor suppressor regulatory circuits",
    "Drug response regulatory signatures",
    "CRISPR screen hit validation",
    "Perturbation response analysis",
    "Knockout regulatory consequences",
    "Overexpression regulatory effects",
    "Lineage-specific regulatory programs",
    "Pluripotency regulatory network",
    "Reprogramming regulatory dynamics",
    "Transdifferentiation regulatory paths",
    "Spatial transcriptomics integration",
    "Tissue-specific regulatory elements",
    "Organ development regulatory programs",
    "X chromosome inactivation analysis",
    "Imprinting regulatory mechanisms",
    "Circadian regulation analysis",
    "Metabolic regulation networks",
    "Immune response regulatory programs",
    "Inflammation-related TF activity",
    "Infection-induced regulatory changes",
    "Viral integration regulatory effects",
    "Host-pathogen regulatory interplay",
    "Autoimmune disease regulatory variants",
    "Neurodegeneration regulatory changes",
    "Stem cell regulatory networks",
    "Regeneration regulatory programs",
    "Wound healing regulatory dynamics",
    "Angiogenesis regulatory factors",
    "Hypoxia response regulation",
    "DNA damage response regulation",
    "Senescence regulatory programs",
    "Apoptosis regulatory networks",
    "Cell fate decision regulatory nodes",
    "Synthetic biology circuit design",
    "Gene regulatory network modeling",
    "Boolean network analysis",
    "Dynamic regulatory simulation",
    "Machine learning in regulatory prediction",
    "Deep learning for motif discovery",
    "Explainable AI in regulatory genomics",
]

# 智能体对话历史消息类型
HISTORY_TYPES = [
    "Tool execution logs",
    "Previous conversations",
    "Data retrieval records",
    "Error messages",
    "Analysis results",
    "Configuration settings",
    "Command history",
    "Process status updates",
    "Debugging information",
    "User preferences",
    "System notifications",
    "API responses",
    "Database query results",
    "File operation logs",
    "Pipeline execution status",
]

# Query types and attributes to increase prompt diversity
QUERY_TYPES = [
    "Keyword",
    "Factual",
    "Summary",
    "Judgment",
    "Comparative",
    "Procedural",
    "Exploratory",
    "Opinion-based",
    "Creative",
    "Clarification",
]
QUERY_LENGTH = ["Short", "Medium", "Long"]
DIFFICULTY = ["Easy", "Moderate", "Hard"]


def get_random_attributes():
    """Get random query attributes to increase prompt diversity"""
    return {
        "query_type": random.choice(QUERY_TYPES),
        "length": random.choice(QUERY_LENGTH),
        "difficulty": random.choice(DIFFICULTY),
        "history_type": random.choice(HISTORY_TYPES),
    }


# Update the prompt template to include query attributes
SYS_PROMPT_TEMPLATE = """
Generate ONLY ONE relevant pair of message records based on the topic and tags information in the following format (JSON), no explanation, no additional text, content must be in {language}:

output format:
{{
    "query": "string (The current user's input/question/task to be accomplished)",
    "history": "string (Relevant agent history message records, which might help with the user's task, {min_len}-{max_len} chars)",
}}
"""

USER_PROMPT_TEMPLATE = """
Topic: {topic}
Tags:
- Query Type: {query_type}
- Length: {length} 
- Difficulty: {difficulty}
- History Type: {history_type}
"""


def call_api(topic, ollama=True):
    """调用Ollama API生成消息对"""
    topic = np.random.choice(["Unlimited", topic], p=[0.5, 0.5])
    min_len = random.randint(20, 100)  # 最小长度限制
    max_len = max(random.randint(30, 500), min_len) + 100
    language = random.choice(["Chinese", "English"])  # 随机语言
    attrs = get_random_attributes()
    print(f"topic: {topic}, language: {language}", attrs)
    sys_prompt = SYS_PROMPT_TEMPLATE.format(
        language=language, min_len=min_len, max_len=max_len
    )
    user_prompt = USER_PROMPT_TEMPLATE.format(
        topic=topic,
        query_type=attrs["query_type"],
        length=attrs["length"],
        difficulty=attrs["difficulty"],
        history_type=attrs["history_type"],
    )

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "temperature": 2,  # 使用高温增加随机性
    }

    try:
        if ollama:
            payload["model"] = OLLAMA_MODEL
            payload["format"] = {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "history": {"type": "string"},
                },
                "required": ["query", "history"],
            }
            payload["options"] = {"temperature": 2}
            response = requests.post(OLLAMA_API_URL, json=payload)
            response.raise_for_status()
            return response.json()["message"]["content"].strip()
        else:
            headers = {
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            }
            response = requests.post(API_URL, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"API调用失败: {e}")
        return None


class DataGenerator:
    def __init__(self, num_samples=1000000):
        self.num_samples = num_samples

    def generate(self, output_file):
        with open(output_file, "w+") as f:
            csv_writer = csv.writer(f, delimiter="\t")
            for i in range(self.num_samples):
                topic = random.choice(topics)
                response = call_api(topic)

                if response:
                    try:
                        # 解析API响应
                        parts = json.loads(response)
                        if (
                            isinstance(parts, dict)
                            and "query" in parts
                            and "history" in parts
                        ):
                            csv_writer.writerow([parts["query"], parts["history"]])
                            print(
                                f"已生成 {i+1}/{self.num_samples}: {parts['query'][:20]}... | {parts['history'][:20]}..."
                            )
                        else:
                            print(f"格式错误: {response}")
                    except Exception as e:
                        print(f"处理响应出错: {e}")


if __name__ == "__main__":
    generator = DataGenerator(1000000)
    generator.generate("/data/zgr/transagent/model/data/querys.txt")
