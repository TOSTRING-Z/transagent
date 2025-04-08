const fs = require("fs");
const { streamJSON, streamSse } = require("./stream.js")

let messages = [];
let stop_ids = [];
let env_message;

function getStopIds() {
    return stop_ids;
}

function getMessages() {
    return messages;
}

function pushMessage(role, content, id, memory_id, show = true, react = true) {
    let message = { role: role, content: content, id: id, memory_id: memory_id, show: show, react: react };
    messages.push(message);
}

function envMessage(content) {
    env_message = { role: "user", content: content };
}

function clearMessages() {
    messages.length = 0;
    stop_ids.length = 0;
}

function saveMessages(filePath) {
    fs.writeFile(filePath, JSON.stringify(messages), err => {
        if (err) {
            console.log("写入失败");
            return;
        }
        console.log(filePath);
    });
}

function loadMessages(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        messages = JSON.parse(data);
        return messages.filter(message => message.show);
    } catch (error) {
        console.log(error);
        return false;
    }
}

function deleteMessage(id) {
    // 使用 filter 方法删除 id 为 0 的对象
    try {
        messages = messages.filter(message => message.id !== id);
        return messages.length;
    } catch (error) {
        return 0;
    }
}

function stopMessage(id) {
    stop_ids.push(id);
}

function copy(data) {
    return JSON.parse(JSON.stringify(data));
}

function format_messages(messages_list, params) {
    params = params ? params : {};
    // 遍历 messages_list 数组，并删除每个对象的 id 属性
    messages_list = messages_list.map(message => {
        let message_copy = copy(message);
        delete message_copy.id;
        delete message_copy.memory_id;
        delete message_copy.show;
        delete message_copy.react;
        return message_copy;
    });

    // 判断是否是视觉模型
    if (!params.hasOwnProperty("vision")) {
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
    if (!!params?.ollama) {
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
    if (!!env_message) {
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

async function chatBase(data) {
    try {
        let content = data.input;
        if (!!data?.img_url) {
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
        if (!!data.system_prompt) {
            messages_list = [{ role: "system", content: data.system_prompt, id: data.id, memory_id: null, show: true, react: false }]
            messages_list = messages_list.concat(messages.slice(messages.length - parseInt(data.memory_length * 1.5), messages.length))
        }
        else {
            messages_list = messages.slice(messages.length - parseInt(data.memory_length * 1.5), messages.length)
        }
        if (data?.push_message) {
            message_input = { role: "user", content: content, id: data.id, memory_id: null, show: true, react: false };
            messages_list.push(message_input)
        }
        let message_output = { role: 'assistant', content: '', id: data.id, memory_id: null, show: true, react: false }

        let body = {
            model: data.version,
            messages: format_messages(messages_list, data.params),
            ...data.llm_parmas
        }

        let headers = {
            "Content-Type": "application/json"
        }
        if (!!data?.api_key) {
            headers["Authorization"] = `Bearer ${data.api_key}`;
        }

        if (body?.stream && data.end) {
            try {
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
                        break;
                    }
                    // 处理流式输出
                    content = "";
                    if (chunk.hasOwnProperty("message")) {
                        content = chunk.message.content;
                        message_output.content += content;
                    } else {
                        let delta = chunk.choices[0]?.delta;
                        if (chunk.choices.length > 0 && delta) {
                            if (delta.hasOwnProperty("reasoning_content") && delta.reasoning_content)
                                content = delta.reasoning_content;
                            else if (delta.hasOwnProperty("content") && delta.content) {
                                content = delta.content;
                                message_output.content += content;
                            }
                        }
                    }
                    data.event.sender.send('stream-data', { id: data.id, content: content, end: false });
                }
                if (data?.stream_push != false) {
                    messages.push(message_input);
                    messages.push(message_output);
                    console.log(message_output)
                }
                data.event.sender.send('stream-data', { id: data.id, content: "", end: true });
                return true;
            } catch (error) {
                console.log(error);
                data.event.sender.send('info-data', { id: data.id, content: error.message });
            }
        } else {
            body.stream = false;
            const resp = await fetch(new URL(data.api_url), {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
            });
            const respJson = await resp.json();
            if (respJson.hasOwnProperty("error")) {
                data.event.sender.send('info-data', { id: data.id, content: `POST Error:\n\n\`\`\`\n${respJson.error?.message}\n\`\`\`\n\n` });
                return null;
            }
            if (respJson.hasOwnProperty("message")) {
                data.output = respJson.message.content;
            } else {
                data.output = respJson.choices[0].message.content;
            }
            message_output.content = data.output;
            if (data.end) {
                messages.push(message_input);
                messages.push(message_output);
                data.event.sender.send('stream-data', { id: data.id, content: data.output_template ? data.output_template.format(data) : data.output, end: true });
                return true;
            } else {
                if (data?.push_message) {
                    messages.push(message_input);
                    messages.push(message_output);
                }
            }
            return data.output;
        }
    } catch (error) {
        data.event.sender.send('info-data', { id: data.id, content: `响应错误: ${error.message}\n\n` });
        return null;
    }
}

module.exports = {
    chatBase, clearMessages, saveMessages, loadMessages, deleteMessage, stopMessage, getStopIds, pushMessage, getMessages, envMessage
};
