const fs = require('fs');
const path = require('path');

async function main({ file_path, context }) {
    try {
        const dir = path.dirname(file_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFileSync(file_path, context);
        return `File ${file_path} saved successfully`;
    } catch (error) {
        return `File ${file_path} save failed: ${error.message}`;
    }
}

function getPrompt() {
    const prompt = `## write_to_file
Description: Save file to specified path (text files only)
Parameters:
- file_path: (Required) File path to save (must use /)
- context: (Required) Content to save
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "write_to_file",
  "params": {
    "file_path": "[value]",
    "context": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};