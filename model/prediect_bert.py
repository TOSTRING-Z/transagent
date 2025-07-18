import os
import torch
from transformers import BertTokenizer, BertModel
import pandas as pd
from torch.nn.functional import cosine_similarity

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")
os.chdir("D:/0learn_record/manage_agent_code")
# 加载微调后的模型和tokenizer
model_path = "bert-base-multilingual-cased"
tokenizer = BertTokenizer.from_pretrained(model_path)
model = BertModel.from_pretrained(model_path)
# 将模型移至GPU
model = model.to(device)

def mean_pooling(model_output, attention_mask):
    """
    对模型输出进行 mean pooling（平均池化），忽略 padding token。
    :param model_output: 模型输出 (包含 last_hidden_state)
    :param attention_mask: 注意力掩码 (1=有效，0=padding)
    :return: 平均池化后的向量 (batch_size, hidden_size)
    """
    token_embeddings = model_output.last_hidden_state  # (1, seq_len, 768)
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return (token_embeddings * input_mask_expanded).sum(1) / input_mask_expanded.sum(1)

def predict(input):
    """
    使用微调后的模型进行预测
    :param input: 对话文本
    :return: 预测结果 (0或1)
    """
    inputs = tokenizer(
        input,
        padding="max_length",
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
# 将输入数据送入BERT模型，计算模型输出的token向量后，利用平均池化得到句子的整体向量表示，并返回该句向量。
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
        pooler_output = mean_pooling(outputs, inputs['attention_mask'])
        return pooler_output
if __name__ == "__main__":
    split_key = "kg" 
    input_file = f"output_{split_key}.csv"
    output_file = f"output_{split_key}_bert_similarity.csv"
    df = pd.read_csv(input_file)
    for i in range(len(df)):
        turn = df.iloc[i]['turn']
        response = df.iloc[i]['response']
        
        # 获取两个文本的嵌入向量
        result_turn = predict(turn)
        result_response = predict(response)
        
        # 计算余弦相似度
        similarity = cosine_similarity(result_turn, result_response)
        print(f"Row {i}: Similarity = {similarity.item():.4f}")
        
        # 将相似度值从GPU移至CPU并转换为NumPy数组
        similarity_np = similarity.cpu().numpy()
        df.at[i, "label"] = similarity_np[0]
    
    df.to_csv(output_file, index=False)

