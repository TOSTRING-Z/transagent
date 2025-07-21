import torch
from transformers import BertTokenizer, BertForSequenceClassification

# 加载微调后的模型和tokenizer
model_path = "/data/zgr/transagent/model/saved_model/epoch_28"
tokenizer = BertTokenizer.from_pretrained(model_path)
model = BertForSequenceClassification.from_pretrained(model_path)
q=1

def predict(user_input, history):
    """
    使用微调后的模型进行预测
    :param history: 历史对话文本
    :param user_input: 用户输入文本
    :return: 预测结果 (0或1)
    """
    # 预处理输入
    inputs = tokenizer(
        user_input,
        history,
        padding="max_length",
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
    # 确保输入有正确的形状 (batch_size=1, seq_length)
    inputs = {k: v.unsqueeze(0) if len(v.shape) == 1 else v for k, v in inputs.items()}
    for k, v in inputs.items():
        print(k, v, v.type())

    # 进行预测
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        print(logits)
        prediction = torch.argmax(logits, dim=1).item()

    return prediction


if __name__ == "__main__":
    # 示例用法
    user_input = "How can I improve the specificity of transcription factor binding predictions using TRAPT?"
    history = "TRAPT is a powerful tool for predicting transcriptional regulators based on sequence similarity. However, achieving high specificity often requires fine-tuning parameters and considering additional genomic features. Have you tried optimizing the threshold or incorporating epigenetic marks into your analysis?"
    data = [
        {"user_input": user_input, "history": history},
    ]
    for item in data:
        user_input = item["user_input"]
        history = item["history"]
        # 调用预测函数
        result = predict(user_input, history)
        print(f"预测结果: {result}")
