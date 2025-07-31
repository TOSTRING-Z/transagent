import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    PreTrainedTokenizer,
    PreTrainedModel,
)
import os


model_path = "/home/tostring/.cache/modelscope/hub/models/"
model_name = "Qwen/Qwen3-1.7B"
pretrained_model_name_or_path = os.path.join(model_path, model_name)
tokenizer: PreTrainedTokenizer = AutoTokenizer.from_pretrained(
    pretrained_model_name_or_path
)
print(tokenizer.chat_template)
model: PreTrainedModel = AutoModelForCausalLM.from_pretrained(
    pretrained_model_name_or_path
)
# model = model.to("cuda")
model.eval()

query = "衡山属于衡阳吗"
passage = "成都是四川省的省会城市，位于中国西南部。"
messages = [
    {
        "role": "system",
        "content": "Determine if Passage B has any relation to Query A. Answer 'Yes' if related, 'No' if not related, 'Unknown' if uncertain.",
    },
    {
        "role": "user",
        "content": f"*Query A*: {query}\n*Passage B*: {passage}",
    },
    {"role": "assistant", "content": "Answer: '"},
]

with torch.no_grad():
    rendered_chat = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
        continue_final_message=True,
    )
    print(rendered_chat)
    inputs = tokenizer(
        rendered_chat,
        return_tensors="pt",
    )
    output = model(**inputs, return_dict=True)
    print("--" * 20)
    yes_loc = tokenizer("Yes", add_special_tokens=False)["input_ids"][0]
    no_loc = tokenizer("No", add_special_tokens=False)["input_ids"][0]
    scores = output.logits[:, -1, [no_loc, yes_loc]].float()
    labels = torch.argmax(scores, dim=1)
    print([no_loc, yes_loc], scores, labels.item())
    print("--" * 20)
    tokens = torch.argmax(output.logits, dim=-1)
    print(
        tokenizer.decode(
            inputs["input_ids"][0],
            skip_special_tokens=False,
            clean_up_tokenization_spaces=False,
        ),
    )
    print("--" * 20)
    print(
        tokens[0][-1:],
        tokenizer.decode(
            tokens[0][-1:],
            skip_special_tokens=False,
            clean_up_tokenization_spaces=False,
        ),
    )
    print("--" * 20)
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=False,
        continue_final_message=True,
        return_tensors="pt",
    )
    output = model.generate(
        inputs,
        max_new_tokens=1,
        do_sample=False,
        use_cache=True,
        early_stopping=True,
        return_dict_in_generate=True,
    )
    print(
        tokenizer.decode(
            output.sequences[0][inputs.shape[1] :],
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        ).strip()
    )
