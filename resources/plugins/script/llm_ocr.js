
const fs = require('fs')
const path = require('path')

function main(params) {
    return async ({ input: img_path, prompt = null }) => {

        return new Promise(async (resolve, reject) => {
            try {
                // Read file content
                const imageBuffer = await fs.promises.readFile(img_path)

                // Get file extension
                const ext = path.extname(img_path).slice(1)

                // Construct Base64 string
                let url = `data:image/${ext};base64,${imageBuffer.toString('base64')}`

                let content = [
                    {
                        "type": "text",
                        "text": !!prompt?prompt:"Extract all text from the image"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": url
                        }
                    }
                ];

                let messages = [
                    { "role": "user", "content": content }
                ];

                let body = {
                    model: params.version,
                    messages: messages,
                    stream: false
                }

                let response = await fetch(new URL(params.api_url), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${params.api_key}`,
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    resolve(`Vision model API request failed: ${response.statusText}`);
                }

                let data = await response.json();
                resolve(data?.choices[0].message.content);
            } catch (error) {
                resolve(error.message);
            }
        })
    }
}

function getPrompt() {
    const prompt = `## llm_ocr
Description: Call this tool when you need to read image content. This tool uses a visual large model to recognize image content, so you need to provide specific prompts to help the model understand your intent.
Parameters:
img_path: (Required) Image path (for local paths, online URLs or base64 inputs, you should first call python_execute to save the image locally)
prompt: (Required) Prompt text
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "llm_ocr",
  "params": {
    "img_path": "[value]",
    "prompt": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};