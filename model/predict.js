const { AutoTokenizer, AutoModelForSequenceClassification, AutoModelForCausalLM, env } = require('@huggingface/transformers');

// 加载微调后的模型和tokenizer
const modelName = "google-bert/bert-base-multilingual-cased";
env.allowRemoteModels = false;
env.localModelPath = "/home/tostring/.cache/modelscope/hub/models/";
const mode = "BERT"

async function loadModel() {
    if (mode == "BERT") {
        const tokenizer = await AutoTokenizer.from_pretrained(modelName);
        const model = await AutoModelForSequenceClassification.from_pretrained(modelName);
        return { tokenizer, model };
    }
    if (mode == "BGE") {
        const tokenizer = await AutoTokenizer.from_pretrained(modelName);
        const model = await AutoModelForCausalLM.from_pretrained(modelName);
        return { tokenizer, model };
    }
}

async function predict(user_input, history, tokenizer, model) {
    /*
    使用微调后的模型进行预测
    @param {string} history - 历史对话文本
    @param {string} user_input - 用户输入文本
    @returns {Promise<number>} 预测结果 (0或1)
    */
    if (mode == "BERT") {
        const inputs = await tokenizer(
            user_input + ["[SEP]"] + history,
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

async function main() {
    // 示例用法
    const user_input = "请帮我分析一下这个新药在治疗感染性疾病中的效果";
    const history = "我们已经讨论了药物A和药物B在之前的临床试验中对抗病毒的效果，但还";
    const data = [{ "user_input": user_input, "history": history }];
    
    const { tokenizer, model } = await loadModel();
    
    for (const item of data) {
        const user_input = item["user_input"];
        const history = item["history"];
        // 调用预测函数
        const result = await predict(user_input, history, tokenizer, model);
        console.log(`预测结果: ${result}`);
    }
}

main().catch(console.error);
