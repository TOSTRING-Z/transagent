const path = require("path");
const fs = require('fs');
const { utils, inner } = require("./globals");


class Plugins {
    constructor() {
        if (!Plugins.instance) {
            Plugins.instance = this;
        }
        return Plugins.instance;
    }
    // 配置插件接口
    loadPlugin(params) {
        const pluginPath = utils.getConfig("plugins")[params.version]?.path?.format(process);
        const pluginParams = utils.getConfig("plugins")[params.version]?.params;
        try {
            console.log(`loading plugin: ${params.version}`);
            let plugin;
            if(!!pluginPath && fs.existsSync(pluginPath)) {
                plugin = require(pluginPath);
            }
            else {
                plugin = require(path.join(__dirname, `../tools/${params.version}.js`));
            }
            let item;
            if (pluginParams) {
                item = { func: plugin.main(pluginParams), extra: params?.extra, getPrompt: plugin?.getPrompt };
            }
            else {
                item = { func: plugin.main, extra: params?.extra, getPrompt: plugin?.getPrompt };
            }
            return item;
        } catch (error) {
            console.log(error.message);
            return {
                func: () => `插件: ${params.version}, 路径: ${pluginPath}, 加载插件发生错误: ${error.message}`
            }
        }
    }
    init() {
        // 加载插件
        const plugins = utils.getConfig("plugins");
        Object.keys(plugins).forEach((version) => {
            const params = { version, ...plugins[version] }
            let enabled = true;
            if (params.hasOwnProperty("enabled")) {
                enabled = params.enabled;
            }
            if (enabled) {
                inner.model[inner.model_name.plugins].versions.push(params);
                inner.model_obj[inner.model_name.plugins][version] = this.loadPlugin(params)
            }
        })
    }
}

module.exports = {
    Plugins
}