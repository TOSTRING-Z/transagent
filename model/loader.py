import pandas as pd
import os
import utils
os.chdir("D:/0learn_record/manage_agent_code")
splits = {
    "os": "data/os-00000-of-00001-971539c34fcc7500.parquet",
    "db": "data/db-00000-of-00001-916a87c4725da8c0.parquet",
    "alfworld": "data/alfworld-00000-of-00001-302ad687bb3817a4.parquet",
    "webshop": "data/webshop-00000-of-00001-9f2ae60445e11b4e.parquet",
    "kg": "data/kg-00000-of-00001-9e159f6d0557d229.parquet",
    "mind2web": "data/mind2web-00000-of-00001-fc25d47330eea0fc.parquet",
}
if __name__ == "__main__":
    #设置要处理的数据集名称
    split_key = "alfworld"
    # 读取对应数据集的 parquet 文件，加载为 DataFrame
    df = pd.read_parquet(splits[split_key])
    # 根据数据集名称，自动拼接对应的处理函数名
    func_name = f"process_single_conversation_{split_key}"
    # 通过 getattr 动态获取处理函数对象
    process_func = getattr(utils, func_name)
    # 存储所有对话处理后的结果
    all_rows = []
    #遍历数据集中的每条对话记录
    for k in range(0,len(df)):
        conversation=df.iloc[k]["conversations"]
        #调用对应数据集的处理函数进行处理，返回 [turn, response, label] 格式的多行数据
        rows=process_func(conversation)
        #将处理后的多行结果添加到总列表中
        all_rows.extend(rows)
    #构造最终 DataFrame 并保存为 CSV 文件
    output_df = pd.DataFrame(all_rows, columns=["turn", "response", "label"])
    output_filename = f"output_{split_key}.csv"
    output_df.to_csv(output_filename, index=False)