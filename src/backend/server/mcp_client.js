const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const { utils } = require('../modules/globals.js')

class MCPClient {
    constructor() {
        this.client = new Client(
            {
                name: "mcp-client",
                version: "1.0.0"
            },
            {
                capabilities: {
                    prompts: {},
                    resources: {},
                    tools: {}
                }
            }
        );
        this.transports = {};
        this.mcp_prompt = "";
    }

    async connectMCP() {
        let prompts = [];
        for (const name in this.transports) {
            if (Object.hasOwnProperty.call(this.transports, name)) {
                const transport = this.transports[name];
                const prompt = await this.getPrompt({ name, transport });
                if (prompt)
                    prompts.push(prompt);
            }
        }
        this.mcp_prompt = prompts.join("\n\n---\n\n");
    }

    async initMcp() {
        try {
            const configs = utils.getConfig("mcp_server");
            for (const name in configs) {
                if (Object.hasOwnProperty.call(configs, name)) {
                    const config = configs[name];
                    await this.setTransport({ name, config });
                }
            }
            await this.connectMCP();
        } catch (error) {
            console.log(error)
        }
    }

    async callTool(params) {
        const result = await this.client.callTool(params, undefined, {
            timeout: (utils.getConfig("tool_call")?.mcp_timeout || 600) * 1000
        });
        return result;
    }

    async getPrompt({ name, transport }) {
        try {
            console.log('Connecting to transport...');
            await this.client.connect(transport);
            console.log('Successfully connected to transport');

            const caps = this.client.getServerCapabilities();
            let description = "";
            if (Object.prototype.hasOwnProperty.call(caps, "prompts")) {
                const prompts = await this.client.listPrompts();
                if (prompts.prompts.length) {
                    description = prompts.prompts[0].description;
                    description = `\n\n${description}`;
                }
            }

            let tools;
            if (Object.prototype.hasOwnProperty.call(caps, "tools")) {
                console.log('Listing tools...');
                tools = await this.client.listTools();
                console.log('Tools:', tools);
            }
            if (!tools) {
                return null;
            }
            const mcp_prompt = tools.tools.filter(tool => tool.name !== "execute_bash").map(tool => {
                const mcp_name = tool.name;
                const mcp_description = tool.description;
                const properties = tool.inputSchema?.properties;
                const required = tool.inputSchema?.required;
                const arg_keys = Object.keys(properties);
                const mcp_args = arg_keys.map(key => {
                    const values = properties[key];
                    const req = required?.includes(key);
                    return `- ${key}: ${req ? "(required) " : ""}${values?.description || values?.title} (type: ${values.type})`;
                }).join("\n");

                const mcp_prompt = `MCP name: ${mcp_name}\nMCP args:\n${mcp_args}\nMCP description:\n${mcp_description}`;
                return mcp_prompt;
            }).join("\n\n")
            return `## MCP server: ${name}${description}\n\n## Use\n\n${mcp_prompt}`;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async setTransport({ name, config }) {
        let disabled = false;
        if (Object.prototype.hasOwnProperty.call(config, "disabled")) {
            disabled = config.disabled;
            delete config.disabled;
        }
        if (!Object.prototype.hasOwnProperty.call(this.transports, name) && !disabled) {
            let transport;

            if (Object.prototype.hasOwnProperty.call(config, "url")) {
                if (Object.prototype.hasOwnProperty.call(config, "sse") && config.sse) {
                    transport = new SSEClientTransport(
                        new URL(config.url)
                    );
                } else {
                    transport = new StreamableHTTPClientTransport(
                        new URL(config.url)
                    );
                }
            }
            else {
                transport = new StdioClientTransport(config);
            }
            this.transports[name] = transport;
        }
    }
}

module.exports = {
    MCPClient
}