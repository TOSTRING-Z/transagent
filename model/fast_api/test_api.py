import requests
import time

# 测试FastAPI应用的/predict端点
def test_predict():
    url = "http://127.0.0.1:8080/predict"
    data = {
        "query": "what is panda?",
        "passage": "The giant panda (Ailuropoda melanoleuca), sometimes called a panda bear or simply panda, is a bear species endemic to China."
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