# TransAgent

![TransAgent](public/video/BixChat.gif)

TransAgent is a powerful cross-platform agent application that supports Windows, Mac, and Linux systems. Through the ReAct architecture, which stands for thinking, acting, and observing, it can assist researchers in completing complex transcriptional regulation analysis tasks. At the same time, we provide various ways for users to quickly integrate new tools, including MCP services and custom tools, making TransAgent a universal architecture that can be customized according to researchers' needs.

## Software Core

### BioTools

- We provide a universal transcriptional regulation MCP service [BioTools](./biotools), which users can quickly integrate with this software.

### Virtualization Environment

- To prevent the agent from executing system-level commands that could damage the local environment, we use Docker virtualization technology. All execution results will be saved in the user-specified directory. Additionally, our tools can execute remote SSH commands, allowing users to perform analyses on high-performance remote servers.

### Dynamic Multi-Mode Switching

- We use ReAct as the core architecture of the agent and provide various behavior modes on this basis, including `Automatic Mode`, `Execution Mode`, and `Planning Mode`. This allows our software to dynamically switch behavior modes in various data analysis tasks, thereby precisely controlling the agent's behavior.

### MCP Service

- The Model Context Protocol (MCP) is a way to quickly integrate open-source tools. This software supports quick integration of MCP services through simple and universal configuration files.

### Custom Tools

- To facilitate the design of more system-level functions for this software, we allow users to customize tools, including tool invocation and tool prompts.

### System/CLI Tool Prompts
- We have reserved injection interfaces for system and CLI tool prompts. By simply modifying the configuration file, researchers can easily fine-tune the agent's behavior and quickly customize tools.

### Enhanced Memory Module
- We have further optimized the memory module. For tasks with extremely long contexts, we use a combination of long-term and short-term memory. Short-term memory refers to the agent retaining messages from a few conversation cycles, while long-term memory refers to the agent retaining user messages and agent thoughts for longer than short-term memory. For content that the agent needs to recall, we provide a `Memory Retrieval` tool, which enables the agent to further possess recall capabilities. More importantly, we provide precise memory management functions, allowing users to enable and disable the agent's memory at an atomic level.

### Ollama Support

- To further meet the privacy protection needs of data analysis, we have integrated Ollama functionality, supporting the integration of privately deployed large models by users.

### Other Features
- To meet the one-stop needs of researchers, we have also integrated basic conversation, chain calls, conversation saving and loading, and other functions into the software.

## Examples

![TP53 analysis](public/video/TP53_analysis.gif)

## System Requirements

- **Windows**: Windows 10 or higher.
- **Ubuntu**: Ubuntu 18.04 or higher.

## Startup / Compilation

```shell
nvm use 23
# Install environment
npm install
# Start
npm run start
# Package
npm run dist
```

_- Due to rapid version iterations, it is recommended to compile it yourself to experience the latest features. -_

## If the installation fails, please manually copy the configuration file (resources/config.json) to the following addresses:

- linux: /home/[user]/.transagent/config.json
- windows: C:\\Users\\[user]\\.transagent\\config.json

## After installation, the following operations need to be performed:

> Agent Parameter Configuration

[mcp_server](biotools/mcp_server)

> Install Tool Dependencies

[plugins](resources/plugins)

> Large Model and Software Detail Configuration Example (`Ollama Support`)

config.json

```json
"models": {
  "ollama": {
    "api_url": "http://localhost:11434/api/chat",
    "versions": [
      "llama3.2",
      {
        "version": "gemma3:12b",
        "vision": [
          "image"
        ],
        "ollama": true
      }
    ]
  },
  "deepseek": {
    "api_url": "https://api.deepseek.com/chat/completions",
    "api_key": "your_key",
    "versions": [
      "deepseek-coder",
      "deepseek-chat",
      "deepseek-reasoner"
    ]
  },
  "chatglm": {
    "api_url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    "api_key": "your_key",
    "versions": [
      "glm-4-flash",
      "glm-4-long",
      {
        "version": "glm-4v-flash",
        "vision": [
          "image"
        ]
      }
    ]
  },
}
```

> Example of configuring large model request parameters

config.json

```json
"llm_parmas": {
  "max_tokens": 4000,
  "temperature": 1.5,
  "stream": true
}
```

> Example of configuring info box template

config.json

````json
"info_template": "Stage: {step}, Called: {model}, Version: {version}, Output: \n\n```\n{output_format}\n```\n\n",
````

_- The available configuration fields are as follows: -_

- step: Current stage number
- model: Currently used model (model/plugins)
- version: Currently used model version
- query: Initial input
- input: Current stage formatted input
- img_url: Initial image base64 input
- output: Current stage raw output
- outputs: Historical raw outputs
- output_format: Current stage formatted output
- output_formats: Historical formatted outputs
- prompt: Initial system prompt
- prompt_format: Current stage formatted system prompt
- llm_parmas: Large model request parameters
- api_url: Large model request URL
- api_key: Large model request KEY

_- Formatting: See Chain Calls for details -_

> Example of configuring memory length

config.json

```json
"memory_length": 10
```

> Example of configuring retry attempts

config.json

```json
"retry_time": 10
```

> Example of configuring shortcut display duration

config.json

```json
"icon_time": 5
```

> Example of configuring shortcuts

config.json

```json
"short_cut": "CommandOrControl+Shift+Space"
```

> Example of configuring default function states

config.json

```json
"func_status": {
  "clip": true,
  "react": true,
  "markdown": true,
  "math": true,
  "text": false
}
```

> Example of default configurations

config.json

```json
"default": {
  "model": "deepseek",
  "version": "deepseek-chat",
  "plugin": "baidu_translate"
}
```

> Example of chain call configurations

Parameter cycle:

* input_*: Format using `configurable field values` before calling the model
* output_*: Format using `configurable field values` after calling the model

config.json

- Basic conversation

```json
"chain_call": [
  {
    "end": true
  }
]
```

- Basic conversation + image recognition

```json
"chain_call": [
  {
    "input_template": "{img_url?'Please identify the image content before answering.':''}{input}",
    "end": true
  }
]
```

- Forced thought chain

```json
"chain_call": [
  {
    "prompt_template": "{prompt}\nA conversation between User and Assistant.\nThe user asks a question, and the Assistant solves it.\nThe assistant first thinks about the reasoning process in the mind and then provides the user with the answer.\nThe assistant should engage in a lengthy period of contemplation before answering a question, while also reflecting on whether there are any errors in their thought process. \nDuring the thinking process, the assistant should propose multiple solutions and provide an extended chain of thought for each one.\nThe thought process for each solution should be very detailed, including the specific steps for implementation.\nThe reasoning process is enclosed within <think> </think> and <answer> </answer> tags, respectively, i.e:\n<think>\n reasoning process here \n</think>\n<answer>\n answer here \n</answer>",
    "input_template": "{input}",
    "end": true
  }
]
```

- Thought chain concatenation

```json
"chain_call": [
  {
    "model": "together",
    "version": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
    "prompt": "Please think before answering"
  },
  {
    "model": "plugins",
    "version": "Extract thought chain",
    "input_data": {
      "input": "{input}"
    },
    "output_template": "<think>{output}</think>\n- query:{query}\n- answer:"
  },
  {
    "end": true
  }
]
```

- File conversation

```json
"chain_call": [
  {
    "model": "plugins",
    "version": "File reading",
    "input_data": {
      "file_path": "{file_path}"
    }
  },
  {
    "input_template": "The following is the text content from the PDF:\n\n<pdf>{output_formats[0]}</pdf>\n\nThe following is the user input:\n\n<user>{query}</user>\n\nPlease respond to the user input based on the PDF content. Response requirements:\n- Filter out redundant text such as line numbers, page numbers and watermarks\n- Think about as many details, potentially relevant and possibly relevant content as possible\n- For content not in the original text, no guessing is needed, and opinions and outputs that may be inconsistent with the original content should be proposed\n- Output in standard format.",
    "end": true
  }
]
```

_- Configurable Fields -_

This configuration parameter defaults to the original field attribute value (see the configuration information box template).

Unique fields:

- input_template: Current stage input formatting template
- output_template: Current stage output formatting template
- prompt_template: System prompt formatting template
- end: Chain call end flag

_- Configurable Display Components -_

- system-prompt: System prompt input box
  - Corresponding available fields are:
    - prompt: Initial system prompt
- file-upload: File upload button
  - Corresponding available fields are:
    - file-upload: Path to read the file

_- For more examples, see: -_

[chain_calls](resources/chain_calls)

## If you have any questions, please contact:
Email: mp798378522@gamil.com
