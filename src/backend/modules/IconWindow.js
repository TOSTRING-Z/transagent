const { Window } = require("./Window");
const { global, utils, inner } = require('./globals');

const { BrowserWindow, ipcMain, clipboard } = require('electron');

class IconWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
        this.width = 200;
        this.height = 40;
    }

    create(position) {

        let x = position.x
        let y = position.y > 50 ? position.y - 50 : position.y

        if (this.window) {
            this.window.setPosition(x, y);
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer);
                this.autoCloseTimer = setTimeout(() => {
                    this.destroy()
                }, utils.getConfig("icon_time") * 1000) // 自动关闭
            }
            return this.window
        }

        this.window = new BrowserWindow({
            width: this.width,
            height: this.height,
            x,
            y,
            transparent: true,
            frame: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            resizable: false,
            focusable: false, // 设置窗口不可聚焦
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        this.window.loadFile('src/frontend/icon.html')

        this.window.setIgnoreMouseEvents(false) // 允许鼠标交互

        this.window.on('closed', () => {
            this.window = null;
        })

        // 新增自动关闭逻辑
        this.autoCloseTimer = setTimeout(() => {
            this.destroy()
        }, utils.getConfig("icon_time") * 1000) // 自动关闭

        return this.window
    }

    destroy() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
        if (this.window) {
            this.window.close();
            this.window = null;
        }
    }

    setup() {
        ipcMain.on('concat-clicked', () => {
            global.concat = true;
            this.destroy();
        })

        ipcMain.on('translation-clicked', () => {
            global.concat = false;
            this.windowManager.mainWindow.send_query({ query: global.last_clipboard_content }, inner.model_name.plugins, utils.getConfig("default")["plugin"], null);
            this.destroy();
        })

        ipcMain.on('submit-clicked', () => {
            global.concat = false;
            this.windowManager.mainWindow.send_query({ query: global.last_clipboard_content }, global.model, global.version, global.stream);
            this.destroy();
        })

        ipcMain.on('clear-clicked', () => {
            global.concat = false;
            this.destroy();
            global.last_clipboard_content = "";
            clipboard.writeText(global.last_clipboard_content);
        })
    }

}

module.exports = {
    IconWindow
};