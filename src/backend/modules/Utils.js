const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

class Utils {
    constructor(inner) {
        if (!Utils.instance) {
            this.inner = inner;
            Utils.instance = this;
        }
        return Utils.instance;
    }

    extractJson(text) {
        let startIndex = text.search(/[{[]/);
        if (startIndex === -1) return null;

        const stack = [];
        let isInsideString = false;

        for (let i = startIndex; i < text.length; i++) {
            const currentChar = text[i]; // 合并 currentChar 声明

            // 处理字符串内的转义字符（如 \"）
            if (currentChar === '"' && text[i - 1] !== '\\') {
                isInsideString = !isInsideString;
            }

            if (isInsideString) continue;

            // 跟踪括号层级
            if (currentChar === '{' || currentChar === '[') {
                stack.push(currentChar);
            } else if (
                (currentChar === '}' && stack[stack.length - 1] === '{') ||
                (currentChar === ']' && stack[stack.length - 1] === '[')
            ) {
                stack.pop();
            }

            // 当所有括号闭合时尝试解析
            if (stack.length === 0) {
                const candidate = text.substring(startIndex, i + 1);
                try {
                    return candidate;
                } catch (e) {
                    // 继续扫描后续内容
                    startIndex = text.indexOf('{', i + 1);
                    if (startIndex === -1) return null;
                    i = startIndex - 1;
                    stack.length = 0;
                }
            }
        }
        return null;
    }

    delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    getConfig(key = null) {
        const configFilePath = path.join(os.homedir(), '.bixchat', 'config.json');
        const data = fs.readFileSync(configFilePath, 'utf-8');
        let config = JSON.parse(data);
        if (key === null) {
            return config;
        }
        if (key == "models") {
            const models = config["models"];
            for (const key in models) {
                if (Object.hasOwnProperty.call(models, key)) {
                    const versions = models[key].versions;
                    versions.forEach((version, i) => {
                        version = typeof version == "string" ? { version: version } : version;
                        config["models"][key].versions[i] = version;
                    });
                }
            }
        }
        config["models"][this.inner.model_name.plugins] = this.inner.model[this.inner.model_name.plugins]
        return config[key]
    }

    setConfig(config) {
        const configPath = path.join(os.homedir(), '.bixchat', 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); // 美化输出
        return true;
    }

    getSshConfig() {
        const sshConfig = this.getConfig("tool_call")?.ssh_config;
        return sshConfig;
    }

    getIsPlugin(model) {
        return Object.values(this.inner.model_name).includes(model);
    }

    getLanguage() {
        // 方法1: 使用 app.getLocale()
        let locale = app.getLocale();

        // 方法2: 如果为空，尝试 process.env.LANG (Unix-like 系统)
        if (!locale && process.env.LANG) {
            locale = process.env.LANG.split('.')[0].replace('_', '-');
        }

        // 方法3: 如果仍然为空，使用 navigator.language (仅在渲染进程可用)
        if (!locale && typeof navigator !== 'undefined') {
            locale = navigator.language;
        }

        // 方法4: 最终回退到英语
        if (!locale) {
            locale = 'en-US';
        }

        // 标准化语言代码
        locale = locale.replace('_', '-');

        // 映射到友好名称
        const languageMap = {
            'zh': 'You should answer in Chinese.',
            'zh-CN': 'You should answer in Chinese.',
            'zh-TW': 'You should answer in Chinese.',
            'zh-HK': 'You should answer in Chinese.',
            'en': 'You should answer in English.',
            'en-US': 'You should answer in English.',
            'en-GB': 'You should answer in English.'
        };

        // 尝试匹配完整代码，如果不匹配则尝试基础语言代码
        return languageMap[locale] ||
            languageMap[locale.split('-')[0]] ||
            locale;
    }

    formatDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份是从0开始的
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    copy(data) {
        return JSON.parse(JSON.stringify(data));
    }

    getChatId() {
        //返回chat-UUID
        return `chat-${crypto.randomUUID()}`;
    }

    getHistoryData() {
        const historyFilePath = path.join(os.homedir(), '.bixchat', 'history.json');
        if (!fs.existsSync(historyFilePath)) {
            return []
        } else {
            const data = fs.readFileSync(historyFilePath, 'utf-8');
            let historyData = JSON.parse(data);
            return historyData.data
        }
    }

    setHistoryData(historyData) {
        const historyFilePath = path.join(os.homedir(), '.bixchat', 'history.json');
        fs.writeFileSync(historyFilePath, JSON.stringify({ data: historyData }, null, 2));
    }

    getHistoryPath(id) {
        let history_path = this.getConfig("history_path")?.format(process);
        if (!fs.existsSync(history_path)) {
            history_path = path.join(process.resourcesPath, 'resources/', 'history/', `${id}.json`);
        } else {
            history_path = path.join(history_path, `${id}.json`);
        }
        return history_path;
    }
}

module.exports = {
    Utils
};