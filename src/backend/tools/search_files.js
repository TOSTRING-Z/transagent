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
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
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
Description: Request to perform a regular expression search in the specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match and its surrounding context.
Parameters:
path: (Required) The directory path to search. This directory will be searched recursively. 
regex: (Required) The regular expression pattern to search for. Uses NodeJs regular expression syntax. 
file_pattern: (Required) The Glob pattern to filter files (e.g., '*.ts' for TypeScript files).
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "search_files",
  "params": {
    "path": "[value]",
    "regex": "[value]",
    "file_pattern": "[value]"
  }
}`
  return prompt
}

module.exports = {
  main, getPrompt
};