const { Window } = require("./Window");
const { utils } = require('./globals');
const { Plugins } = require('./Plugins');

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');


class ConfigsWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
    }

    create() {
        if (this.window) {
            this.window.restore(); // 恢复窗口
            this.window.show();
            this.window.focus();
        } else {
            this.window = new BrowserWindow({
                width: 600,
                height: 600,
                frame: false, // 隐藏默认标题栏和边框
                transparent: true, // 可选：实现透明效果
                resizable: true, // 允许调整窗口大小
                icon: path.join(__dirname, 'icon/icon.ico'),
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            })

            this.window.loadFile('src/frontend/config.html')
            this.window.on('closed', () => {
                this.window = null;
            })

            ipcMain.on('minimize-window', () => {
                BrowserWindow.getFocusedWindow().minimize()
            })

            ipcMain.on('close-window', () => {
                BrowserWindow.getFocusedWindow().close()
            })
        }
    }

    destroy() {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
    }

    setup() {
        // 读取配置
        ipcMain.handle('get-config', () => {
            return utils.getConfig();
        });

        // 保存配置
        ipcMain.handle('set-config', (_, config) => {
            let state = utils.setConfig(config);
            this.windowManager.mainWindow.updateVersionsSubmenu()
            const plugins = new Plugins();
            plugins.init()
            return state;
        });
    }

}

module.exports = {
    ConfigsWindow
};