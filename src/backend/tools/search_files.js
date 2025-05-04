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
Description: Performs recursive regex pattern matching within files of specified types, returning matches with surrounding context (10 results max per response). Ideal for code analysis, log inspection, or content discovery.

Parameters:
- path: (Required) Absolute directory path to search (recursive traversal always enabled)
- regex: (Required) Search pattern following Node.js RegExp syntax (flags supported)
- file_pattern: (Required) Glob pattern for file selection (e.g., "*.{js,ts}", "**/.env*")

Usage:
{
  "thinking": "[Explain why this search is needed and expected outcome]",
  "tool": "search_files", 
  "params": {
    "path": "/absolute/target/path",
    "regex": "/api/v1/\\d+",  // Example: API version pattern
    "file_pattern": "**/*.{ts,tsx}"  // Example: TypeScript files only
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};