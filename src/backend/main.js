const { app } = require('electron');
const { install } = require('./modules/Install');
install();

const { WindowManager } = require("./modules/WindowManager");
const { Shortcut } = require('./modules/Shortcut');
const { Plugins } = require('./modules/Plugins');


const plugins = new Plugins();
plugins.init()

const windowManager = new WindowManager();
const shortcut = new Shortcut(windowManager);

/* app生命周期 */

app.on('ready', () => {
    windowManager.mainWindow.create();
    windowManager.mainWindow.setup();
    windowManager.iconWindow.setup();
    windowManager.configsWindow.setup();
    windowManager.overlayWindow.setup();
    shortcut.init();
})