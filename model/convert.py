import os
from transformers import BertForSequenceClassification, AutoModelForCausalLM
import torch

# 模型路径
model_path = "/home/tostring/.cache/modelscope/hub/models/"
model_name = "google-bert/bert-base-multilingual-cased"
pretrained_model_name_or_path = os.path.join(model_path, model_name)
onnx_dir = os.path.join(pretrained_model_name_or_path, "onnx")

# 确保onnx目录存在
os.makedirs(onnx_dir, exist_ok=True)
mode = "BERT"
# 加载模型
try:

    if mode == "BERT":
        model = BertForSequenceClassification.from_pretrained(
            pretrained_model_name_or_path
        )
        print(model)
        model.eval()
        # 创建虚拟输入
        dummy_input = (
            torch.ones(1, 256, dtype=torch.long, requires_grad=False),
            torch.ones(1, 256, dtype=torch.long, requires_grad=False),
            torch.ones(1, 256, dtype=torch.long, requires_grad=False),
        )

        # 导出为ONNX
        torch.onnx.export(
            model,
            dummy_input,
            os.path.join(onnx_dir, "model.onnx"),
            export_params=True,
            input_names=["input_ids", "attention_mask", "token_type_ids"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence"},
                "attention_mask": {0: "batch_size", 1: "sequence"},
                "token_type_ids": {0: "batch_size", 1: "sequence"},
                "logits": {0: "batch_size"},
            },
        )
    if mode == "BGE":
        model = AutoModelForCausalLM.from_pretrained(pretrained_model_name_or_path)
        print(model)
        model.eval()
        # 创建虚拟输入
        dummy_input = (
            torch.ones(1, 1024, dtype=torch.long, requires_grad=False),
            torch.ones(1, 1024, dtype=torch.long, requires_grad=False),
        )

        # 导出为ONNX
        torch.onnx.export(
            model,
            dummy_input,
            os.path.join(onnx_dir, "model.onnx"),
            export_params=True,
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence"},
                "attention_mask": {0: "batch_size", 1: "sequence"},
                "logits": {0: "batch_size"},
            },
        )
    print("成功将模型转换为ONNX格式")
except Exception as e:
    print(f"转换模型时出错: {str(e)}")
