import torch
from transformers import BertTokenizer, BertForSequenceClassification
from torch.optim import AdamW
from torch.nn import BCEWithLogitsLoss
from torch.utils.data import Dataset, DataLoader
from torch.utils.tensorboard import SummaryWriter
from transformers import logging
import pandas as pd

logging.set_verbosity_error()  # 隐藏这个特定警告
from tqdm import tqdm


# 训练样本数据
class RandomDataset(Dataset):
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        self.data = self._load_data_pandas()

    def _load_data_pandas(self):

        df = pd.read_csv(
            "/data/zgr/transagent/model/data/train_labeled.txt.csv",
            sep="\t",
            header=None,
            names=["user_input", "history", "label"],
            low_memory=False,  # 避免低内存模式导致的类型推断问题
            encoding_errors="ignore",
        )
        df = df.dropna()  # 删除缺失值
        df = df.query("label in [0, 1]")  # 只保留标签为0或1的行
        df["label"] = df["label"].astype(int)  # 确保标签为整数类型
        return df.values.tolist()

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        user_input, history, label = self.data[idx]
        # 随机在区间[0-random(0.5,1)]间截断history
        if isinstance(history, str) and len(history) > 10:
            trunc_ratio = torch.empty(1).uniform_(0.5, 1.0).item()
            trunc_len = int(len(history) * trunc_ratio)
            history = history[:trunc_len]
        inputs = self.tokenizer(
            user_input,
            history,
            padding="max_length",
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        inputs = {k: v.squeeze(0) for k, v in inputs.items()}  # 移除可能存在的batch维度
        inputs["labels"] = torch.tensor(label, dtype=torch.long)
        return inputs


# 主函数
def main():
    # 从本地加载BERT模型和tokenizer
    model_path = "/home/tostring/.cache/modelscope/hub/models/google-bert/bert-base-multilingual-cased"
    writer = SummaryWriter("/data/zgr/transagent/model/runs")
    tokenizer = BertTokenizer.from_pretrained(model_path)
    model = BertForSequenceClassification.from_pretrained(model_path, num_labels=2)

    # 准备数据
    dataset = RandomDataset(tokenizer)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

    # 训练模型
    optimizer = AdamW(model.parameters(), lr=5e-5)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    model.to(device)
    # 确保模型和tokenizer在同一设备上
    min_loss = torch.inf  # 初始化最小损失为正无穷大
    model.train()
    for epoch in range(50):  # 3个epoch
        total_loss = 0
        progress_bar = tqdm(enumerate(dataloader), desc=f"Epoch {epoch + 1}")
        for i, batch in progress_bar:
            batch = {
                k: v.to(device) for k, v in batch.items()
            }  # 将batch数据移动到设备上
            optimizer.zero_grad()
            outputs = model(**batch)
            # loss = outputs.loss
            loss_fct = BCEWithLogitsLoss()
            loss = loss_fct(outputs.logits, batch.labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            writer.add_scalar("Loss/train", loss.item(), epoch * len(dataloader) + i)
            progress_bar.set_postfix({"loss": loss.item()})
        avg_loss = total_loss / len(dataloader)
        writer.add_scalar("Avg Loss/train", avg_loss, epoch)
        print(f"Epoch {epoch + 1} average loss: {avg_loss}")

        # 保存模型
        if avg_loss < min_loss:
            model.save_pretrained(f"saved_model/epoch_{epoch + 1}")
            tokenizer.save_pretrained(f"saved_model/epoch_{epoch + 1}")
            min_loss = avg_loss
    writer.close()


if __name__ == "__main__":
    main()
