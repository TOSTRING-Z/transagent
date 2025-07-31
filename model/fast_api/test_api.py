import requests
import time


# 测试FastAPI应用的/predict端点
def test_predict():
    url = "http://127.0.0.1:3004/predict"
    data = {
        "query": "展示任务列表",
        "passage": "已成功显示转录因子绑定区域与eQTL的重叠分析结果。接下来，我们将展示转录因子绑定区域与超级增强子的重叠分析结果，并提供进一步分析的建议选项。",
    }

    try:
        # 添加重试机制
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=data, timeout=10)
                response.raise_for_status()  # 检查HTTP错误
                print("API响应:", response.json())
                return
            except requests.exceptions.RequestException as e:
                print(f"尝试 {attempt + 1}/{max_retries} 失败: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2)  # 等待2秒后重试
                else:
                    print("响应内容:", response.text)  # 打印原始响应内容
                    raise
    except Exception as e:
        print("测试失败:", str(e))


if __name__ == "__main__":
    test_predict()
