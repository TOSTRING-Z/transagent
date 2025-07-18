const fs = require('fs');
const path_ = require('path');
const glob = require('glob');

async function main({ path, regex="test", file_pattern="*.js" }) {
  try {
    // Find all files matching the pattern using glob
    const files = await new Promise((resolve, reject) => {
      glob(file_pattern, { cwd: path, nodir: true, absolute: true }, (err, matches) => {
        if (err) {
          reject(new Error(`Glob error: ${err.message}`));
        } else {
          resolve(matches);
        }
      });
    });
    if (!Array.isArray(files)) {
      throw new Error('No files found matching the pattern');
    }
    // Initialize results array and compile regex
    const results = [];
    const regexObj = new RegExp(regex, 'g');

    for (const file of files) {
      // Read file content and search for regex matches
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regexObj.exec(content)) !== null) {
        const start = Math.max(0, match.index - 10);
        const end = Math.min(content.length, match.index + match[0].length + 10);
        const context = content.substring(start, end);
        results.push({
          file: path_.relative(path, file),
          match: match[0],
          context: context,
          line: (content.substring(0, match.index).match(/\n/g) || []).length + 1
        });
      }
    }

    // Return array of match results
    return results.slice(0,100);
  } catch (error) {
    console.log(error);
    return error.message;
  }
}

function getPrompt() {
  const prompt = `## search_files
Description: Advanced recursive content search tool with regex pattern matching and file type filtering. Returns matches with surrounding context (100 results max).

Key Features:
- Recursive directory scanning (always enabled)
- Supports full Node.js RegExp syntax with flags
- Flexible file selection using glob patterns
- Returns contextual matches with line numbers
- Built-in result limiting for performance

Parameters:
- path: (Required) Absolute root directory path to search
- regex: (Required) Regular expression pattern to match
- file_pattern: (Required) Glob pattern for file selection (e.g., "*.{js,ts}", "**/*.env")

Best Practices:
1. Use specific file patterns to narrow search scope
2. Include regex flags like /i for case-insensitive search
3. For large codebases, start with restrictive file patterns
4. Combine with list_files to first identify candidate files

Output Format:
Array of objects containing:
- file: relative path
- match: matched text
- context: surrounding content
- line: line number

Usage Examples:
1. Find all API version patterns:
{
  "thinking": "Need to locate all API version references in TypeScript files",
  "tool": "search_files",
  "params": {
    "path": "/project/src",
    "regex": "/api/v\\d+",
    "file_pattern": "**/*.{ts,tsx}"
  }
}

2. Search for environment variables:
{
  "thinking": "Need to find all environment variable declarations",
  "tool": "search_files",
  "params": {
    "path": "/config",
    "regex": "process\\.env\\.\\w+",
    "file_pattern": "*.{js,env}"
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};