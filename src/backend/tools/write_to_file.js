const fs = require('fs');
const path = require('path');

async function main({ file_path, content }) {
    try {
        const dir = path.dirname(file_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFileSync(file_path, content);
        return `File ${file_path} saved successfully`;
    } catch (error) {
        return `File ${file_path} save failed: ${error.message}`;
    }
}

function getPrompt() {
    const prompt = `## write_to_file
Description: Safely writes text content to specified filesystem location (supports UTF-8 text files only). Automatically handles path normalization and directory creation when needed.

Parameters:
- file_path: (Required) Absolute file path using forward slashes (/)
- content: (Required) String data to write (supports multiline text)

Usage:
{
    "thinking": "[Explain purpose of this write operation and content significance]",
    "tool": "write_to_file",
    "params": {
    "file_path": "/absolute/path/to/target.txt",
    "content": "This will be\nwritten exactly\nas formatted"
    }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};