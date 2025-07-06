const { AutoTokenizer, AutoModelForSequenceClassification, env } = require('@xenova/transformers');

async function loadModel(modelName) {
    try {
        const tokenizer = await AutoTokenizer.from_pretrained(modelName);
        const model = await AutoModelForSequenceClassification.from_pretrained(modelName);
        return { tokenizer, model };
    } catch (error) {
        console.log(error)
        return null;
    }
}

async function predict(user_input, history, tokenizer, model) {
    /*
    使用微调后的模型进行预测
    @param {string} history - 历史对话文本
    @param {string} user_input - 用户输入文本
    @returns {Promise<number>} 预测结果 (0或1)
    */
    const inputs = await tokenizer(
        user_input + [tokenizer.sep_token] + history,
        {
            padding: "max_length",
            truncation: true,
            max_length: 256,
            return_tensors: "pt",
        }
    );

    const outputs = await model(inputs);
    const logits = outputs.logits;
    const prediction = logits.data[0] > logits.data[1] ? 0 : 1;

    return prediction;
}

function main(params) {
    return async ({ user_input, history }) => {
        const retry_time = params?.retry_time || 3;
        const modelName = params?.model_name || "epoch_10";
        env.allowRemoteModels = params?.allow_remote_models || false;
        env.localModelPath = params?.local_model_path || "/data/zgr/transagent/model/saved_model/";
        const models = await loadModel(modelName);
        if (models === null) return null;
        const { tokenizer, model } = models;
        for (let i = 1; i < retry_time; i++) {
            try {
                const result = await predict(user_input, history, tokenizer, model);
                console.log(history,result);
                if (result !== null)
                    return result;
            } catch (error) {
                console.log(error)
            }
        }
    }
}

module.exports = {
    main
};
