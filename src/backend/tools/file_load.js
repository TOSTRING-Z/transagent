const fs = require('fs');
const officeParser = require('officeparser');

/**
 * Get file extension
 * @param {string} filename - File name
 * @returns {string|null} File extension
 */
function getFileExtension(filename) {
    const parts = filename.split('.');
    if (parts.length > 1 && filename.indexOf('.') !== 0) {
        return parts.length > 1 ? parts.pop().toLowerCase() : null;
    } else {
        return null;
    }
}
function readLines(data, startLine, endLine, params) {
    const lines = data.split('\r\n');
    if (!startLine || !endLine) {
        data = data;
    } else {
        data = lines.slice(startLine - 1, endLine).join('\r\n');
    } 
    if (data.length > params.threshold) {
        return "Returned content is too large, please try another solution!";
    } else {
        return data;
    }
}

function main(params) {
    return async ({ file_path, startLine=null, endLine=null }) => {
        let dataBuffer = fs.readFileSync(file_path);
        switch (getFileExtension(file_path)) {
            case "docx": case "doc": case "pdf": case "odt": case "odp": case "ods": case "pptx": case "xlsx":
                return new Promise((resolve, reject) => {
                    officeParser.parseOfficeAsync(dataBuffer).then(function (data) {
                         resolve(readLines(data, startLine, endLine, params));
                    }).catch(function (error) {
                        console.log(error);
                        resolve(error.message);
                    });
                })
            default:
                const data = dataBuffer.toString();
                if (startLine && endLine) {
                    return readLines(data, startLine, endLine, params);
                }
                return data;
        }
    }
}

if (require.main === module) {
    const file_path = process.argv[2];
    main({ threshold: 10000 })({ file_path }).then(result => {
        console.log(result);
    });
}

function getPrompt() {
    const prompt = `## file_load
Description: Read files (only supports docx,doc,pdf,odt,odp,ods and pptx)
Parameters:
- file_path: (Required) File path to read
- startLine: (Optional) Starting line number to read
- endLine: (Optional) Ending line number to read
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "file_load",
  "params": {
    "file_path": "[value]",
    "startLine": [value],
    "endLine": [value]
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};