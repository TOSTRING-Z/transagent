from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, PreTrainedTokenizer
import os

app = FastAPI()


class PredictionRequest(BaseModel):
    query: str
    passage: str


model_path = "/home/tostring/.cache/modelscope/hub/models/"
model_name = "Qwen/Qwen3-1.7B"
pretrained_model_name_or_path = os.path.join(model_path, model_name)
tokenizer: PreTrainedTokenizer = AutoTokenizer.from_pretrained(
    pretrained_model_name_or_path
)
model = AutoModelForCausalLM.from_pretrained(pretrained_model_name_or_path)
yes_loc = tokenizer("Yes", add_special_tokens=False)["input_ids"][0]
no_loc = tokenizer("No", add_special_tokens=False)["input_ids"][0]
unknown_loc = tokenizer("Unknown", add_special_tokens=False)["input_ids"][0]
model.eval()


@app.post("/predict")
async def predict(request: PredictionRequest):
    with torch.no_grad():
        input = get_inputs(request.query, request.passage, tokenizer)
        output = model(**input, return_dict=True)
        scores = output.logits[:, -1, [no_loc, yes_loc, unknown_loc]].float()
        labels = torch.argmax(scores, dim=1)
        return {"prediction": labels.item()}


def get_inputs(user_input, history, tokenizer: PreTrainedTokenizer):

    query = user_input
    passage = history
    messages = [
        {
            "role": "system",
            "content": "Determine if Passage B has any relation to Query A. Answer 'Yes' if related, 'No' if not. If Query A is unclear or ambiguous, answer 'Unknown'.",
        },
        {
            "role": "user",
            "content": f"*Query A*: {query}\n*Passage B*: {passage}",
        },
        {"role": "assistant", "content": "Answer: '"},
    ]
    rendered_chat = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
        continue_final_message=True,
    )
    inputs = tokenizer(
        rendered_chat,
        return_tensors="pt",
    )
    return inputs
