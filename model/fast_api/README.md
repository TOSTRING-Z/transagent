# FastAPI 测试脚本使用指南

## 环境准备
1. Python 3.7+
2. 安装依赖包：
```bash
pip install fastapi uvicorn requests
```

## 文件说明
- `main.py`: FastAPI主应用文件
- `test_api.py`: API测试脚本

## 启动步骤

### 1. 启动FastAPI服务
```bash
uvicorn main:app --host 0.0.0.0 --port 3004
```

### 2. 运行测试脚本
```bash
python test_api.py
```

### 3. 测试结果说明
- 成功响应示例：
```json
{"prediction": "Yes"}
```
- 失败时会显示详细错误信息

## 高级配置

### 自定义测试参数
修改test_api.py中的以下部分：
```python
data = {
    "query": "自定义查询问题",
    "passage": "自定义文本段落"
}
```

### 调整重试机制
修改max_retries和等待时间：
```python
max_retries = 5  # 最大重试次数
time.sleep(3)  # 等待时间(秒)
```

## 常见问题
1. 端口冲突：
   - 修改--port参数使用其他端口
2. 依赖安装失败：
   - 使用虚拟环境
   - 检查Python版本
3. API无响应：
   - 确认服务已启动
   - 检查防火墙设置

## 文档版本
v1.0 2025-07-24