const { utils } = require('../modules/globals')
const { chatBase, getStopIds } = require('../server/llm_service');

String.prototype.format = function (data) {
    function format(template, params) {
        const keys = Object.keys(params);
        const values = Object.values(params);
        return new Function(...keys, `return \`$${template}\`;`)(...values);
    }
    
    if (!!this) {
        let format_text = this.replaceAll("{{", "@bracket_left").replaceAll("}}", "@bracket_right");
        format_text = format_text.replace(/(\{.*?\})/g, (match, cmd) => {
            try {
                return format(cmd, data);
            } catch (e) {
                console.log(e);
                return match;
            }
        });
        format_text = format_text.replaceAll("@bracket_left", "{").replaceAll("@bracket_right", "}")
        return format_text;
    } else {
        return this
    }
}

const State = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSE: 'pause',
    FINAL: 'final',
    ERROR: 'error',
};

class ReActAgent {
    constructor() {
        this.state = State.IDLE
    }

    async retry(func, data) {
        if (data.hasOwnProperty("output_format")) {
            data.input = data.output_format;
        } else {
            data.input = data.query;
        }
        if (data.hasOwnProperty("prompt_format")) {
            data.system_prompt = data.prompt_format;
        } else {
            data.system_prompt = data.prompt;
        }
        if (data.input_template) {
            data.input = data.input_template.format(data);
        }
        let retry_time = utils.getConfig("retry_time");
        let count = 0;
        while (count < retry_time) {
            if (getStopIds().includes(data.id)) {
                return null;
            }
            try {
                let output = await func(data);
                if (!!output) {
                    return output;
                }
                else {
                    count++;
                    await utils.delay(2);
                }
            } catch (_error) {
                count++;
                await utils.delay(2);
            }
        }
        return null;
    }

    async llmCall(data) {
        data.api_url = utils.getConfig("models")[data.model].api_url;
        data.api_key = utils.getConfig("models")[data.model].api_key;
        data.params = utils.getConfig("models")[data.model].versions.find(version => {
            return typeof version !== "string" && version.version === data.version;
        });
        if (data.params?.hasOwnProperty("llm_parmas"))
            data.llm_parmas = data.params.llm_parmas;
        if (data.prompt_template)
            data.prompt_format = data.prompt_template.format(data);
        else
            data.prompt_format = data.prompt
        
        data.output = await this.retry(chatBase, data);
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
    
    get_info(data) {
        const output_format = utils.copy(data.output_format);
        data.output_format = data.output_format?.replaceAll("\`","'").replaceAll("`","'");
        let info = utils.getConfig("info_template").format(data);
        data.output_format = output_format;
        console.log(info);
        return info;
    }

    // 抽象方法
    async step() {
        throw new Error("Method 'step()' must be implemented.");
    }


}

module.exports = {
    ReActAgent, State
};