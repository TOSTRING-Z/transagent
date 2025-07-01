const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");

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
                prompts.push(prompt);
            }
        }
        this.mcp_prompt = prompts.join("\n\n---\n\n");
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
                return "MCP server不可用!"
            }
            const mcp_prompt = tools.tools.map(tool => {
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
            return "MCP server不可用!"
        }
    }

    async setTransport({ name, config }) {
        let enabled = true;
        if (Object.prototype.hasOwnProperty.call(config, "enabled")) {
            enabled = config.enabled;
            delete config.enabled;
        }
        if (!Object.prototype.hasOwnProperty.call(this.transports, name) && enabled) {
            if (Object.prototype.hasOwnProperty.call(config, "url")) {
                const transport = new SSEClientTransport(new URL(config.url));
                this.transports[name] = transport;
            }
            else {
                const transport = new StdioClientTransport(config);
                this.transports[name] = transport;
            }
        }
    }
}

module.exports = {
    MCPClient
}