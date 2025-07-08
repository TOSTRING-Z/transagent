const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const { utils } = require('../modules/globals.js')

class MCPClient {
    constructor() {
        this.clients = {};
        this.tools = {};
        this.mcp_prompt = "";
    }

    async callTool(params) {
        const clientName = this.tools[params.name];
        const result = await this.clients[clientName].callTool(params, undefined, {
            timeout: (utils.getConfig("tool_call")?.mcp_timeout || 600) * 1000
        });
        return result;
    }

    async initMcp() {
        try {
            const configs = utils.getConfig("mcp_server");
            for (const name in configs) {
                if (Object.hasOwnProperty.call(configs, name)) {
                    const config = configs[name];
                    await this.connectTransport({ name, config });
                }
            }
            await this.initPrompts();
        } catch (error) {
            console.log(error)
        }
    }

    async initPrompts() {
        let prompts = [];
        for (const name in this.clients) {
            const client = this.clients[name];
            const prompt = await this.getPrompt({ name, client });
            if (prompt)
                prompts.push(prompt);
        }
        this.mcp_prompt = prompts.join("\n\n---\n\n");
    }

    async connectTransport({ name, config }) {
        let disabled = false;
        if (Object.prototype.hasOwnProperty.call(config, "disabled")) {
            disabled = config.disabled;
            delete config.disabled;
        }
        if (!Object.prototype.hasOwnProperty.call(this.clients, name) && !disabled) {
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
            this.clients[name] = new Client(
                {
                    name: name,
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
            try {
                await this.clients[name].connect(transport);
            } catch (error) {
                console.log(error)
            }
        }
    }

    async getPrompt({ name, client }) {
        try {
            const caps = client.getServerCapabilities();
            let description = "";
            if (Object.prototype.hasOwnProperty.call(caps, "prompts")) {
                const prompts = await client.listPrompts();
                if (prompts.prompts.length) {
                    description = prompts.prompts[0].description;
                    description = `\n\n${description}`;
                }
            }

            let tools;
            if (Object.prototype.hasOwnProperty.call(caps, "tools")) {
                tools = await client.listTools();
            }
            if (!tools) return null;
            const mcp_prompt = tools.tools.filter(tool => tool.name !== "execute_bash").map(tool => {
                this.tools[tool.name] = name;
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
}

module.exports = {
    MCPClient
}