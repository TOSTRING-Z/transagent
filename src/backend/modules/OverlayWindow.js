const { Window } = require("./Window");
const { global } = require("./globals")

const { BrowserWindow, ipcMain, desktopCapturer } = require('electron');

class OverlayWindow extends Window {
    constructor(windowManager) {
        super(windowManager);
    }

    create() {
        this.window = new BrowserWindow({
            fullscreen: true,
            frame: false,
            transparent: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        this.window.loadFile('src/frontend/overlay.html')
        this.window.setAlwaysOnTop(true, 'screen-saver')

        this.window.on('closed', () => {
            this.window = null;
        })
    }

    destroy() {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
    }

    setup() {

        ipcMain.handle('app:overlay:get-position', async () => {
            return this.windowManager.iconWindow.window.getBounds();
        })

        ipcMain.on('app:overlay:set-position', async (_, { x, y }) => {
            this.windowManager.iconWindow.window.setBounds({ x: x, y: y, width: this.windowManager.iconWindow.width, height: this.windowManager.iconWindow.height })
        })

        ipcMain.on('start-capture', () => {
            this.windowManager.iconWindow.destroy();
            this.create()
        })

        ipcMain.handle('capture-region', async (_, { start, end, dpr }) => {
            try {
                const sources = await desktopCapturer.getSources({ types: ['screen'] });
                const source = sources.find(s => s.name === 'Entire Screen' || s.name === '整个屏幕');

                // 返回源数据给渲染进程
                return {
                    source: source,
                    captureRect: {
                        x: Math.min(start.x, end.x) * dpr,
                        y: Math.min(start.y, end.y) * dpr,
                        width: Math.abs(end.x - start.x) * dpr,
                        height: Math.abs(end.y - start.y) * dpr
                    }
                }
            } catch (error) {
                throw new Error(`主进程捕获失败: ${error.message}`)
            }
        })

        ipcMain.on('query-img', (_, img_url) => {
            this.windowManager.mainWindow.send_query({ img_url: img_url }, global.model, global.version, global.stream);
            this.windowManager.overlayWindow.destroy();
        })
    }

}

module.exports = {
    OverlayWindow
};