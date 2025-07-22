from fastapi import FastAPI
from pydantic import BaseModel
import torch
from modelscope import AutoModelForCausalLM, AutoTokenizer
import os

app = FastAPI()

class PredictionRequest(BaseModel):
    query: str
    passage: str

model_path = "/home/tostring/.cache/modelscope/hub/models/"
model_name = "BAAI/bge-reranker-v2-gemma"
pretrained_model_name_or_path = os.path.join(model_path, model_name)
tokenizer = AutoTokenizer.from_pretrained(pretrained_model_name_or_path)
model = AutoModelForCausalLM.from_pretrained(pretrained_model_name_or_path)
yes_no_locs = tokenizer("No Yes", add_special_tokens=False)["input_ids"]
model.eval()

@app.post("/predict")
async def predict(request: PredictionRequest):
    with torch.no_grad():
        input = get_inputs(request.query, request.passage, tokenizer)
        output = model(**input, return_dict=True)
        scores = output.logits[:, -1, yes_no_locs].float()
        labels = torch.argmax(scores, dim=1)
        return {"prediction": "Yes" if labels.item() == 1 else "No"}

def get_inputs(user_input, history, tokenizer, prompt=None, max_length=1024):
    if prompt is None:
        prompt = "Given a query A and a passage B, determine whether the passage contains an answer to the query by providing a prediction of either 'Yes' or 'No'."
    sep = "\n"
    prompt_inputs = tokenizer(prompt, return_tensors=None, add_special_tokens=False)["input_ids"]
    sep_inputs = tokenizer(sep, return_tensors=None, add_special_tokens=False)["input_ids"]

    query_inputs = tokenizer(
        f"A: {user_input}",
        return_tensors=None,
        add_special_tokens=False,
        max_length=max_length * 3 // 4,
        truncation=True,
    )
    passage_inputs = tokenizer(
        f"B: {history}",
        return_tensors=None,
        add_special_tokens=False,
        max_length=max_length,
        truncation=True,
    )
    input = tokenizer.prepare_for_model(
        [tokenizer.bos_token_id] + query_inputs["input_ids"],
        sep_inputs + passage_inputs["input_ids"],
        truncation="only_second",
        max_length=max_length,
        padding=False,
        return_attention_mask=False,
        return_token_type_ids=False,
        add_special_tokens=False,
    )
    input["input_ids"] = input["input_ids"] + sep_inputs + prompt_inputs
    input["attention_mask"] = [1] * len(input["input_ids"])
    inputs = tokenizer.pad(
        input,
        padding=True,
        max_length=max_length + len(sep_inputs) + len(prompt_inputs),
        pad_to_multiple_of=8,
        return_tensors="pt",
    )
    inputs = {k: v.unsqueeze(0) if len(v.shape) == 1 else v for k, v in inputs.items()}
    return inputs