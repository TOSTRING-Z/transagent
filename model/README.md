# AgentInstruct 数据集处理与语义相关性分析流程文档

## 一、数据集概述

### 1.1 AgentInstruct 数据集
- **来源**：Hugging Face 平台（[数据集链接](https://huggingface.co/datasets/THUDM/AgentInstruct/viewer/default/)）
- **规模**：1866 条高质量交互记录
- **特点**：
  - 增强 AI 智能体在六类真实世界任务中的表现
  - 结合任务演化（Task Derivation）和自我指令（Self-Instruct）方法
- **任务分类**：
  - `os`：操作系统交互
  - `db`：数据库查询
  - `alfworld`：家庭环境任务
  - `webshop`：电商购物
  - `kg`：知识库问答
  - `mind2web`：网页操作

### 1.2 数据结构
```python
{
  "id": "唯一标识",
  "conversations": [
    {
      "from": "角色（human/agent）",
      "value": "内容",
      "loss": "是否计算损失（布尔值）"
    }
  ]
}
```

### 1.3 数据访问方式
```python
import pandas as pd

# 读取 Parquet 文件
df = pd.read_parquet("file_path")

# 获取第 k 个对话
conversation = df.iloc[k]["conversations"]

# 获取第 j 条消息的详情
role = conversation[j]["from"]
content = conversation[j]["value"]
loss_flag = conversation[j]["loss"]
```

### 1.4 数据遍历方法
#### 方法1：iterrows()（推荐）
```python
for i, row in df.iterrows():
    print(f"对话 {row['id']} 共 {len(row['conversations'])} 轮：")
    for turn in row["conversations"]:
        print(f"[{turn['from']}] {turn['value']}")
    print("-" * 40)
```

#### 方法2：range+下标
```python
for k in range(len(df)):
    conversation = df.iloc[k]["conversations"]
    for i in range(len(conversation)):
        turn = conversation[i]
        print(f"{turn['from']}: {turn['value']}")
```

---

## 二、数据处理流程

### 2.1 整体处理框架
```python
# 数据集路径映射
splits = {
    "os": "data/os-00000-of-00001-971539c34fcc7500.parquet",
    "db": "data/db-00000-of-00001-916a87c4725da8c0.parquet",
    "alfworld": "data/alfworld-00000-of-00001-302ad687bb3817a4.parquet",
    "webshop": "data/webshop-00000-of-00001-9f2ae60445e11b4e.parquet",
    "kg": "data/kg-00000-of-00001-9e159f6d0557d229.parquet",
    "mind2web": "data/mind2web-00000-of-00001-fc25d47330eea0fc.parquet",
}

# 选择处理的数据集
split_key = "os"
df = pd.read_parquet(splits[split_key])

all_rows = []
for k in range(len(df)):
    conversation = df.iloc[k]["conversations"]
    
    # 调用专属处理函数
    if split_key == "os":
        rows = process_single_conversation_os(conversation)
    elif split_key == "webshop":
        rows = process_single_conversation_webshop(conversation)
    elif split_key == "kg":
        rows = process_single_conversation_kg(conversation)
    elif split_key == "alfworld":
        rows = process_single_conversation_alfworld(conversation)
    
    all_rows.extend(rows)

# 保存为CSV
output_df = pd.DataFrame(all_rows, columns=["turn", "response", "label"])
output_filename = f"output_{split_key}.csv"
output_df.to_csv(output_filename, index=False)
```

### 2.2 各数据集处理逻辑

#### 2.2.1 OS（操作系统交互）数据集
```python
def process_single_conversation_os(conversation):
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human" and "The output of the OS:" not in turn['value']:
            turn_text = turn["value"]
            for j in range(0, i):
                tu = conversation[j]
                if tu['from'] == "gpt":
                    rows.append([turn_text, extract_think_os(tu['value']), 0])
                elif "The output of the OS:" not in tu['value']:
                    rows.append([turn_text, tu['value'], 0])
    return rows

def extract_think_os(gpt_value):
    """提取 Think: 部分内容"""
    think_start = gpt_value.find("Think:")
    act_start = gpt_value.find("Act:")
    return gpt_value[think_start:act_start].strip() if think_start != -1 else gpt_value
```

#### 2.2.2 Webshop（电商购物）数据集
```python
def process_single_conversation_webshop(conversation):
    rows = []
    # 跳过前两条消息（第一条为初始指令，第二条为"ok"）
    for i in range(2, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human":
            turn_text = extract_instruction_webshop(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "Thought:" in tu['value']:
                    rows.append([turn_text, extract_thought(tu['value']), 0])
                else:
                    rows.append([turn_text, extract_instruction_webshop(tu['value']), 0])
    return rows

def extract_instruction_webshop(value):
    """提取 Instruction: 部分内容"""
    if 'Instruction:' in value:
        return value.split('Instruction:')[1].split('WebShop')[0].strip()
    return value
```

#### 2.2.3 KG（知识库问答）数据集
```python
def process_single_conversation_kg(conversation):
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human" and "Observation:" not in turn['value']:
            turn_text = clean_question(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "Thought:" in tu['value']:
                    rows.append([turn_text, extract_thought(tu['value']), 0])
                elif "Observation:" not in tu['value']:
                    rows.append([turn_text, clean_question(tu['value']), 0])
    return rows

def clean_question(value):
    """清理问题文本"""
    if 'A new question:' in value:
        return value.split('A new question:')[1].strip()
    elif 'Question:' in value:
        return value.split('Question:')[1].strip()
    return value
```

#### 2.2.4 AlfWorld（家庭环境任务）数据集
```python
def process_single_conversation_alfworld(conversation):
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human" and "Observation:" not in turn['value']:
            turn_text = clean_question(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "THOUGHT:" in tu['value']:
                    rows.append([turn_text, extract_thought_alfworld(tu['value']), 0])
                else:
                    rows.append([turn_text, clean_question(tu['value']), 0])
    return rows

def extract_thought_alfworld(value):
    """提取 THOUGHT: 部分内容"""
    if 'THOUGHT:' in value:
        return value.split('THOUGHT:')[1].split('ACTION:')[0].strip()
    return value
```

### 2.3 输出数据结构
| 列名 | 描述 | 示例 |
|------|------|------|
| `turn` | 当前用户提问 | "How to list files in current directory?" |
| `response` | 历史对话响应 | "Use the ls command to list files" |
| `label` | 相似度标签（初始为0） | 0 |

---

## 三、语义相似度计算

### 3.1 环境配置
```bash
# 安装PyTorch（CUDA 11.8版本）
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 torchaudio==2.1.0+cu118 -f https://mirrors.aliyun.com/pytorch-wheels/cu118

# 安装transformers和sentence-transformers
pip install transformers sentence-transformers
```

### 3.2 GPU检测
```python
import torch

print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU device name:", torch.cuda.get_device_name(0))
    device = torch.device("cuda")
else:
    print("Using CPU")
    device = torch.device("cpu")
```

### 3.3 文本向量化

#### 方案1：BERT + 平均池化
```python
from transformers import AutoTokenizer, AutoModel
import torch

# 加载模型
model_name = "bert-base-multilingual-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name).to(device)

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output.last_hidden_state
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def text_to_vector(text):
    inputs = tokenizer(
        text, 
        padding="max_length",
        truncation=True,
        max_length=256,
        return_tensors="pt"
    ).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        return mean_pooling(outputs, inputs['attention_mask'])
```

#### 方案2：Sentence-BERT（推荐）
```python
from sentence_transformers import SentenceTransformer

# 加载多语言模型
model = SentenceTransformer('distiluse-base-multilingual-cased-v1').to(device)

def text_to_vector(text):
    return model.encode([text], convert_to_tensor=True)[0]
```

### 3.4 相似度计算与结果更新
```python
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd

def calculate_similarity(input_csv):
    df = pd.read_csv(input_csv)
    
    for index, row in df.iterrows():
        # 向量化
        turn_vector = text_to_vector(row["turn"]).cpu().numpy().reshape(1, -1)
        response_vector = text_to_vector(row["response"]).cpu().numpy().reshape(1, -1)
        
        # 计算余弦相似度
        similarity = cosine_similarity(turn_vector, response_vector)[0][0]
        df.at[index, "label"] = similarity
    
    # 保存结果
    output_csv = input_csv.replace(".csv", "_similarity.csv")
    df.to_csv(output_csv, index=False)
    return output_csv

# 使用示例
result_file = calculate_similarity("output_os.csv")
```

---

## 四、实用工具函数

### 4.1 测试套件管理器
```python
import inspect

def build_test_suite():
    """自动收集所有测试函数"""
    excluded_names = {'build_test_suite', 'run_test_suite', '__main__'}
    funcs = [
        func for name, func in globals().items()
        if callable(func) and inspect.isfunction(func) and 
           func.__module__ == "__main__" and name not in excluded_names
    ]
    return {idx: func for idx, func in enumerate(funcs)}

def run_test_suite():
    """运行测试选择器"""
    test_suite = build_test_suite()
    print("可用测试函数：")
    for idx, func in test_suite.items():
        print(f"{idx}. {func.__name__}")
    
    try:
        choice = int(input("请输入要运行的测试编号："))
        if choice in test_suite:
            print(f"\n>>> 正在运行: {test_suite[choice].__name__}()\n")
            test_suite[choice]()
        else:
            print("无效选择")
    except Exception as e:
        print(f"输入错误: {e}")

if __name__ == "__main__":
    run_test_suite()
```

### 4.2 表格比较工具
```python
import pandas as pd

class TableComparator:
    def __init__(self, file1, file2):
        self.file1 = file1
        self.file2 = file2
        self.df1 = self._load_file(file1)
        self.df2 = self._load_file(file2)
        self.diff_lines = self._find_differences()
    
    def _load_file(self, file_path):
        if file_path.endswith('.csv') or file_path.endswith('.tsv'):
            return pd.read_csv(file_path)
        elif file_path.endswith(('.xls', '.xlsx')):
            return pd.read_excel(file_path)
        else:
            raise ValueError("不支持的文件格式")
    
    def _find_differences(self):
        diff_lines = []
        min_len = min(len(self.df1), len(self.df2))
        
        # 比较表头
        if list(self.df1.columns) != list(self.df2.columns):
            diff_lines.append(0)
        
        # 比较内容
        for i in range(min_len):
            if not self.df1.iloc[i].equals(self.df2.iloc[i]):
                diff_lines.append(i+1)
        
        # 检查行数差异
        if len(self.df1) != len(self.df2):
            diff_lines.extend(range(min_len+1, max(len(self.df1), len(self.df2))+1))
        
        return diff_lines
    
    def print_differences(self, mode=0):
        if mode == 0:
            print(f"差异行号: {self.diff_lines}")
        else:
            for line in self.diff_lines:
                if line == 0:
                    print("\n[表头差异]")
                    print(f"文件1: {list(self.df1.columns)}")
                    print(f"文件2: {list(self.df2.columns)}")
                else:
                    idx = line - 1
                    print(f"\n[第 {line} 行差异]")
                    if idx < len(self.df1):
                        print(f"{self.file1}: {self.df1.iloc[idx].values}")
                    if idx < len(self.df2):
                        print(f"{self.file2}: {self.df2.iloc[idx].values}")
    
    def query_differences_by_range(self, start_line, end_line):
        """查询指定范围内的差异"""
        in_range = [line for line in self.diff_lines if start_line <= line <= end_line]
        print(f"行号 {start_line}-{end_line} 内的差异: {in_range}")
        self.print_differences(mode=1)

# 使用示例
comparator = TableComparator("output_os.csv", "output_os_similarity.csv")
comparator.print_differences(mode=1)
comparator.query_differences_by_range(10, 20)
```

---

## 五、注意事项与最佳实践

### 5.1 数据处理注意事项
1. **数据清洗**：各数据集需使用专用清洗函数提取关键内容
2. **特殊消息处理**：
   - OS：过滤含"The output of the OS:"的消息
   - Webshop/KG/AlfWorld：跳过前两条消息
3. **历史对话范围**：只考虑当前消息之前的对话记录

### 5.2 相似度计算优化建议
| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **BERT+平均池化** | 灵活可定制 | 计算效率较低 | 需要特殊模型微调 |
| **Sentence-BERT** | 计算高效、专门优化 | 模型选择有限 | 大多数语义相似度任务 |
| **SimCSE** | 无监督表现好 | 训练成本高 | 缺乏标注数据时 |

### 5.3 性能优化技巧
1. **批量处理**：使用批量推理加速向量化
   ```python
   def batch_text_to_vector(texts, batch_size=32):
       return model.encode(texts, batch_size=batch_size, convert_to_tensor=True)
   ```
   
2. **相似度计算并行化**：
   ```python
   from joblib import Parallel, delayed
   
   def parallel_similarity(df):
       results = Parallel(n_jobs=4)(delayed(calculate_row)(row) for _, row in df.iterrows())
       df["label"] = results
       return df
   ```

3. **内存管理**：
   ```python
   # 使用迭代器处理大文件
   chunk_iter = pd.read_csv("large_file.csv", chunksize=1000)
   for chunk in chunk_iter:
       processed_chunk = calculate_similarity(chunk)
       processed_chunk.to_csv("output.csv", mode="a")
   ```

