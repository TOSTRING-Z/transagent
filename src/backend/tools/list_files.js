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
Description: Request to list files and directories in the specified directory. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the file was successfully created.
Parameters:
- path: (Required) The folder path to read
- recursive: (Optional) true or false, if recursive is true, it will recursively list all files and directories. If recursive is false or not provided, it will only list the top-level content.
- regex: (Optional) Regular expression pattern to filter files by name
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "list_files",
  "params": {
    "path": "[value]",
    "recursive": [value],
    "regex": "[value]"
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};