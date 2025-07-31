import torch
from transformers import AutoTokenizer, LlamaForCausalLM, pipeline
import os

model_path = "/home/tostring/.cache/modelscope/hub/models/"
model_id = "LLM-Research/Llama-3.2-1B-Instruct"
pretrained_model_name_or_path = os.path.join(model_path, model_id)
tokenizer = AutoTokenizer.from_pretrained(pretrained_model_name_or_path)
model = LlamaForCausalLM.from_pretrained(pretrained_model_name_or_path)

pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
query = "what is panda?"
passage = "is a bear species endemic to China."
messages = [
    {
        "role": "system",
        "content": """Determine if Passage B contains any information that answers Query A (fully or partially). Return 'Yes' if:
- Complete Answer: Directly and fully resolves the query
- Partial Answer: Provides some relevant information that addresses part of the query
- Indirect Answer: Contains logically derivable information that implies an answer

Output Format:
```text
Answer: 'Yes'/'No'
Completeness: 'Full'/'Partial'
Confidence: 'High'/'Medium'/'Low' 
Reason: <Brief explanation>
```""",
    },
    {"role": "user", "content": f"*Query A*: {query}\n*Passage B*: {passage}"},
]
outputs = pipe(
    messages,
    max_new_tokens=1024,
)
print(outputs[0]["generated_text"][-1])
