
// 测试FastAPI应用的/predict端点
async function predict(query, passage, retry_time, url) {
    const data = {
        query,
        passage
    };

    try {
        // 添加重试机制
        const maxRetries = retry_time;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    timeout: 10000
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const responseData = await response.json();
                console.log(`query: ${query.slice(0, 20)}..., passage: ${passage.slice(0, 20)}..., response: ${JSON.stringify(responseData)}`);
                return responseData.prediction;
            } catch (error) {
                console.log(`尝试 ${attempt + 1}/${maxRetries} 失败: ${error.message}`);
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.log("失败:", error.message);
    }
}

function main(params) {
    return async ({ query, history }) => {
        const retry_time = params?.retry_time || 3;
        const url = params?.url || "http://127.0.0.1:3004/predict";
        const result = await predict(query, history, retry_time, url);
        return result;
    }
}

module.exports = {
    main
};
