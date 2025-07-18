const fs = require('fs');

function main({ file_path, diff }) {
    try {
        // 新改进的函数实现
        const originalContent = fs.readFileSync(file_path, 'utf8');
        let content = originalContent;
        
        // 更健壮的块分割处理
        const blocks = diff.split(/<<<<<<< SEARCH/g);
        blocks.shift(); // 移除第一个空元素
        
        blocks.forEach(block => {
            const [search, replaceBlock] = block.split(/=======/);
            const searchContent = search.trim();
            const replaceContent = replaceBlock.split(/>>>>>>> REPLACE/)[0].trim();
            
            // 更精确的内容匹配
            if (!content.includes(searchContent)) {
                throw new Error(`Search content not found: "${searchContent.replace(/\n/g, '\\n')}"`);
            }
            
            content = content.replace(searchContent, replaceContent);
        });
        
        if (content === originalContent) {
            return `File ${file_path} not modified: The content in SEARCH block may not exactly match the actual content in the file`;
        }
        
        fs.writeFileSync(file_path, content);
        return `File ${file_path} modified successfully`;
    } catch (error) {
        return `File ${file_path} modification failed: ${error.message}`;
    }
}

// 保留原始脚本中的getPrompt函数
function getPrompt() {
    const prompt = `## replace_in_file
Description: Performs surgical text replacements in files using SEARCH/REPLACE diffs. Ideal for precise code modifications, configuration updates, or documentation changes while preserving file integrity.

Parameters:
- file_path: (Required) Absolute path to target file (forward slashes recommended)
- diff: (Required) One or more atomic replacement blocks in unified diff format:
    \`\`\`
    <<<<<<< SEARCH
    [exact original content]
    =======
    [new content]
    >>>>>>> REPLACE
    \`\`\`

Replacement Rules:
1. Matching Requirements:
    - Exact character-by-character matching (including whitespace, line endings)
    - Case-sensitive comparison
    - Must match complete lines (no partial line matches)

2. Block Specifications:
    - Each block operates on first match only
    - Multiple blocks execute sequentially
    - Maintain original file's line ending style

3. Best Practices:
    - Include minimal context (2-3 surrounding lines max)
    - Split large changes into multiple atomic blocks
    - For moves: Use delete-then-insert pattern
    - For deletions: Leave REPLACE section empty

Usage:
{
    "thinking": "[Explain change purpose and verification method]",
    "tool": "replace_in_file",
    "params": {
    "file_path": "/project/src/main.js",
    "diff": "<<<<<<< SEARCH\nconst API_URL = 'http://old.api';\n=======\nconst API_URL = 'https://new.api';\n>>>>>>> REPLACE\n<<<<<<< SEARCH\nconst API_KEY = 'key-old';\n=======\nconst API_KEY = 'key-new';\n>>>>>>> REPLACE"
    }
}`
    return prompt
}

// 保留原始导出部分
module.exports = {
    main, 
    getPrompt
};