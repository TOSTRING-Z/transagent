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
  return async ({ path, recursive = false }) => {
    try {
      const items = fs.readdirSync(path);
      const result = [];

      items.forEach(item => {
        const fullPath = path_.join(path, item);
        if (shouldExclude(fullPath)) return;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          result.push(...main({ input: fullPath, recursive }));
        } else {
          result.push(fullPath);
        }
      });
      if (result.length > params.threshold) {
        return 'Too much content returned, please try another solution!';
      }
      return result;
    } catch (error) {
      console.error(`Error listing files in ${path}:`, error);
      return error.message;
    }
  }
}

if (require.main === module) {
  const input = process.argv[2];
  const recursive = process.argv.includes('--recursive');
  console.log(main({ input, recursive }).join('\n'));
}

function getPrompt() {
  const prompt = `## list_files
Description: Request to list files and directories in the specified directory. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the file was successfully created.
Parameters:
- path: (Required) The folder path to read
- recursive: (Optional) true or false, if recursive is true, it will recursively list all files and directories. If recursive is false or not provided, it will only list the top-level content.
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "list_files",
  "params": {
    "path": "[value]",
    "recursive": [value]
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};