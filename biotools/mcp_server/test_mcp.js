const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/biotools"));

const client = new Client(
    {
        name: "example-client",
        version: "1.0.0"
    }
);

async function main() {
    await client.connect(transport);

    // List prompts
    const tools = await client.listTools();
    console.log(tools)

    // Call a tool
    const result = await client.callTool({
        name: "get_mean_express_data",
        arguments: {
            "data_source": "normal_tissue_GTEx",
            "genes": [
                "TP53"
            ]
        }
    });
    console.log(result)
}

main();

