const fs = require('fs');
const path_ = require('path');

const EXCLUDE_PATTERNS = [
  // IDE config
  /\/\.vscode\//i,
  /\/\.idea\//i,
  // Cache
  /\/\.cache\//i,
  /\/\.npm\//i,
  // Media
  /\.(gif|mp4|mov|avi)$/i,
  // Binaries
  /\.(exe|dll|so|a)$/i,
  // Documents
  /\.(pptx?)$/i,
];


function shouldExclude(path) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(path.replaceAll("\\", "/")));
}


function main(params) {
  return ({ path, recursive = false, regex = null }) => {
    const regexObj = regex ? new RegExp(regex) : null;
    try {
      const items = fs.readdirSync(path);
      const result = [];

      items.forEach(item => {
        const fullPath = path_.join(path, item);
        if (shouldExclude(fullPath)) return;
        if (regexObj && !regexObj.test(item)) return;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          const subResult = main(params)({ path: fullPath, recursive, regex });
          if (Array.isArray(subResult)) {
            result.push(...subResult);
          }
        } else {
          result.push(fullPath);
        }
      });
      if (result.length > params.threshold) {
        return ['Too much content returned, please try another solution!'];
      }
      return result;
    } catch (error) {
      console.error(`Error listing files in ${path}:`, error);
      return error.message;
    }
  }
}

function getPrompt() {
  const prompt = `## list_files
Description: Recursively scans directory structures with advanced filtering capabilities. Supports exclusion of common development artifacts and binary files.

Key Features:
- Recursive directory traversal (when enabled)
- Regex pattern matching for filenames
- Built-in exclusion of:
  - IDE config files (.vscode/, .idea/)
  - Cache directories (.cache/, .npm/)
  - Media files (.gif, .mp4, etc)
  - Binary files (.exe, .dll, etc)
  - Documents (.pptx, etc)

Parameters:
- path: (Required) Absolute filesystem path to target directory
- recursive: (Optional) Enable recursive subdirectory scanning (default=false)
- regex: (Optional) Filter files by name using regular expression

Best Practices:
1. For large directories, first run without recursion
2. Use specific regex patterns to narrow results
3. Combine with search_files for content-based searches
4. Results limited to 1000 items by default

Output Format:
Returns array of absolute file paths or error message string

Usage Example:
{
  "thinking": "Need to find all JavaScript files in src directory",
  "tool": "list_files",
  "params": {
    "path": "/project/src",
    "recursive": true,
    "regex": "\\.js$"
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};