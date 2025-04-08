const { IconWindow } = require("./IconWindow");
const { MainWindow } = require("./MainWindow");
const { OverlayWindow } = require("./OverlayWindow");
const { ConfigsWindow } = require("./ConfigsWindow");

class WindowManager {
    constructor() {
        if (!WindowManager.instance) {
            this.mainWindow = new MainWindow(this);
            this.iconWindow = new IconWindow(this);
            this.overlayWindow = new OverlayWindow(this);
            this.configsWindow = new ConfigsWindow(this);
            WindowManager.instance = this;
        }
        return WindowManager.instance;
    }

    closeAllWindows() {
        this.overlayWindow.destroy();
        this.configsWindow.destroy();
        this.iconWindow.destroy();
    }
}

module.exports = {
    WindowManager
};