from sentence_transformers import SentenceTransformer
import pandas as pd
import torch
import torch.nn.functional as F
import os
# 设置设备（优先使用 GPU）
device = "cuda" if torch.cuda.is_available() else "cpu"
# 加载 Sentence-BERT 模型并移动到 GPU
model = SentenceTransformer('distiluse-base-multilingual-cased-v1').to(device)
def generate_output_path(input_path):
    base, ext = os.path.splitext(input_path)
    return f"{base}_third_similarity{ext}"
def get_embedding(text):
    # 返回 GPU 上的张量
    return model.encode(text, convert_to_tensor=True)  # 自动使用 GPU

if __name__ == "__main__":
    split_key = "kg" 
    input_file = f"output_{split_key}.csv"
    output_file = f"output_{split_key}_sentence_bert_similarity.csv"
    df = pd.read_csv(input_file)
    for i in range(len(df)):
        turn = df.iloc[i]['turn']
        response = df.iloc[i]['response']
        # 获取嵌入向量（已在 GPU 上）
        emb_turn = get_embedding(turn).unsqueeze(0)  # 增加 batch 维度
        emb_response = get_embedding(response).unsqueeze(0)
        # 使用 PyTorch 的 GPU 加速余弦相似度计算
        similarity = F.cosine_similarity(emb_turn, emb_response).item()
        df.at[i, "label"] = similarity
        print(f"{i}: {similarity:.4f}")
    df.to_csv(output_file, index=False)