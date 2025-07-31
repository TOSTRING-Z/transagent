const { Window } = require("./Window")
const { Plugins } = require('./Plugins');
const { store, global, inner, utils } = require('./globals')
const { clearMessages, saveMessages, toggleMessage, thumbMessage, toggleMemory, stopMessage, getStopIds, pushMessage, popMessage, getMessages } = require('../server/llm_service');
const { captureMouse } = require('../mouse/capture_mouse');
const { State } = require("../server/agent.js")
const { ToolCall } = require('../server/tool_call');
const { ChainCall } = require('../server/chain_call');
const { WebServer } = require('./WebServer.js');

const { BrowserWindow, Menu, shell, ipcMain, clipboard, dialog } = require('electron');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const JSON5 = require("json5");

class MainWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.tool_call = new ToolCall(inner.model_obj[inner.model_name.plugins]);
        this.chain_call = new ChainCall();
        this.webServer = new WebServer(this);
        this.funcItems = {
            clip: {
                statu: utils.getConfig("func_status")?.clip,
                event: () => { },
                click: () => {
                    this.funcItems.clip.statu = !this.funcItems.clip.statu;
                }
            },
            markdown: {
                statu: utils.getConfig("func_status")?.markdown,
                event: () => { },
                click: () => {
                    this.funcItems.markdown.statu = !this.funcItems.markdown.statu;
                    this.funcItems.markdown.event();
                }
            },
            math: {
                statu: utils.getConfig("func_status")?.math,
                event: () => { },
                click: () => {
                    this.funcItems.math.statu = !this.funcItems.math.statu;
                    this.funcItems.math.event();
                }
            },
            text: {
                statu: utils.getConfig("func_status")?.text,
                event: () => { },
                click: () => {
                    this.funcItems.text.statu = !this.funcItems.text.statu;
                }
            },
            del: {
                statu: utils.getConfig("func_status")?.del,
                event: () => { },
                click: () => {
                    this.funcItems.del.statu = !this.funcItems.del.statu;
                }
            },
            react: {
                statu: utils.getConfig("func_status").react,
                event: () => { },
                click: () => {
                    this.funcItems.react.statu = !this.funcItems.react.statu;
                    this.funcItems.react.event();
                }
            },
        };
    }

    create() {
        this.window = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                // eslint-disable-next-line no-undef
                preload: path.join(__dirname, '../preload.js')
            }
        })

        this.window.on('focus', () => {
            this.window.setAlwaysOnTop(true)
            setTimeout(() => this.window.setAlwaysOnTop(false), 0);
        })

        const menu = Menu.buildFromTemplate(this.getTemplate())
        Menu.setApplicationMenu(menu)

        this.window.loadFile('src/frontend/index.html')

        // Start web server
        this.webServer.start();

        // Send message to renderer process after window loaded
        this.window.webContents.on('did-finish-load', () => {
            this.initFuncItems();
            this.initInfo();
        });

        // Intercept page navigation
        this.window.webContents.on('will-navigate', (event, url) => {
            function isValidUrl(url) {
                try {
                    new URL(url); // If URL is invalid, will throw error
                    return true;
                } catch {
                    return false;
                }
            }
            // Prevent navigation
            event.preventDefault();
            console.log(`Attempt to navigate to: ${url}, has been blocked`);
            if (isValidUrl(url)) {
                shell.openExternal(url).catch((error) => {
                    console.error('Failed to open link:', error.message);
                });
            } else {
                console.error('Invalid URL:', url);
            }
        });

        // Bind window close event
        this.window.on('close', () => {
            this.windowManager.closeAllWindows();
        })

        this.window.on('closed', () => {
            this.webServer.stop();
            this.window = null;
        })

        global.last_clipboard_content = clipboard.readText();
    }

    async setChatName(data) {
        if (data?.is_plugin) {
            // 如果是插件调用
            global.chat.name = utils.formatDate();
        } else {
            const data_copy = utils.copy(data);
            // 调用大模型自动生成聊天名称
            const content = `Generate a short ${data.language || utils.getLanguage()} chat name based on context. Return name only (strictly no JSON/XML/formatting). Requirements: max 20 chars, must contain letters, no pure numbers/symbols/spaces.`;
            data_copy.push_message = false;
            data_copy.end = false;
            pushMessage("user", content, -1, -1);
            data_copy.return_response = true;
            if (data_copy?.llm_parmas?.response_format)
                delete data_copy.llm_parmas.response_format;
            data_copy.system_prompt = `You are an intelligent assistant skilled at generating short chat names based on contextual content. Please ensure the generated names are concise and clear, accurately reflecting the chat content.`;
            const result = await this.tool_call.llmCall(data_copy);
            popMessage(-1, -1); // 删除输入消息
            if (result) {
                global.chat.name = data_copy.output;
            }
        }
        this.setHistory();
        this.window.webContents.send('auto-rename-chat', global.chat);
    }

    async contextAutoOpt(data) {
        const auto_optimization = inner.model_obj[inner.model_name.plugins][utils.getConfig('default')['auto_optimization']]?.func;
        const messages = getMessages(true);
        let ids = { 'ids': [], 'memory_ids': [] };
        for (const key in messages) {
            if (getStopIds().includes(data.id)) {
                this.window.webContents.send('stream-data', { id: data.id, content: "The user interrupted the task.", end: true });
                break;
            }
            if (Object.hasOwnProperty.call(messages, key)) {
                let history, name, content;
                const message = messages[key];
                const content_json = utils.extractJson(message.content)
                if (content_json) content = JSON5.parse(content_json);
                if (message.role === 'user' && message.react === false) {
                    history = message.content;
                    name = 'ids';
                }
                else if (content && Object.hasOwnProperty.call(content, 'thinking')) {
                    history = content['thinking'];
                    name = 'memory_ids'
                }
                if (history) {
                    const pred = await auto_optimization({ query: data.query, history });
                    if (pred === null) {
                        this.window.webContents.send('log', 'Error in loading context automatic optimization model!');
                        break;
                    }
                    if (pred === 0) {
                        const messages_by_id = messages.filter(msg => msg.id === message.id && msg.memory_id === message.memory_id);
                        messages_by_id.forEach(msg => {
                            msg.del = true;
                        });
                        if (name === 'ids') {
                            ids[name].push(message.id);
                        } else {
                            ids[name].push(message.memory_id);
                        }
                    } else {
                        const messages_by_id = messages.filter(msg => msg.id === message.id && msg.memory_id === message.memory_id);
                        messages_by_id.forEach(msg => {
                            if (msg?.del)
                                delete msg.del;
                        });
                    }
                }
            }
        }
        ids['ids'] = [...new Set(ids['ids'])];
        ids['memory_ids'] = [...new Set(ids['memory_ids'])];
        this.window.webContents.send('delete-memory', ids);
    }

    getDataDefault(data) {
        if (!data) {
            data = {};
        }
        let defaults = {
            prompt: this.funcItems.text.event(data?.prompt),
            query: this.funcItems.text.event(data?.query),
            img_url: data?.img_url,
            file_path: data?.file_path,
            model: utils.copy(data?.model || global.model),
            version: utils.copy(data?.version || global.version),
            output_template: null,
            input_template: null,
            prompt_template: null,
            params: null,
            llm_parmas: utils.getConfig("llm_parmas"),
            memory_length: utils.getConfig("memory_length"),
            push_message: true,
            end: null,
            event: this.window.webContents
        }
        data.outputs = []
        data.output_formats = []
        data = { ...data, ...defaults }
        return data;
    }

    async callReAct(data) {
        data.chat = global.chat;
        let step = 0;
        this.tool_call.state = State.IDLE;
        let tool_call = utils.getConfig("tool_call");
        while (this.tool_call.state != State.FINAL && this.tool_call.state != State.PAUSE) {
            if (getStopIds().includes(data.id)) {
                this.tool_call.state = State.FINAL
                this.window.webContents.send('stream-data', { id: data.id, content: "The user interrupted the task.", end: true });
                break;
            }
            data = { ...data, ...tool_call, step: ++step, memory_id: this.tool_call.memory_id, react: true };

            let options = await this.tool_call.step(data);
            if (!global.chat.name) {
                global.chat.name = await this.setChatName(data)
            }
            this.setHistory()
            if (this.tool_call.state == State.PAUSE) {
                this.window.webContents.send("options", { options, id: data.id });
            }
        }
        let agent_messages = getMessages(true).filter(message => message.id === data.id);
        utils.sendData(inner.url_base.data.collection, {
            "chat_id": global.chat.id,
            "message_id": data.id,
            "user_message": data.query,
            "agent_messages": agent_messages,
        })
        return data.output_formats;
    }

    async callChain(data) {
        this.chain_call.state = State.IDLE;
        let chain_calls = utils.getConfig("chain_call");
        for (const step in chain_calls) {
            if (getStopIds().includes(data.id)) {
                this.window.webContents.send('stream-data', { id: data.id, content: "The user interrupted the task.", end: true });
                break;
            }
            data = { ...data, ...{ model: global.model, version: global.version }, ...chain_calls[step], step: step };
            const tool_parmas = {}
            const input_data = chain_calls[step]?.input_data || [];
            for (const key in input_data) {
                if (Object.hasOwnProperty.call(input_data, key)) {
                    const item = input_data[key];
                    tool_parmas[key] = item.format(data);
                }
            }
            data = { ...data, ...tool_parmas };
            await this.chain_call.step(data);
            this.setHistory()
            if (this.chain_call.state == State.FINAL) {
                if (this.chain_call.is_plugin)
                    this.window.webContents.send('stream-data', { id: data.id, content: data.output_format, end: true });
                break;
            }
            if (this.chain_call.state == State.ERROR) {
                this.window.webContents.send('stream-data', { id: data.id, content: "Error occurred!", end: true });
                break;
            }

            let info = this.chain_call.get_info(data);
            this.window.webContents.send('info-data', { id: data.id, content: info });
        }
        if (!global.chat.name) {
            global.chat.name = await this.setChatName(data)
        }
        let agent_messages = getMessages(true).filter(message => message.id === data.id);
        utils.sendData(inner.url_base.data.collection, {
            "chat_id": global.chat.id,
            "message_id": data.id,
            "user_message": data.query,
            "agent_messages": agent_messages,
        })
        return data.output_format;
    }

    setup() {

        ipcMain.handle('get-file-path', async () => {
            return new Promise((resolve, rejects) => {
                const lastDirectory = store.get('lastFileDirectory') || utils.getDefault("config.json");
                dialog
                    .showOpenDialog(this.window, {
                        properties: ['openFile'],
                        defaultPath: lastDirectory
                    })
                    .then(result => {
                        if (!result.canceled) {
                            const filePath = result.filePaths[0];
                            store.set('lastFileDirectory', path.dirname(filePath));
                            console.log(filePath);
                            if (this.funcItems.react.statu) {
                                const ssh_config = utils.getSshConfig();
                                if (ssh_config?.enabled) {
                                    const conn = new Client();
                                    conn
                                        .on('ready', () => {
                                            console.log('SSH Connection Ready');
                                            conn.sftp(async (err, sftp) => {
                                                if (err) throw err;

                                                const base_name = path.basename(filePath);
                                                const remotePath = `/tmp/${base_name}`;

                                                this.window.webContents.send('upload-progress', { state: "start" })
                                                sftp.fastPut(filePath, remotePath, {}, (err) => {
                                                    if (err) {
                                                        console.error('上传失败:', err);
                                                    } else {
                                                        console.log(`文件上传成功: ${filePath} -> remote:${remotePath}`);
                                                    }
                                                    conn.end();
                                                    this.window.webContents.send('upload-progress', { state: "end", remotePath })
                                                });

                                            });

                                        })
                                        .on('error', (err) => {
                                            console.error('Connection Error:', err);
                                        })
                                        .on('close', () => {
                                            console.log('Connection Closed');
                                        })
                                        .connect(ssh_config);

                                } else {
                                    resolve(filePath)
                                }
                            } else {
                                resolve(filePath)
                            }
                        }
                    })
                    .catch(err => {
                        rejects(err);
                    });
            });
        })

        ipcMain.handle('query-text', async (_event, data) => {
            // eslint-disable-next-line no-undef
            if (process.platform !== 'win32') {
                this.window.show();
            } else {
                this.window.focus();
            }
            if (global.status.auto_opt) {
                await this.contextAutoOpt(data);
            }
            // Default values
            data = this.getDataDefault(data);
            if (data?.is_plugin) {
                let content = await this.chain_call.pluginCall(data);
                this.window.webContents.send('stream-data', { id: data.id, content: content, end: true, is_plugin: data.is_plugin });
            }
            else if (this.funcItems.react.statu) {
                // ReAct
                await this.callReAct(data)
            }
            else {
                // Chain call
                await this.callChain(data);
            }
        })

        ipcMain.handle("toggle-message", async (_event, data) => {
            let message_len = await toggleMessage({ ...data, del_mode: !!this.funcItems.del.statu });
            this.setHistory();
            console.log(`delete id: ${data.id}, length: ${message_len}`)
            return { del_mode: !!this.funcItems.del.statu };
        })

        ipcMain.handle("thumb-message", async (_event, data) => {
            let result = await thumbMessage(data);
            if (result?.type === "messages") {
                const messages = result.data;
                this.setHistory();
                console.log(`message id: ${data.id}, thumb: ${data.thumb}`);
                utils.sendData(inner.url_base.data.collection, {
                    "chat_id": global.chat.id,
                    "message_id": data.id,
                    "user_message": messages[0].content,
                    "agent_messages": messages,
                });
                return messages ? data.thumb : 0;
            } else if (result?.type === "thumb") {
                return result.data;
            }
        })

        ipcMain.handle("toggle-memory", async (_event, memory_id) => {
            let memory_len = await toggleMemory({ memory_id: memory_id, del_mode: !!this.funcItems.del.statu });
            this.setHistory();
            console.log(`delete memory_id: ${memory_id}, length: ${memory_len}`)
            return { del_mode: !!this.funcItems.del.statu };
        })

        ipcMain.on("toggle-auto-opt", () => {
            global.status.auto_opt = !global.status.auto_opt;
            console.log(`global.status.auto_opt: ${global.status.auto_opt}`)
        })

        ipcMain.on("stream-message-stop", (_event, id) => {
            stopMessage(id);
            console.log(`stop id: ${id}`)
        })

        ipcMain.on('submit', (_event, formData) => {
            this.send_query(formData, global.model, global.version)
        })

        ipcMain.on('plan-act-mode', (_event, mode) => {
            this.tool_call.plan_act_mode({
                "auto": this.tool_call.modes.AUTO,
                "plan": this.tool_call.modes.PLAN,
                "act": this.tool_call.modes.ACT,
            }[mode])
        })

        ipcMain.on('open-external', (_event, href) => {
            console.log(href)
            shell.openExternal(href);
        })

        ipcMain.handle('new-chat', () => {
            clearMessages();
            this.window.webContents.send('clear');
            global.chat = utils.getChatInit();
            global.chat.id = utils.getChatId();
            this.setHistory();
            let chat = utils.copy(global.chat);
            chat.name = utils.formatDate();
            return chat;
        })

        ipcMain.handle('load-chat', (_event, id) => {
            clearMessages();
            const history = this.loadHistory(id);
            if (history)
                global.chat = history;
            return history;
        })

        ipcMain.on('del-chat', (_event, id) => {
            if (id == global.chat.id) {
                clearMessages();
                this.window.webContents.send('clear');
            }
            this.delHistory(id);
        })

        ipcMain.on('rename-chat', (_event, data) => {
            this.renameHistory(data);
        })

        // 读取配置
        ipcMain.handle('get-config-main', () => {
            return utils.getConfig();
        });

        // 保存配置
        ipcMain.handle('set-config-main', (_, config) => {
            let state = utils.setConfig(config);
            this.updateVersionsSubmenu()
            const plugins = new Plugins();
            plugins.init()
            return state;
        });

        // 环境变量
        ipcMain.handle('envs', (_, data) => {
            if (data.type === "set") {
                const envs = data.envs;
                global.chat.envs = envs;
                this.setHistory()
                return true;
            } else {
                const envs = global.chat?.envs;
                return envs || {};
            }
        });

        // 任务列表
        ipcMain.handle('tasks', (_, data) => {
            if (data.type === "set") {
                const tasks = data.tasks;
                global.chat.vars.tasks = tasks;
                this.setHistory();
                return true;
            } else {
                const tasks = global.chat?.vars?.tasks;
                return tasks || [];
            }
        });

        ipcMain.on('set-global', (_, chat) => {
            global.chat.tokens = chat.tokens;
            global.chat.seconds = chat.seconds;
        });
    }

    send_query(data, model, version, api_callback = true) {
        data = { ...data, model, version, is_plugin: utils.getIsPlugin(model), id: ++global.id }
        this.window.webContents.send('query', { data, api_callback });
    }

    getClipEvent(e) {
        return setInterval(async () => {
            let clipboardContent = clipboard.readText();

            if (clipboardContent !== global.last_clipboard_content) {
                if (global.concat) {
                    global.last_clipboard_content = `${global.last_clipboard_content} ${clipboardContent}`;
                    clipboard.writeText(global.last_clipboard_content);
                } else {
                    global.last_clipboard_content = clipboardContent;
                }
                if (this.funcItems.text.statu) {
                    try {
                        const dom = new JSDOM(global.last_clipboard_content);
                        const plainText = dom.window.document.body.textContent;
                        global.last_clipboard_content = plainText
                        clipboard.writeText(plainText);
                        console.log('Clipboard content has been converted to plain text.');
                    } catch (error) {
                        console.error('Failed to clear clipboard formatting:', error);
                    }
                }
                if (e.statu) {
                    captureMouse()
                        .then((mousePosition) => {
                            console.log(mousePosition);
                            this.windowManager.iconWindow.create(mousePosition);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            }
        }, 100);
    }

    getMarkDownEvent(e) {
        const markdownFormat = () => {
            this.window.webContents.send('markdown-format', e.statu);
        }
        markdownFormat();
        return markdownFormat;
    }

    getMathEvent(e) {
        const mathFormat = () => {
            this.window.webContents.send('math-format', e.statu);
        }
        mathFormat();
        return mathFormat;
    }

    getTextEvent(e) {
        const textFormat = (text) => {
            if (text != null) {
                text = text.replaceAll('-\n', '');
                if (e.statu) {
                    return text.replace(/[\s\n]+/g, ' ').trim();
                } else {
                    return text;
                }
            }
        }
        return textFormat;
    }

    getReactEvent(e) {
        const extraReact = () => {
            this.window.webContents.send('react-statu', e.statu);
            if (global.is_plugin) {
                console.log(inner.model_obj)
                console.log(global)
                this.window.webContents.send("extra_load", e.statu && inner.model_obj[global.model][global.version]?.extra)
            }
            else {
                const ssh_config = utils.getSshConfig();
                let extra = [{ "type": "act-plan" }];
                if (ssh_config?.enabled) {
                    extra.push({ "type": "file-upload" });
                }
                this.window.webContents.send("extra_load", e.statu ? extra : utils.getConfig("extra"));
            }
        }
        extraReact();
        return extraReact;
    }

    initFuncItems() {
        this.funcItems.clip.event = this.getClipEvent(this.funcItems.clip);
        this.funcItems.markdown.event = this.getMarkDownEvent(this.funcItems.markdown);
        this.funcItems.math.event = this.getMathEvent(this.funcItems.math);
        this.funcItems.text.event = this.getTextEvent(this.funcItems.text);
        this.funcItems.react.event = this.getReactEvent(this.funcItems.react);
    }

    initInfo() {
        const filePath = utils.getConfig("prompt");
        let prompt = "";
        if (fs.existsSync(filePath)) {
            prompt = fs.readFileSync(filePath, 'utf-8');
        }
        const history_data = utils.getHistoryData();
        global.chat = utils.getChatInit();
        this.window.webContents.send('init-info', { prompt, ...global, chats: history_data.data });
    }

    updateVersionsSubmenu() {
        const menu = Menu.buildFromTemplate(this.getTemplate());
        Menu.setApplicationMenu(menu);
    }

    getModelsSubmenu() {
        return Object.keys(utils.getConfig("models")).map((_model) => {
            return {
                type: 'radio',
                checked: global.model == _model,
                click: () => {
                    global.model = _model;
                    global.is_plugin = utils.getIsPlugin(_model)
                    global.version = utils.getConfig("models")[_model]["versions"][0].version;
                    this.updateVersionsSubmenu();
                },
                label: _model
            }
        })
    }

    getVersionsSubmenu() {
        let versions;
        if (global.is_plugin) {
            versions = inner.model[inner.model_name.plugins]["versions"];
            console.log(versions)
            versions = versions.filter(version => version?.show);
            console.log(versions)
        }
        else {
            versions = utils.getConfig("models")[global.model]["versions"];
        }
        this.funcItems.react.event();
        console.log(versions);
        return versions.map((version) => {
            const _version = version?.version || version;
            return {
                type: 'radio',
                checked: global.version == _version,
                click: () => {
                    global.version = _version
                    if (global.is_plugin) {
                        this.window.webContents.send("extra_load", version?.extra)
                    }
                },
                label: _version
            }
        })
    }

    getTemplate() {
        return [
            {
                label: "Model Selection",
                submenu: this.getModelsSubmenu()
            },
            {
                label: "Version Selection",
                submenu: this.getVersionsSubmenu()
            },
            {
                label: "Function Selection",
                submenu: [
                    {
                        click: this.funcItems.markdown.click,
                        label: 'Auto MarkDown',
                        type: 'checkbox',
                        checked: this.funcItems.markdown.statu,
                    },
                    {
                        click: this.funcItems.math.click,
                        label: 'Formula Formatting',
                        type: 'checkbox',
                        checked: this.funcItems.math.statu,
                    },
                    {
                        click: this.funcItems.text.click,
                        label: 'Text Formatting',
                        type: 'checkbox',
                        checked: this.funcItems.text.statu,
                    },
                    {
                        click: this.funcItems.clip.click,
                        label: 'Copy Tool',
                        type: 'checkbox',
                        checked: this.funcItems.clip.statu,
                    },
                    {
                        click: this.funcItems.del.click,
                        label: 'Delete Mode',
                        type: 'checkbox',
                        checked: this.funcItems.del.statu,
                    },
                ]
            },
            {
                label: "Agent",
                submenu: [
                    {
                        label: 'System Prompt',
                        click: async () => {
                            this.loadPrompt();
                        }
                    },
                    {
                        label: 'Chain Call',
                        click: async () => {
                            this.loadChain();
                        }
                    },
                    {
                        click: this.funcItems.react.click,
                        label: 'ReAct',
                        type: 'checkbox',
                        checked: this.funcItems.react.statu,
                    },
                ]
            },
            {
                label: 'Others',
                submenu: [
                    {
                        label: 'Configuration',
                        click: async () => {
                            this.windowManager.configsWindow.create();
                        }
                    },
                    {
                        label: 'Save Configuration',
                        click: () => {
                            const lastPath = path.join(store.get('lastSaveConfigurationPath') || utils.getDefault(), 'config.json');
                            dialog.showSaveDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON File', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    store.set('lastSaveConfigurationPath', path.dirname(result.filePath));
                                    const config = utils.getConfig();
                                    fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2));
                                    console.log('Configuration saved successfully.');
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                    {
                        label: 'Load Configuration',
                        click: () => {
                            const lastPath = store.get('lastLoadConfigurationPath') || utils.getDefault();
                            dialog.showOpenDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON File', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    store.set('lastLoadConfigurationPath', path.dirname(result.filePaths[0]));
                                    // 复制配置文件到默认目录
                                    const configFilePath = path.join(utils.getDefault(), 'config.json');
                                    fs.copyFile(result.filePaths[0], configFilePath, (err) => {
                                        if (err) {
                                            console.error('Error copying configuration file:', err);
                                        } else {
                                            console.log('Configuration file copied successfully.');
                                            this.windowManager.configsWindow.window?.webContents.send('load-config', configFilePath);
                                        }
                                    });
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                    {
                        label: 'Console',
                        click: () => {
                            if (this.windowManager?.configsWindow) this.windowManager.configsWindow.window?.webContents.openDevTools();
                            if (this.window) this.window.webContents.openDevTools();
                        }
                    },
                    {
                        label: 'Reset Conversation',
                        click: () => {
                            clearMessages();
                            this.window.webContents.send('clear')
                            global.chat = utils.getChatInit();
                            this.setHistory();
                        }
                    },
                    {
                        label: 'Save Conversation',
                        click: () => {
                            const lastPath = path.join(store.get('lastSavePath') || utils.getDefault("history/"), `messages_${utils.formatDate()}.json`);
                            console.log(lastPath)
                            dialog.showSaveDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON File', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    store.set('lastSavePath', path.dirname(result.filePath));
                                    saveMessages(result.filePath);
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                    {
                        label: 'Load Conversation',
                        click: () => {
                            const lastPath = store.get('lastLoadPath') || utils.getDefault("history/");
                            dialog.showOpenDialog(this.window, {
                                defaultPath: lastPath,
                                filters: [
                                    { name: 'JSON File', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            }).then(result => {
                                if (!result.canceled) {
                                    store.set('lastLoadPath', path.dirname(result.filePaths[0]));
                                    this.tool_call.load_message(this.window, result.filePaths[0])
                                }
                            }).catch(err => {
                                console.error(err);
                            });
                        }
                    },
                ]
            }

        ]
    }

    setPrompt(filePath = null) {
        if (!!filePath && fs.existsSync(filePath)) {
            const config = utils.getConfig();
            if (this.funcItems.react.statu) {
                config.tool_call.extra_prompt = filePath;
            } else {
                config.prompt = filePath;
                const prompt = fs.readFileSync(filePath, 'utf-8');
                this.window.webContents.send('prompt', prompt);
            }
            utils.setConfig(config);
        }
    }

    loadPrompt() {
        // eslint-disable-next-line no-undef
        const lastDirectory = store.get('lastPromptDirectory') || path.join(process.resourcesPath, 'resources/', 'system_prompts/');
        dialog
            .showOpenDialog(this.window, {
                properties: ['openFile'],
                defaultPath: lastDirectory
            })
            .then(result => {
                if (!result.canceled) {
                    const filePath = result.filePaths[0];
                    store.set('lastPromptDirectory', path.dirname(filePath));
                    console.log(filePath);
                    this.setPrompt(filePath);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    setChain(chain) {
        let config = utils.getConfig();
        config.chain_call = JSON.parse(chain).chain_call;
        config.extra = [];
        for (const key in config.chain_call) {
            if (Object.hasOwnProperty.call(config.chain_call, key)) {
                const item = config.chain_call[key];
                let extra;
                if (item?.model == inner.model_name.plugins) {
                    extra = inner.model_obj.plugins[item.version]?.extra || []
                } else {
                    extra = [{ "type": "system-prompt" }]
                }
                extra.forEach(extra_ => {
                    config.extra.push(extra_)
                });
            }
        }
        const deduplicateByType = (arr) => {
            const seen = new Set();
            return arr.filter(item => {
                const duplicate = seen.has(item.type);
                seen.add(item.type);
                return !duplicate;
            });
        }
        config.extra = deduplicateByType(config.extra);
        utils.setConfig(config);
        this.funcItems.react.statu = false;
        this.funcItems.react.event();
        this.updateVersionsSubmenu();
    }

    loadChain() {
        // eslint-disable-next-line no-undef
        const lastDirectory = store.get('lastChainDirectory') || path.join(process.resourcesPath, 'resources/', 'chain_calls/');
        dialog
            .showOpenDialog(this.window, {
                properties: ['openFile'],
                defaultPath: lastDirectory
            })
            .then(result => {
                if (!result.canceled) {
                    const filePath = result.filePaths[0];
                    store.set('lastChainDirectory', path.dirname(filePath));
                    console.log(filePath);
                    const chain = fs.readFileSync(filePath, 'utf-8');
                    this.setChain(chain);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    setHistory() {
        if (global.chat.id) {
            // 保存当前聊天记录到历史记录
            if (global.chat.tokens == null) {
                global.chat.tokens = 0;
            }
            if (global.chat.seconds == null) {
                global.chat.seconds = 0;
            }
            let history_data = utils.getHistoryData();
            let history_exist = history_data.data.filter(history_ => history_.id == global.chat.id);
            if (history_exist.length == 0) {
                const history = global.chat
                history_data.data.push(history)
                utils.setHistoryData(history_data);
            } else {
                history_data.data = history_data.data.map(history_ => {
                    if (history_.id == global.chat.id) {
                        history_ = global.chat
                    }
                    return history_;
                });
                utils.setHistoryData(history_data);
            }
            const history_path = utils.getHistoryPath(global.chat.id);
            saveMessages(history_path);
        }
    }

    delHistory(id) {
        let history_data = utils.getHistoryData();
        history_data.data = history_data.data.filter(history => history.id != id);
        utils.setHistoryData(history_data);
    }

    renameHistory(data) {
        if (global.chat.id == data.id) {
            global.chat.name = data.name;
        }
        let history_data = utils.getHistoryData();
        history_data.data = history_data.data.map(history => {
            if (history.id == data.id) {
                history.name = data.name;
            }
            return history;
        });
        utils.setHistoryData(history_data);
    }

    loadHistory(id) {
        const history_path = utils.getHistoryPath(id);
        this.tool_call.load_message(this.window, history_path);
        let chat = utils.getChatInit();
        const history_data = utils.getHistoryData();
        const history = history_data.data.find(history_ => history_.id == id);
        return { ...chat, ...history };
    }
}

module.exports = {
    MainWindow
};