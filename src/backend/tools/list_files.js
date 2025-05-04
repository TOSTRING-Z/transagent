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


function main(params = { threshold: 1000 }) {
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
Description: Retrieves directory contents with flexible filtering options.

Parameters:
- path: (Required) Absolute path of target directory
- recursive: (Optional, default=false) When true, includes all subdirectory contents
- regex: (Optional) Filters results by filename pattern (case-sensitive)

Usage:
{
  "thinking": "[Brief justification for using this tool]",
  "tool": "list_files",
  "params": {
    "path": "[valid_directory_path]",
    "recursive": [true|false],
    "regex": "[pattern]"
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};