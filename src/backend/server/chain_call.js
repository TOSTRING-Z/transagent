const { inner, utils } = require('../modules/globals')
const { ReActAgent, State } = require("./agent.js")

class ChainCall extends ReActAgent {
    constructor() {
        super();
        this.is_plugin = false;
    }

    async pluginCall(data) {
        data.prompt_format = "";
        let func = inner.model_obj[data.model][data.version]?.func
        data.output = await this.retry(func, data);
        if (!data.output) {
            return null;
        }
        data.outputs.push(utils.copy(data.output));
        if (data.output_template) {
            data.output_format = data.output_template.format(data);
        } else {
            data.output_format = data.output;
        }
        data.output_formats.push(utils.copy(data.output_format));
        return data.output_format;
    }

    async step(data) {
        this.is_plugin = utils.getIsPlugin(data.model);
        let state = null;
        if (utils.getIsPlugin(data.model)) {
            state = await this.pluginCall(data);
        }
        else {
            state = await this.llmCall(data);
        }
        if (!state) {
            this.state = State.ERROR;
        }
        if (data.end) {
            this.state = State.FINAL;
        }
    }
}

module.exports = {
    ChainCall
};