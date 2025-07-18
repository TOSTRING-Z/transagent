import os
import torch
import utils
import pandas as pd
from compare import TableComparator
import inspect

os.chdir("D:/0learn_record/manage_agent_code")

splits = {
    "os": "data/os-00000-of-00001-971539c34fcc7500.parquet",
    "db": "data/db-00000-of-00001-916a87c4725da8c0.parquet",
    "alfworld": "data/alfworld-00000-of-00001-302ad687bb3817a4.parquet",
    "webshop": "data/webshop-00000-of-00001-9f2ae60445e11b4e.parquet",
    "kg": "data/kg-00000-of-00001-9e159f6d0557d229.parquet",
    "mind2web": "data/mind2web-00000-of-00001-fc25d47330eea0fc.parquet",
}

# 测试函数
def t0():
    comparator = TableComparator("output_os.csv", "output_os_bert_similarity.csv")
    # comparator.print_differences(mode=1)
    comparator.query_differences_by_range(0,10)
def t1():
    df = pd.read_parquet(splits["kg"])
    print(df.iloc[0])
def t2():
    print("CUDA available:", torch.cuda.is_available())
    print("CUDA device name:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "No GPU found")

# 自动收集所有自定义函数，并映射为从0开始的编号
import inspect

def build_test_suite():
    excluded_names = {'build_test_suite', 'run_test_suite', '__main__'}
    funcs = [
        func
        for name, func in globals().items()
        if (
            callable(func) and
            inspect.isfunction(func) and
            func.__module__ == "__main__" and
            name not in excluded_names
        )
    ]
    test_funcs = {idx: func for idx, func in enumerate(funcs)}
    return test_funcs

def run_test_suite():
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
