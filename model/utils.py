import re
import torch

def process_single_conversation_os(conversation):
    """
    处理 OS 数据集中一条对话，提取符合条件的问题-回答/思考 对。
    
    参数：
    - conversation: list，每条对话由多个 turn 组成

    返回：
    - rows: List，格式为 [question, answer_or_thought, 0]
    """
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        # 过滤由 human 发起但实际是系统输出的内容
        if turn['from'] == "human" and "The output of the OS:" not in turn['value']:
            turn_text = turn["value"]
            for j in range(0, i):
                tu = conversation[j]
                if tu['from'] == "gpt":
                    rows.append([turn_text, extract_think_os(tu['value']), 0])
                elif "The output of the OS:" not in tu['value']:
                    rows.append([turn_text, tu['value'], 0])
    return rows

def process_single_conversation_webshop(conversation):
    """
    处理 WebShop 数据集中一条对话，提取符合条件的问题-回答/思考 对。

    参数：
    - conversation: list，每条对话由多个 turn 组成

    返回：
    - rows: List，格式为 [question, answer_or_thought, 0]
    """
    rows = []
    for i in range(2, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human":
            turn_text = extract_instruction_webshop(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "Thought:" in tu['value']:
                    rows.append([turn_text, extract_thought(tu['value']), 0])
                else:
                    rows.append([turn_text, extract_instruction_webshop(tu['value']), 0])
    return rows

def process_single_conversation_kg(conversation):
    """
    处理 KG 数据集中一条对话，提取符合条件的问题-回答/思考 对。

    参数：
    - conversation: list，每条对话由多个 turn 组成

    返回：
    - rows: List，格式为 [question, answer_or_thought, 0]
    """
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human" and "Observation:" not in turn['value']:
            turn_text = clean_question(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "Thought:" in tu['value']:
                    rows.append([turn_text, extract_thought(tu['value']), 0])
                elif "Observation:" not in tu['value']:
                    rows.append([turn_text, clean_question(tu['value']), 0])
    return rows

def process_single_conversation_alfworld(conversation):
    """
    处理 AlfWorld 数据集中一条对话，提取符合条件的问题-回答/思考 对。

    参数：
    - conversation: list，每条对话由多个 turn 组成

    返回：
    - rows: List，格式为 [question, answer_or_thought, 0]
    """
    rows = []
    for i in range(1, len(conversation)):
        turn = conversation[i]
        if turn['from'] == "human" and "Observation:" not in turn['value']:
            turn_text = clean_question(turn['value'])
            rows.append([turn_text, conversation[0]['value'], 0])
            for j in range(2, i):
                tu = conversation[j]
                if tu['from'] == "gpt" and "THOUGHT:" in tu['value']:
                    rows.append([turn_text, extract_thought_alfworld(tu['value']), 0])
                else:
                    rows.append([turn_text, clean_question(tu['value']), 0])
    return rows

def extract_think_os(text):
    """
    提取 OS 数据中 GPT 回复中的 Think 段落。

    - 如果包含 Think 和 Act，提取两者之间的内容
    - 如果没有 Act，则提取 Think 之后到末尾的内容
    """
    start = text.find("Think:")
    if start == -1:
        return None
    end = text.find("Act:", start)
    if end == -1:
        return text[start + len("Think:"):].strip()
    else:
        return text[start + len("Think:"):end].strip()

def extract_instruction_webshop(text):
    """
    提取 WebShop 数据中的指令部分。
    支持 'Instruction:' 或 'WebShop [SEP] Instruction:' 前缀。
    """
    if text is None:
        return None
    prefixes = ["WebShop [SEP] Instruction:", "Instruction:"]
    for prefix in prefixes:
        idx = text.find(prefix)
        if idx != -1:
            return text[idx + len(prefix):].strip()
    return None

def extract_thought(text):
    """
    提取 Thought 内容（适用于 WebShop 和 KG）：
    - 如果存在 Action 或 Final Answer，则提取 Thought 与其之间的内容
    - 否则提取从 Thought 到文本末尾的内容
    """
    if text is None:
        return None
    match = re.search(r"Thought:\s*(.*?)\s*(?:Action:|Final Answer:)", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    match_thought_only = re.search(r"Thought:\s*(.*)", text, re.DOTALL)
    if match_thought_only:
        return match_thought_only.group(1).strip()
    return None

def clean_question(sentence):
    """
    清洗提问内容：
    - 去除以 'A new question:' 或 'Question:' 开头的前缀
    - 保留剩余部分作为提问内容
    """
    if sentence is None:
        return None
    prefixes = ["A new question:", "Question:"]
    for prefix in prefixes:
        if sentence.startswith(prefix):
            return sentence[len(prefix):].strip()
    return sentence.strip()

def extract_thought_alfworld(text: str) -> str | None:
    """
    提取 AlfWorld 数据中的 THOUGHT 段内容：
    - 如果包含 ACTION，则提取 THOUGHT 与 ACTION 之间的内容
    - 否则提取 THOUGHT 后全部内容
    """
    prefix = "THOUGHT:"
    if not text.startswith(prefix):
        return None
    action_pos = text.find("ACTION:")
    if action_pos == -1:
        return text[len(prefix):].strip()
    else:
        return text[len(prefix):action_pos].strip()
