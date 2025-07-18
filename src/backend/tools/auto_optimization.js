const { AutoTokenizer, AutoModelForSequenceClassification, env } = require('@huggingface/transformers');

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

async function predict(user_input, history, tokenizer, model, mode = "BERT") {
    /*
    使用微调后的模型进行预测
    @param {string} history - 历史对话文本
    @param {string} user_input - 用户输入文本
    @returns {Promise<number>} 预测结果 (0或1)
    */
    if (mode == "BERT") {
        const inputs = await tokenizer(
            user_input + tokenizer.sep_token + history,
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
    if (mode == "BGE") {
        const prompt = "Given a query A and a passage B, determine whether the passage contains an answer to the query by providing a prediction of either 'Yes' or 'No'."
        const sep = "\n"
        const prompt_inputs = await tokenizer(prompt, { return_tensors: null, add_special_tokens: false })[
            "input_ids"
        ]
        const sep_inputs = await tokenizer(sep, { return_tensors: null, add_special_tokens: false })[
            "input_ids"
        ]
        const max_length = 1024
        const query_inputs = await tokenizer(
            `A: ${user_input}`,
            {
                return_tensors: null,
                add_special_tokens: false,
                max_length: max_length * parseInt(3 / 4),
                truncation: true,
            }
        )
        const passage_inputs = await tokenizer(
            `B: ${history}`,
            {
                return_tensors: null,
                add_special_tokens: false,
                max_length: max_length,
                truncation: true,
            }
        )
        const item = tokenizer.prepare_for_model(
            [tokenizer.bos_token_id] + query_inputs["input_ids"],
            sep_inputs + passage_inputs["input_ids"],
            {
                truncation: "only_second",
                max_length: max_length,
                padding: false,
                return_attention_mask: false,
                return_token_type_ids: false,
                add_special_tokens: false,
            }
        )
        item["input_ids"] = item["input_ids"] + sep_inputs + prompt_inputs
        item["attention_mask"] = [1] * item["input_ids"].length;
        const inputs = tokenizer.pad(
            [item],
            {
                padding: true,
                max_length: max_length + sep_inputs.length + prompt_inputs.length,
                pad_to_multiple_of: 8,
                return_tensors: "pt",
            }
        )
        const output = await model(inputs);
        const scores = output.logits.slice(-1)[0];  // Get last element
        const prediction = scores.data[0] > scores.data[1] ? 0 : 1;
        return prediction;
    }
}

function main(params) {
    return async ({ user_input, history }) => {
        const retry_time = params?.retry_time || 3;
        const modelName = params?.model_name;
        env.allowRemoteModels = params?.allow_remote_models || false;
        env.localModelPath = params?.local_model_path;
        const models = await loadModel(modelName);
        if (models === null) return null;
        const { tokenizer, model } = models;
        for (let i = 1; i < retry_time; i++) {
            try {
                const result = await predict(user_input, history, tokenizer, model);
                console.log(history, result);
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
