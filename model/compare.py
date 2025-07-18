import pandas as pd
import os

class TableComparator:
    def __init__(self, file1_path, file2_path):
        self.file1_path = file1_path
        self.file2_path = file2_path
        self.differences = []
        self.same = True
        self.df1 = None
        self.df2 = None
        self.compare() 

    def read_file(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext == '.csv':
            return pd.read_csv(path, dtype=str).fillna("")
        elif ext == '.tsv':
            return pd.read_csv(path, sep='\t', dtype=str).fillna("")
        elif ext in ['.xls', '.xlsx']:
            return pd.read_excel(path, dtype=str).fillna("")
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

    def compare(self):
        self.df1 = self.read_file(self.file1_path)
        self.df2 = self.read_file(self.file2_path)

        cols1 = list(self.df1.columns)
        cols2 = list(self.df2.columns)
        if cols1 != cols2:
            self.same = False
            self.differences.append((0, {"表头": (cols1, cols2)}))

        self.df2 = self.df2.reindex(columns=cols1, fill_value="")

        max_rows = max(len(self.df1), len(self.df2))
        self.df1 = self.df1.reindex(range(max_rows)).fillna("")
        self.df2 = self.df2.reindex(range(max_rows)).fillna("")

        for i in range(max_rows):
            row1 = self.df1.iloc[i]
            row2 = self.df2.iloc[i]
            diff_cols = {}
            for col in cols1:
                val1 = row1.get(col, "")
                val2 = row2.get(col, "")
                if pd.isna(val1):
                    val1 = ""
                if pd.isna(val2):
                    val2 = ""
                if str(val1) != str(val2):
                    diff_cols[col] = (val1, val2)
            if diff_cols:
                self.same = False
                self.differences.append((i + 1, diff_cols))

    def print_differences(self, mode=0):
        if self.same:
            print("两个文件完全相同。")
            return

        if mode == 0:
            line_nums = [line_num for line_num, _ in self.differences]
            print("差异行号（含表头为0）：", line_nums)
        else:
            print("详细差异内容：")
            for line_num, diff_cols in self.differences:
                if line_num == 0:
                    print("表头不同：")
                else:
                    print(f"第{line_num}行不同：")
                for col, (val1, val2) in diff_cols.items():
                    print(f"  列名: {col}")
                    print(f"    文件1: {val1}")
                    print(f"    文件2: {val2}")
                print("-" * 40)

    def query_differences_by_range(self, start_line=0, end_line=None):
        if end_line is None:
            end_line = max(line for line, _ in self.differences) if self.differences else 0
        
        found = False
        for line_num, diff_cols in self.differences:
            if start_line <= line_num <= end_line:
                found = True
                if line_num == 0:
                    print("表头不同：")
                else:
                    print(f"第{line_num}行不同：")
                for col, (val1, val2) in diff_cols.items():
                    print(f"  列名: {col}")
                    print(f"    文件1: {val1}")
                    print(f"    文件2: {val2}")
                print("-" * 40)
        
        if not found:
            print(f"在行号范围[{start_line}, {end_line}]内没有差异。")
