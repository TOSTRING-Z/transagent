/* 全局变量 */

const { default: Store } = require('electron-store');
const { Utils } = require('./Utils');
console.log(Store);
const store = new Store();

// 插件配置参数
const inner = {
    model_name: {
        plugins: "plugins"
    },
    model: {
        plugins: { versions: [] }
    },
    model_obj: {
        plugins: {}
    }
};

const utils = new Utils(inner);

const global = {
    model: utils.getConfig("default")["model"],
    version: utils.getConfig("default")["version"],
    is_plugin: utils.getIsPlugin(this.model),
    chat: utils.getChatInit(),
    last_clipboard_content: null,
    concat: false,
    id: 0,
    status: {
        auto_opt: false
    }
}


module.exports = {
    store, global, inner, utils
};