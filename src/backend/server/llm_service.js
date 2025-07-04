const fs = require("fs");
const path = require("path");
const { streamJSON, streamSse } = require("./stream.js");
const JSON5 = require("json5");
const { utils } = require('../modules/globals.js')

let messages = [];
let stop_ids = [];
let tag_success = false;

function getStopIds() {
    return stop_ids;
}

function getMessages() {
    return messages.filter(message => !message?.del);
}

function pushMessage(role, content, id, memory_id, show = true, react = true) {
    let message = { role: role, content: content, id: id, memory_id: memory_id, show: show, react: react };
    messages.push(message);
}

function popMessage() {
    if (messages.length > 0) {
        return messages.pop();
    } else {
        return null;
    }
}

function envMessage(content) {
    return { role: "user", content: content };
}

function clearMessages() {
    messages.length = 0;
    stop_ids.length = 0;
}

function saveMessages(filePath) {
    try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        fs.writeFile(filePath, JSON.stringify(messages.map(message => {
            if (!message?.memory_id && message.role == "assistant") {
                message.memory_id = message.id;
            }
            return message;
        }), null, 2), err => {
            if (err) {
                console.log(err.message);
                return;
            }
            console.log(filePath);
        });
    } catch (error) {
        console.log(error)
    }
}

function loadMessages(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, "utf-8");
        messages = JSON.parse(data);
        return messages.filter(message => message.show);
    } catch (error) {
        console.log(error);
        return false;
    }
}

function toggleMessage({ id, del, del_mode }) {
    try {
        if (del_mode) {
            messages = messages.filter(message => message.id != id);
        }
        else {
            messages = messages.map(message => {
                if (message.id == id) {
                    message.del = del;
                }
                return message;
            });
        }
        return messages.length;
    } catch {
        return 0;
    }
}

function toggleMemory({ memory_id, del_mode }) {
    try {
        if (del_mode) {
            messages = messages.filter(message => message.memory_id != memory_id);
        }
        else {
            messages = messages.map(message => {
                if (message.memory_id == memory_id) {
                    message.del = Object.prototype.hasOwnProperty.call(message, "del") ? !message.del : true;
                }
                return message;
            });
        }
        return messages.length;
    } catch {
        return 0;
    }
}

function stopMessage(id) {
    stop_ids.push(id);
}

function copy(data) {
    return JSON.parse(JSON.stringify(data));
}

function format_messages(messages_list, params, env_message = null) {
    params = params ? params : {};
    // 遍历 messages_list 数组，并删除每个对象的 id 属性
    messages_list = messages_list.filter(message => !message?.del).map(message => {
        let message_copy = copy(message);
        delete message_copy.id;
        delete message_copy.memory_id;
        delete message_copy.show;
        delete message_copy.react;
        delete message_copy.del;
        return message_copy;
    });

    // 判断是否是视觉模型
    if (!Object.prototype.hasOwnProperty.call(params, "vision")) {
        messages_list = messages_list.filter(message => {
            if (typeof message.content !== "string") {
                return false;
            }
            return true;
        })
    }
    else {
        messages_list = messages_list.filter(message => {
            if (typeof message.content !== "string") {
                switch (message.content[1].type) {
                    case "image_url":
                        return params.vision.includes("image")
                    case "video_url":
                        return params.vision.includes("video")
                    default:
                        return false;
                }
            }
            return true;
        })
    }

    // ollama
    if (params?.ollama) {
        messages_list = messages_list.map(message => {
            if (typeof message.content !== "string") {
                const image = message.content[1].image_url.url.split(",")[1];
                const content = message.content[0].text;
                const role = message.role;
                return {
                    role: role,
                    content: content,
                    images: [image]
                }
            } else {
                return message;
            }
        })
    }

    // env_message
    if (env_message) {
        messages_list.push(env_message);
    }

    return messages_list;

}

function format(template, params) {
    const keys = Object.keys(params);
    const values = Object.values(params);
    return new Function(...keys, `return \`$${template}\`;`)(...values);
}

String.prototype.format = function (data) {
    let format_text = this.replace(/(\{.*?\})/g, (match) => {
        try {
            return format(match, data);
        } catch (e) {
            console.log(e);
            return match;
        }
    });
    return format_text;
}

function setTag(tag) {
    tag_success = tag;
}

function getMemory(data) {
    let messages_success = utils.copy(messages.filter(message => !message?.del));
    if (tag_success) {
        messages_success = messages_success.map(message => {
            let content_json = utils.extractJson(message.content);
            let content_parse = null;
            if (content_json) {
                content_parse = JSON5.parse(content_json);
            }
            if (content_parse?.tool_call == "cli_execute" && message.role == "user") {
                if (content_parse.tool_call == "cli_execute") {
                    let success = true;
                    if (Object.prototype.hasOwnProperty.call(content_parse.observation, "success"))
                        success = content_parse.observation?.success
                    else {
                        let observation_json = utils.extractJson(content_parse.observation);
                        if (observation_json)
                            success = JSON5.parse(observation_json).success;
                        else
                            success = true;
                    }
                    if (!success) {
                        message.content == `Assistant called ${content_parse.tool_call} tool: Error occurred!`;
                    }
                }
            } else {
                if (content_parse?.error) {
                    message.content == `Assistant called ${content_parse.tool_call} tool: Error occurred!`;
                }
            }
            return message;
        })
    }
    let messages_list = messages_success.slice(Math.max(messages_success.length - data.memory_length, 0), messages_success.length);
    return messages_list;
}

async function chatBase(data) {
    try {
        let content = data.input;
        if (data?.img_url) {
            content = [
                {
                    "type": "text",
                    "text": data.input
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": data.img_url
                    }
                }
            ];
        }
        let messages_list = null;
        let message_input = null;
        if (data.system_prompt) {
            messages_list = [{ role: "system", content: data.system_prompt, id: data.id, memory_id: null, show: true, react: false }]
            messages_list = messages_list.concat(getMemory(data))
        }
        else {
            messages_list = getMemory(data)
        }
        if (data?.push_message) {
            message_input = { role: "user", content: content, id: data.id, memory_id: null, show: true, react: false };
            messages_list.push(message_input)
        }
        let message_output = { role: 'assistant', content: '', id: data.id, memory_id: null, show: true, react: false }

        let body = {
            model: data.version,
            messages: format_messages(messages_list, data.params, data?.env_message),
            ...data.llm_parmas
        }

        let headers = {
            "Content-Type": "application/json"
        }
        if (data?.api_key) {
            headers["Authorization"] = `Bearer ${data.api_key}`;
        }
        if (stop_ids.includes(data.id)) {
            return "Stop!";
        }
        if (body?.stream) {
            const resp = await fetch(new URL(data.api_url), {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
            });
            const contentType = resp.headers.get('content-type');
            let stream_res;
            if (contentType && contentType.includes('text/event-stream'))
                stream_res = streamSse(resp);
            else
                stream_res = streamJSON(resp);

            for await (const chunk of stream_res) {
                if (stop_ids.includes(data.id)) {
                    return "Stop!";
                }
                content = "";
                if (Object.prototype.hasOwnProperty.call(chunk, "message")) {
                    content = chunk.message.content;
                    message_output.content += content;
                } else {
                    let delta = chunk.choices[0]?.delta;
                    if (chunk.choices.length > 0 && delta) {
                        if (Object.prototype.hasOwnProperty.call(delta, "reasoning_content") && delta.reasoning_content)
                            content = delta.reasoning_content;
                        else if (Object.prototype.hasOwnProperty.call(delta, "content") && delta.content) {
                            content = delta.content;
                            message_output.content += content;
                        }
                    }
                }
                if (!data?.react && !data?.return_response) {
                    data.event.sender.send('stream-data', { id: data.id, content: content, end: false });
                }
            }
            data.output = message_output.content;
        } else {
            body.stream = false;
            const resp = await fetch(new URL(data.api_url), {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
            });
            let respJson = await resp.json();
            if (Object.prototype.hasOwnProperty.call(respJson, "error") && !data?.return_response) {
                data.event.sender.send('info-data', { id: data.id, content: `POST Error:\n\n\`\`\`\n${respJson.error?.message}\n\`\`\`\n\n` });
                return null;
            }
            if (Object.prototype.hasOwnProperty.call(respJson, "message")) {
                data.output = respJson.message.content;
            } else {
                data.output = respJson.choices[0].message.content;
            }
            message_output.content = data.output;
        }
        if (stop_ids.includes(data.id)) {
            return "Stop!";
        }

        if (data.end) {
            messages.push(message_input);
            messages.push(message_output);
            if (data?.return_response)
                return true;
            if (!data?.react)
                data.event.sender.send('stream-data', { id: data.id, content: "", end: true });
            else
                data.event.sender.send('stream-data', { id: data.id, content: data.output_template ? data.output_template.format(data) : data.output, end: true });
            return true;
        } else {
            if (data?.push_message) {
                messages.push(message_input);
                messages.push(message_output);
            }
        }
        return data.output;
    } catch (error) {
        console.log(error)
        if (!data?.return_response)
            data.event.sender.send('info-data', { id: data.id, content: `Response error: ${error.message}\n\n` });
        return null;
    }
}

module.exports = {
    chatBase, clearMessages, saveMessages, loadMessages, toggleMessage, toggleMemory, stopMessage, getStopIds, pushMessage, getMessages, popMessage, envMessage, setTag
};
