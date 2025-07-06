const { AutoTokenizer, AutoModelForSequenceClassification, env } = require('@xenova/transformers');

async function loadModel(modelName) {
    const tokenizer = await AutoTokenizer.from_pretrained(modelName);
    const model = await AutoModelForSequenceClassification.from_pretrained(modelName);
    return { tokenizer, model };
}

async function predict(user_input, history, tokenizer, model) {
    /*
    使用微调后的模型进行预测
    @param {string} history - 历史对话文本
    @param {string} user_input - 用户输入文本
    @returns {Promise<number>} 预测结果 (0或1)
    */
    const inputs = await tokenizer(
        user_input + history,
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
    // 加载微调后的模型和tokenizer
    const retry_time = params?.retry_time || 3;
    const modelName = params?.modelName || "epoch_10";
    env.allowRemoteModels = params?.allowRemoteModels || false;
    env.localModelPath = params?.localModelPath || "/data/zgr/transagent/model/saved_model/";
    return async ({ user_input, history }) => {
        // 示例用法
        // const user_input = "Re execute ROSE and CRCmapper analysis";
        // const history = "The ROSE_main.py script does not support verbose output (-v flag), and the output directory contains some files but not the critical 'peaks_SuperEnhancers.table.txt'. Given that we've verified the input files are valid and the script is still failing, I will now proceed with the CRCmapper analysis using the available files, as the super-enhancer identification step may have completed partially. The CRCmapper can work with the existing output files in the ROSE_output directory.";
        const { tokenizer, model } = await loadModel(modelName);
        // 最多尝试3次
        for (let i = 1; i < retry_time; i++) {
            try {
                const result = await predict(user_input, history, tokenizer, model);
                if (result)
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
