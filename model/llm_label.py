import requests
import json
import time
import pandas as pd

# Ollama API配置
API_URL = "http://localhost:11434/api/chat"
MODEL = "deepseek-coder-v2"

# 提示词模板
PROMPT_TEMPLATE = """# Task Context Evaluation
Determine whether the following historical messages are helpful for completing the current user task.

# Output Format
Return a single digit only (no explanations, additional notes, or other content):
- 1 = Helpful
- 0 = Not helpful

# Evaluation Parameters
Historical messages: {history}
User task: {user_input}
Output:"""

def call_ollama_api(history, user_input):
    """调用Ollama API获取判断"""
    prompt = PROMPT_TEMPLATE.format(history=history, user_input=user_input)
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(API_URL, json=payload, stream=True)
        response.raise_for_status()
        
        full_content = ""
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line)
                if "message" in chunk and "content" in chunk["message"]:
                    full_content += chunk["message"]["content"]
        
        return full_content.strip()
    except Exception as e:
        print(f"API调用失败: {e}")
        return None

def process_data(input_file, output_file):
    """处理数据文件并生成标签"""
    with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
        for i, line in enumerate(f_in):
            history, user_input, label = line.strip().split('\t')
            if i < 11000:
                response = call_ollama_api(history, user_input)
                # 从响应中提取最后一个数字作为标签
                label = '0'
                if response:
                    # print(response)
                    for char in reversed(response):
                        if char in ('0', '1'):
                            label = char
                            break
            
                # 避免频繁调用API
                time.sleep(0.1)
            f_out.write(f"{history}\t{user_input}\t{label}\n")
            print(f"已处理: {history[:20]}... | {user_input[:20]}... | 标签: {label}")
            

if __name__ == "__main__":
    input_file = "data/train.txt"
    output_file = "data/train_labeled.txt"
    process_data(input_file, output_file)
    data = pd.read_csv(output_file,sep="\t",header=None)