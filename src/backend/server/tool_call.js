const { ReActAgent, State } = require("./agent.js")
const { utils, global } = require('../modules/globals.js')
const { pushMessage, getMessages, envMessage, clearMessages, loadMessages, setTag } = require('../server/llm_service.js');
const { MCPClient } = require('./mcp_client.js')
const JSON5 = require("json5")
const fs = require('fs');
const os = require('os');

class ToolCall extends ReActAgent {

  constructor(tools = {}) {
    super();
    this.mcp_client = new MCPClient();
    const base_tools = {
      "mcp_server": {
        func: async ({ name, args }) => {
          const result = await this.mcp_client.callTool({
            name: name,
            arguments: args
          });
          return result;
        }
      },
      "ask_followup_question": {
        func: async ({ question, options }) => {
          this.state = State.PAUSE;
          return { question, options }
        }
      },
      "waiting_feedback": {
        func: () => {
          this.state = State.PAUSE;
          return { question: "Task paused, waiting for user feedback...", options: ["Allow", "Deny"] }
        }
      },
      "plan_mode_response": {
        func: async ({ response, options }) => {
          this.state = State.PAUSE;
          return { question: response, options }
        }
      },
      "enter_idle_state": {
        func: ({ final_answer }) => {
          this.state = State.FINAL;
          return final_answer;
        }
      },
      "memory_retrieval": {
        func: ({ memory_id }) => {
          const memory = getMessages().filter(m => m.memory_id === memory_id).map(m => { return { role: m.role, content: m.content } });
          return memory || "No memory ID found";
        }
      },
      "add_subtask": {
        func: ({ subtasks }) => {
          if (!Array.isArray(subtasks)) {
            subtasks = [subtasks];
          }
          subtasks = subtasks.map(task_discription => {
            const task = {
              id: this.vars.subtask_id,
              discription: task_discription,
              status: "pending"
            }
            this.vars.subtask_id++;
            return task;
          });
          this.vars.subtasks = this.vars.subtasks.concat(subtasks)

          return {
            status: "success",
            message: `${this.vars.subtasks.length} subtasks added`,
            subtasks: this.vars.subtasks
          };
        }
      },
      "complete_subtask": {
        func: ({ task_ids }) => {
          if (!Array.isArray(task_ids)) {
            task_ids = [task_ids];
          }
          task_ids = task_ids.map(id => {
            try {
              return parseInt(id);
            } catch {
              return -1;
            }
          });
          this.vars.subtasks = this.vars.subtasks.filter(task => !task_ids.includes(task.id));

          return {
            status: "success",
            message: `${task_ids.length} subtasks completed`,
            subtasks: this.vars.subtasks
          };
        }
      },
    }

    this.tool_prompt = []
    for (let key in tools) {
      if (tools[key]?.getPrompt) {
        const getPrompt = tools[key].getPrompt;
        this.tool_prompt.push(getPrompt());
      }
    }
    this.tools = { ...tools, ...base_tools }

    this.task_prompt = `You are TransAgent, an all-around AI assistant designed to solve any tasks proposed by users. You can use various tools to efficiently complete complex requests.

You should strictly follow the entire process of thinking first, then acting, and then observing:
1. Thinking: Describe your thought process or plan to solve this problem
2. Action: Based on your thinking, determine the tools needed to be called
3. Observation: Analyze the results of the action and incorporate them into your thinking

When dealing with complex tasks, you should:
1. Automatically generate a detailed subtask list based on user requirements
2. Call the 'complete_subtask' tool after completing each subtask
3. Use todolist to display the subtask list

Tool usage instructions:
You can access and use a series of tools according to the user's approval. Only one tool can be used in each message, and you will receive the execution result of the tool in the user's response. You need to gradually use tools to complete the given task, and each use of the tool should be adjusted based on the results of the previous tool.

====

# Tool usage format:

## Output format:

Tool usage adopts the format of pure JSON content, prohibiting the use of any Markdown code block tags (including \`\`\`json or \`\`\`), and should not contain additional explanations, comments, or non-JSON text. The following is a structural example:

{{
  "thinking": "[Thinking process]",
  "tool": "[Tool name]",
  "params": {{
    "[parameter1_name]": "[value1]",
    "[parameter2_name]": "[value2]",
    ...
  }}
}}

## Example:
{{
  "thinking": "The user simply greets without proposing a specific task or question. In planning mode, I need to communicate with the user to understand their needs or tasks.",
  "tool": "plan_mode_response",
  "params": {{
    "response": "Hello! May I help you with anything?",
    "options": [
      "I need help completing a project",
      "I want to learn how to use certain tools",
      "I have some specific questions that need answers"
    ]
  }}
}}

Please always follow this format to ensure the tool can be correctly parsed and executed.

====

# Tools:

{tool_prompt}

## add_subtask
Description: Add new subtasks to todo list

Parameters:
- subtasks: (Required) Discription of the subtask

Usage Example:
{
  "thinking": "User requested to create a new project, need to break down into subtasks",
  "tool": "add_subtask",
  "params": {
    "subtasks": [
      "Design project architecture", 
      "Create database schema", 
      "Implement API endpoints",
      ...
    ]
  }
}

## complete_subtask
Description: Mark subtask(s) as completed

Parameters:
- task_ids: (Required) Single task ID or array of task IDs to complete

Usage Example:
{
  "thinking": "Project architecture design is completed, need to mark these subtasks as done",
  "tool": "complete_subtask",
  "params": {
    "task_ids": [
      0, 
      1,
      ...
    ]
  }
}

## mcp_server
Description: Request MCP (Model Context Protocol) service.

Parameters:
- name: (Required) The name of the MCP service to request.
- args: (Required) The parameters of the MCP service request.

Usage:
{{
  "thinking": "[Thinking process]",
  "tool": "mcp_server",
  "params": {{
    "name": "[value]",
    "args": {{
      "[parameter1_name]": [value1],
      "[parameter2_name]": [value2],
      ...
    }}
  }}
}}

## ask_followup_question
Description: Ask the user questions to collect additional information needed to complete the task. It should be used when encountering ambiguity, needing clarification, or requiring more details to proceed effectively. It achieves interactive problem-solving by allowing direct communication with the user. Use this tool wisely to balance between collecting necessary information and avoiding excessive back-and-forth communication.

Parameters:
- question: (Required) The question to ask the user. This should be a clear and specific question targeting the information you need.
- options: (Optional) Provide the user with 2-5 options to choose from. Each option should be a string describing a possible answer. You do not always need to provide options, but in many cases, this can help the user avoid manually entering a response.

Usage:
{{
  "thinking": "[Thinking process]",
  "tool": "ask_followup_question",
  "params": {{
    "question": "[value]",
    "options": [
      "Option 1",
      "Option 2",
      ...
    ]
  }}
}}

## waiting_feedback
Description: Suspends task execution to await explicit user approval/rejection before performing system-altering operations (file modifications, config changes, etc.). Designed for high-risk actions requiring human validation.

Usage example:
{{
  "thinking": "[Explain why confirmation is needed and impact analysis]",
  "tool": "waiting_feedback",
  "params": {{}}
}}

## plan_mode_response
Description: Respond to user inquiries to plan solutions for user tasks. This tool should be used when you need to respond to user questions or statements about how to complete a task. This tool is only available in "planning mode". The environment details will specify the current mode; if it is not "planning mode", this tool should not be used. Depending on the user's message, you may ask questions to clarify the user's request, design a solution for the task, and brainstorm with the user. For example, if the user's task is to create a website, you can start by asking some clarifying questions, then propose a detailed plan based on the context, explain how you will complete the task, and possibly engage in back-and-forth discussions until the user switches you to another mode to implement the solution before finalizing the details.

Parameters:
response: (Required) The response provided to the user after the thinking process.
options: (Optional) An array containing 2-5 options for the user to choose from. Each option should describe a possible choice or a forward path in the planning process. This can help guide the discussion and make it easier for the user to provide input on key decisions. You may not always need to provide options, but in many cases, this can save the user time from manually entering a response. Do not provide options to switch modes, as there is no need for you to guide the user's operations.

Usage:
{{
  "thinking": "[Thinking process]",
  "tool": "plan_mode_response",
  "params": {{
    "response": "[value]",
    "options": [
      "Option 1",
      "Option 2",
      ...
    ]
  }}
}}

## memory_retrieval
Core Function: Query historical interactions by memory_id

Typical Scenarios:
1. Review analysis steps
2. Verify historical discussions
3. Resume previous work

Parameters:
- memory_id: (Required)
  - Type: Integer
  - Values: Numeric IDs from Memory List
  - Example: 42

Usage Example:
{{
  "thinking": "Need to confirm previous discussion about X",
  "tool": "memory_retrieval",
  "params": {{
    "memory_id": 24
  }}
}}

Best Practices:
• Add memory tags for key milestones
• Check available records with list_memories
• Create checkpoints regularly

## enter_idle_state  
Description: Stop current task and enter idle state, waiting for further instructions (called when task is completed).

Key Enhancements:
1. Enhanced summary structure
2. Added bilingual parameter descriptions
3. Included complete template

Parameters:
- final_answer: (Required, Markdown format)
  - Structured result presentation
  - Must include:
    1. **Task Overview**: Restate original objectives
    2. **Execution Process**: Key steps and decisions
    3. **Result Analysis**: Quantitative metrics and quality assessment
    4. **Improvement Suggestions**: Optimization directions
  - Format requirements:
    - Use headings (\`##\`/\`###\`)
    - Highlight key findings first
    - Use tables/code blocks for complex data

Standard Template:
\`\`\`markdown
## Task Summary

### Objective Completion
- Original requirements: [Brief restatement]
- Completion rate: [Percentage]
- Key achievements: [List]

### Execution Analysis
1. Main phases:
   - Phase 1: [Description]
   - Phase 2: [Description]
2. Key decisions:
   - [Decision] → [Rationale]

### Quality Assessment
| Dimension | Rating(1-5) | Comments |
|-----------|------------|----------|
| Accuracy  | ⭐⭐⭐⭐ | [Evaluation] |
| Efficiency| ⭐⭐⭐ | [Evaluation] |

### Optimization Suggestions
1. Immediate improvements:
   - [Suggestion 1]
   - [Suggestion 2]
2. Long-term optimizations:
   - [Suggestion 3]
\`\`\`

Usage:
{{
  "thinking": "Task analysis completed. Key steps:\n1. Executed 3 code analyses\n2. Performed 2 file searches\n3. Validated architecture patterns",
  "tool": "enter_idle_state",
  "params": {{
    "final_answer": "## System Analysis Report\n\n### Core Findings\n- Discovered scheduling mechanism in module X\n- Identified 3 performance bottlenecks\n\n### Recommendations\n1. Implement caching for component Y\n2. Refactor Z module for better maintainability"
  }}
}}

Best Practices:
1. Include quantitative metrics in thinking field
2. Structure final_answer with clear sections
3. Use proper JSON escaping for special characters
  "params": {{
    "final_answer": "## Result Summary\n\n✅ **Best Solution**: \`Option A\` (+20% efficiency)\n\n### Comparison\n| Option | Efficiency | Risk |\n|--------|------------|------|\n| A      | +20%       | Low  |\n| B      | +15%       | Medium |\n\n### Calculation Logic\n1. Data source: \`2023 Annual Report\`\n2. Model: \`\`\`python\ndef roi_calc(...)\`\`\`"
  }}
}}

====

# Available MCP Services

{mcp_prompt}

====

{extra_prompt}

====

# Automatic Mode vs. Execution Mode vs. Planning Mode

Environment details will specify the current mode, there are three modes: 

**Automatic Mode**: In this mode, you cannot use plan_mode_response, waiting_feedback and ask_followup_question tools.

- In automatic mode, you can use tools other than plan_mode_response, waiting_feedback and ask_followup_question to complete the user's task, and the subsequent process does not need to ask the user questions until the mode changes.
- When your environment changes from other modes to automatic mode, you should be aware that you do not need to ask the user questions in the subsequent process until the mode changes.
- Once the task is completed, you use the enter_idle_state tool to show the task result to the user.

**Execution Mode**: In this mode, you cannot use the plan_mode_response tool.

- In execution mode, you can use tools other than plan_mode_response to complete the user's task.
- Once the task is completed, you use the enter_idle_state tool to show the task result to the user.

**Planning Mode**: In this restricted mode, you can only use the plan_mode_response tool and file/path query tools, but file modifications are strictly prohibited.

- In planning mode, the goal is to collect information and obtain context to create a detailed plan to complete the user's task. The user will review and approve the plan, then switch to execution mode or automatic mode to implement the solution.
- In planning mode, when you need to communicate with the user or present a plan, you should directly use the plan_mode_response tool to deliver your response.
- If the current mode switches to planning mode, you should stop any pending tasks and discuss with the user to plan how best to proceed with the task.
- In planning mode, depending on the user's request, you may need to do some information gathering, such as asking the user clarifying questions to better understand the task.
- Once you have more context about the user's request, you should develop a detailed plan to complete the task.
- Then, you can ask the user if they are satisfied with the plan or if they wish to make any changes. Consider this a brainstorming session where you can discuss the task and plan the best way to complete it.
- Finally, once you think a good plan has been developed, ask to switch the current mode back to execution mode to implement the solution.

====

# Task Execution Framework

## Phase 1: Task Analysis & Planning
1. **Requirement Decomposition**
   - Parse user input to identify core objectives and constraints
   - Generate SMART (Specific, Measurable, Achievable, Relevant, Time-bound) sub-goals
   - Establish dependency graph for sequential/parallel execution

2. **Goal Prioritization**
   - Apply MoSCoW method (Must-have, Should-have, Could-have, Won't-have)
   - Resolve conflicting requirements through context analysis
   - Validate feasibility against available tools and permissions

## Phase 2: Execution Protocol

### Mode-Specific Operations
**Execution Mode:**
- Parameter Validation Checklist:
  1. Verify parameter completeness (required vs optional)
  2. Cross-reference with historical context
  3. Apply type inference where possible
  4. For missing required parameters:
     - Use \`ask_followup_question\` with templated queries:
       \`\`\`json
       {
         "question": "Please specify [parameter_name] for [tool_name]",
         "options": ["Suggested Value 1", "Suggested Value 2"] 
       }
       \`\`\`

**Automatic Mode:**
- Autonomous Parameter Resolution:
  1. Implement fallback values from configuration profiles
  2. Apply machine learning-based prediction for missing parameters
  3. Execute multi-variant testing when multiple solutions exist
  4. Strictly enforce non-interaction policy (zero user prompts)

### Tool Utilization Standards
1. **Pre-Call Verification**
   - Environment compatibility check
   - Permission level validation
   - Resource availability assessment

2. **Post-Call Analysis**
   - Result validation against expected outcomes
   - Error classification (recoverable/non-recoverable)
   - Automatic retry protocol (max 3 attempts with exponential backoff)

## Phase 3: Completion & Delivery

### Termination Protocol
1. **Result Compilation**
   - Generate comprehensive execution report including:
     - Timeline of operations
     - Resources consumed
     - Alternative paths considered
   - Format output based on user preference (Markdown/JSON/CSV)

2. **Cleanup Operations**
   - Temporary file removal
   - Connection termination
   - Resource deallocation

## Continuous Optimization
1. **Adaptive Learning**
   - Maintain execution history database
   - Implement feedback loop for parameter prediction
   - Update tool selection heuristics

2. **Performance Monitoring**
   - Track goal completion latency
   - Measure resource efficiency
   - Calculate success/failure rates per tool

Key Enhancements:
1. Added concrete methodologies (SMART, MoSCoW)
2. Detailed parameter handling workflows
3. Structured error recovery mechanisms
4. Comprehensive reporting standards
5. Machine learning integration points
6. Quantifiable performance metrics

Example Execution Flow:
1. Receive task: "Migrate legacy data to new system"
2. Create sub-goals:
   - [MUST] Authenticate to both systems
   - [MUST] Establish schema mapping
   - [SHOULD] Validate data integrity
3. Execute with mode-appropriate parameter resolution
4. Deliver final report with:
   - Records processed
   - Warnings encountered
   - Verification checksum

====

# Environment Details Explanation
- Language: The type of language the assistant needs to use to reply to messages
- Temporary folder: The location where temporary files are stored during the execution process
- Current time: Current system time
- Current mode: The current mode (automatic mode / execution mode / planning mode)

====

# System Information

- Operating system type: {system_type}
- Operating system platform: {system_platform}
- CPU architecture: {system_arch}

===

# Memory List Usage Guide

## Core Concepts
1. **What is Memory List**
   - Each user-assistant interaction generates a unique \`memory_id\`
   - These \`memory_id\`s form a complete interaction history in sequence
   - Essentially our "conversation memory bank"

2. **Function of memory_retrieval tool**
   - Specialized tool for querying historical interaction details
   - Can be understood as a "conversation recall" function

## Usage Scenarios
✅ **Backtracking analysis**: When needing to reference previous analysis steps
✅ **Content verification**: When user questions involve historical discussions
✅ **Detail confirmation**: When needing to check historical tool call parameters/results
✅ **Repeat operations**: Before re-executing the same tool, check previous results

## Technical Notes
⚠️ **Important Notes**
- Memory capacity: System saves complete history with storage limits
- Query method: Only accessible via memory_retrieval tool
- Automatic recording: All user queries and tool calls are auto-saved

## Best Practices
🔧 **User Recommendations**
When needing to reference previous content, say: "Please check our previous discussion about XX", I'll use memory_retrieval.

🤖 **AI Auto-call Scenarios**
I automatically invoke memory_retrieval when:
1. Detecting repeated or similar questions
2. Needing to maintain conversation continuity
3. Requiring historical tool parameter verification
4. Asked to summarize/continue previous work
5. Encountering ambiguous references needing clarification

## Practical Examples
📌 **Example 1: Retrieving historical parameters**
\`\`\`json
{
  "thinking": "Need to verify exact parameters from previous successful analysis",
  "tool": "memory_retrieval",
  "params": {
    "memory_id": 12
  }
}
\`\`\`

📌 **Example 2: Getting previous tool results**
\`\`\`json
{
  "thinking": "Although xxx file wasn't found, I noticed xxx tool was successfully executed before and can retrieve its results directly",
  "tool": "memory_retrieval",
  "params": {
    "memory_id": 24
  }
}
\`\`\`

💡 **Usage Tips**
• Add memory tags for key milestones
• Create checkpoints regularly
• Use list_memories to view available records

====

# Memory List:
{memory_list}
`

    this.system_prompt;
    this.mcp_prompt;
    this.memory_id = 0;
    this.memory_list = [];

    this.env = `Environment details:
- Language: Please answer using {language}
- Temporary folder: {tmpdir}
- Current time: {time}
- Current mode: {mode}
{envs}

TodoList:
{todolist}`

    this.modes = {
      AUTO: 'Automatic mode',
      ACT: 'Execution mode',
      PLAN: 'Planning mode',
    }

    this.vars = {
      subtasks: [],
      subtask_id: 0,
    }

    this.environment_details = {
      language: utils.getLanguage(),
      tmpdir: utils.getConfig("tool_call")?.tmpdir || os.tmpdir(),
      time: utils.formatDate(),
      mode: this.modes.ACT,
      envs: null,
      todolist: null,
    }
  }

  get_extra_prompt(file) {
    try {
      // eslint-disable-next-line no-undef
      const prompt_path = file?.format(process);
      if (!fs.existsSync(prompt_path)) {
        return fs.readFileSync(utils.getDefault("extra_prompt.md"), 'utf-8');
      }
      // eslint-disable-next-line no-undef
      return fs.readFileSync(file.format(process), 'utf-8');
    } catch (error) {
      console.log(error.message);
      return "";
    }
  }

  memory_update(data) {
    let messages = getMessages()
    let messages_list = messages.slice(Math.max(messages.length - data.long_memory_length - data.memory_length, 0), messages.length - data.memory_length).map(message => {
      let message_copy = utils.copy(message)
      const content_json = utils.extractJson(message_copy.content);
      if (content_json) {
        const content_parse = JSON5.parse(content_json);
        if (content_parse?.observation && message_copy.role == "user") {
          message_copy.content = `Assistant called ${content_parse.tool_call} tool`;
        }
        if (message_copy.role == "assistant") {
          delete content_parse.params;
          message_copy.content = JSON.stringify(content_parse);
        }
      }
      delete message_copy.react;
      delete message_copy.id;
      delete message_copy.show;
      return message_copy;
    })
    this.memory_list = messages_list
    this.system_prompt = this.task_prompt.format({
      system_type: utils.getConfig("tool_call")?.system_type || os.type(),
      system_platform: utils.getConfig("tool_call")?.system_platform || os.platform(),
      system_arch: utils.getConfig("tool_call")?.system_arch || os.arch(),
      tool_prompt: this.tool_prompt.join("\n\n"),
      mcp_prompt: this.mcp_prompt,
      extra_prompt: this.get_extra_prompt(data.extra_prompt),
      memory_list: JSON.stringify(this.memory_list, null, 2)
    })
  }

  environment_update(data) {
    this.environment_details.time = utils.formatDate();
    this.environment_details.language = data?.language || utils.getLanguage();
    const envs = [];
    for (const key in data.envs) {
      if (Object.prototype.hasOwnProperty.call(data.envs, key)) {
        const value = data.envs[key];
        envs.push(`- ${key}: ${value}`)
      }
    }
    this.environment_details.todolist = this.vars.subtasks.map(task => {
      return `- task_id: ${task.id}, task_description: ${task.description}, task_statu: ${task.statu}`
    })
    this.environment_details.envs = envs.join("\n");
    data.env_message = envMessage(this.env.format(this.environment_details));
  }

  plan_act_mode(mode) {
    this.environment_details.mode = mode;
  }

  async step(data) {
    if (!this.mcp_prompt) {
      await this.mcp_client.initMcp();
      this.mcp_prompt = this.mcp_client.mcp_prompt;
    }
    data.push_message = false
    if (this.state == State.IDLE) {
      pushMessage("user", data.query, data.id, ++this.memory_id, true, false);
      this.environment_update(data);
      this.state = State.RUNNING;
    }
    this.memory_update(data);
    const tool_info = await this.task(data);
    // Check if a tool needs to be called
    if (tool_info?.tool) {
      const { observation, output } = await this.act(tool_info);
      data.output_format = observation;
      pushMessage("user", data.output_format, data.id, this.memory_id);
      this.environment_update(data);
      if (tool_info.tool == "display_file") {
        data.event.sender.send('stream-data', { id: data.id, memory_id: this.memory_id, content: `${output}\n\n` });
      }
      if (this.state == State.PAUSE) {
        const { question, options } = output;
        data.event.sender.send('stream-data', { id: data.id, memory_id: this.memory_id, content: question, end: true });
        return options;
      }
      if (this.state == State.FINAL) {
        data.event.sender.send('stream-data', { id: data.id, memory_id: this.memory_id, content: output, end: true });
      } else {
        data.event.sender.send('info-data', { id: data.id, memory_id: this.memory_id, content: this.get_info(data) });
      }
    }
  }

  async task(data) {
    data.prompt = this.system_prompt;
    const raw_json = await this.llmCall(data);
    console.log(`raw_json: ${raw_json}`);
    data.output_format = utils.extractJson(raw_json) || raw_json;
    data.event.sender.send('info-data', { id: data.id, memory_id: ++this.memory_id, content: this.get_info(data) });
    return this.get_tool(data.output_format, data);
  }

  async act({ tool, params }) {
    try {
      if (!Object.prototype.hasOwnProperty.call(this.tools, tool)) {
        const observation = `{
  "tool_call": "${tool}",
  "observation": "Tool does not exist",
  "error": "Please check if the tool name is incorrect or if the MCP service call format is wrong"
}`;
        setTag(false);
        return { observation, output: null };
      }
      const will_tool = this.tools[tool].func;
      const output = await will_tool(params);
      const observation = `{
  "tool_call": "${tool}",
  "observation": ${JSON.stringify(output, null, 2)},
  "error": ""
}`;
      if (tool == "cli_execute") {
        const success = output?.success;
        setTag(success);
      } else {
        setTag(true);
      }
      return { observation, output };
    } catch (error) {
      console.log(error);
      const observation = `{
  "tool_call": "${tool}",
  "observation": "Tool has been executed",
  "error": "${error.message}"
}`;
      setTag(false);
      return { observation, output: error.message };
    }
  }

  get_tool(content, data) {
    pushMessage("assistant", content, data.id, this.memory_id);
    try {
      const tool_info = JSON5.parse(content);
      if (tool_info?.tool) {
        const thinking = `${tool_info?.thinking || `Tool call: ${tool_info.tool}`}\n\n---\n\n`
        data.event.sender.send('stream-data', { id: data.id, memory_id: this.memory_id, content: thinking });
        return tool_info;
      }
    } catch (error) {
      console.log(error);
      data.output_format = `{
  "tool_call": "",
  "observation": "Tool was not executed",
  "error": "Your response is not a pure JSON text, or there is a problem with the JSON format: ${error.message}"
}`;
      setTag(false);
      pushMessage("user", data.output_format, data.id, this.memory_id);
      this.environment_update(data);
      data.event.sender.send('info-data', { id: data.id, memory_id: this.memory_id, content: this.get_info(data) });
    }
  }

  load_message(window, filePath) {
    this.window = window;

    clearMessages();
    this.window.webContents.send('clear')
    let messages = loadMessages(filePath)
    if (messages.length > 0) {
      const maxId = messages.reduce((max, current) => {
        return parseInt(current.id) > parseInt(max.id) ? current : max;
      }, messages[0]);
      if (maxId.id) {
        global.id = parseInt(maxId.id);
        const react = messages.find(message => message.react);
        if (react) {
          const maxMemoryId = messages.reduce((max, current) => {
            return parseInt(current.memory_id) > parseInt(max.memory_id) ? current : max;
          }, messages[0]);
          this.memory_id = maxMemoryId.memory_id;
        }
        for (let i in messages) {
          i = parseInt(i);
          if (Object.hasOwnProperty.call(messages, i)) {
            let { role, content, id, memory_id, react, del } = messages[i];
            // if (memory_id === 188) {
            //   console.log(`Memory ID: ${memory_id}, Content: ${content}`);
            // }
            if (role == "user") {
              if (react) {
                const content_json = utils.extractJson(content);
                if (content_json) {
                  const tool_info = JSON5.parse(content_json);
                  const tool = tool_info?.tool_call;
                  if (tool == "display_file") {
                    const observation = tool_info.observation;
                    this.window.webContents.send('stream-data', { id: id, memory_id: memory_id, content: `${observation}\n\n`, end: true, del: del });
                  }
                  if (["ask_followup_question", "waiting_feedback", "plan_mode_response"].includes(tool)) {
                    const observation = tool_info.observation;
                    this.window.webContents.send('stream-data', { id: id, memory_id: memory_id, content: `${observation.question}\n\n`, end: true, del: del });
                  }
                }
                let content_format = content.replaceAll("\\`", "'").replaceAll("`", "'");
                this.window.webContents.send('info-data', { id: id, memory_id: memory_id, content: `Step ${i}, id: ${id}, memory_id: ${memory_id}, Output:\n\n\`\`\`json\n${content_format}\n\`\`\`\n\n`, del: del });
              }
              else {
                this.window.webContents.send('user-data', { id: id, memory_id: memory_id, content: content, del: del });
              }
            } else {
              if (react) {
                try {
                  content = utils.extractJson(content) || content;
                  const tool_info = JSON5.parse(content);
                  if (tool_info?.tool) {
                    const thinking = `${tool_info?.thinking || `Tool call: ${tool_info.tool}`}\n\n---\n\n`
                    let content_format = content.replaceAll("\\`", "'").replaceAll("`", "'");
                    this.window.webContents.send('info-data', { id: id, memory_id: memory_id, content: `Step ${i}, id: ${id}, memory_id: ${memory_id}, Output:\n\n\`\`\`json\n${content_format}\n\`\`\`\n\n`, del: del });
                    this.window.webContents.send('stream-data', { id: id, memory_id: memory_id, content: thinking, end: true, del: del });
                    if (tool_info.tool == "enter_idle_state") {
                      this.window.webContents.send('stream-data', { id: id, memory_id: memory_id, content: tool_info.params.final_answer, end: true, del: del });
                    }
                  }
                } catch {
                  this.window.webContents.send('stream-data', { id: id, memory_id: memory_id, content: "", end: true, del: del });
                  continue;
                }
              } else {
                this.window.webContents.send('stream-data', { id: id, content: content, end: true, del: del });
              }
            }
          }
        }
        console.log(`Load success: ${filePath}`)
      } else {
        console.log(`Load failed: ${filePath}`)
      }
    };
  }
}

module.exports = {
  ToolCall
};
