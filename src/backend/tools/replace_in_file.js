const fs = require('fs');

function main({ file_path, diff }) {
    try {
        const originalContent = fs.readFileSync(file_path, 'utf8');
        let content = originalContent;
        const blocks = diff.split('<<<<<<< SEARCH');
        blocks.shift(); // Remove the first element as it is empty
        blocks.forEach(block => {
            const [search, replace] = block.split('=======');
            const searchContent = search.trim();
            const replaceContent = replace.split('>>>>>>> REPLACE')[0].trim();
            content = content.replace(searchContent, replaceContent);
        });
        if (content === originalContent) {
            return `File ${file_path} not modified: The content in SEARCH block, "\r", "\n", spaces or special characters may not exactly match the actual content in the file`;
        }
        fs.writeFileSync(file_path, content);
        return `File ${file_path} modified successfully`;
    } catch (error) {
        return `File ${file_path} modification failed: ${error.message}`;
    }
}

function getPrompt() {
    const prompt = `## replace_in_file
Description: This tool is used to replace parts of content in existing files using SEARCH/REPLACE blocks. It should be used when precise modifications to specific parts of a file are needed.
Parameters:
- file_path: (Required) The file path to be modified
- diff: (Required) One or more SEARCH/REPLACE blocks, formatted as follows:
    <<<<<<< SEARCH
    [exact content to search for]
    =======
    [new content after replacement]
    >>>>>>> REPLACE
    Key Rules:
        1. SEARCH content must exactly match the target part in the file:
            * Compare character by character when matching, including spaces, indentation and line endings
            * Include all comments, docstrings, etc.
        2. SEARCH/REPLACE blocks only replace the first match:
            * If multiple modifications are needed, include multiple independent SEARCH/REPLACE blocks
            * Each SEARCH section only needs to contain enough lines to ensure uniqueness
            * The order of SEARCH/REPLACE blocks should match their appearance in the file
        3. Keep SEARCH/REPLACE blocks concise:
            * Split larger blocks into multiple smaller ones, each modifying only a small part of the file
            * Only include lines that need to be changed and necessary context lines for uniqueness
            * Don't include large amounts of unchanged lines in SEARCH/REPLACE blocks
            * Each line must be complete, not truncated midway, otherwise matching may fail
        4. Special operations:
            * Move code: Use two SEARCH/REPLACE blocks (one to delete from original location, another to insert at new location)
            * Delete code: Use empty REPLACE section
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "replace_in_file",
  "params": {
    "file_path": "[value]",
    "diff": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};