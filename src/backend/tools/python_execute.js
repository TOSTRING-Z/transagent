const { spawn } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const { utils } = require('../modules/globals');

function main(params) {
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
        writeFileSync(tempFile, code)
        console.log(tempFile)

        // Create terminal window
        const terminalWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        terminalWindow.loadFile('src/frontend/terminal.html');

        // 在窗口加载完成后打开开发者工具
        terminalWindow.webContents.on('did-finish-load', () => {
            terminalWindow.webContents.openDevTools();
        });

        // 或者你也可以在窗口显示后立即打开开发者工具
        terminalWindow.on('ready-to-show', () => {
            terminalWindow.webContents.openDevTools();
        });

        return new Promise((resolve, reject) => {
            const child = spawn(params.python_bin, [tempFile]);
            ipcMain.on('terminal-input', (event, input) => {
                child.stdin.write(`${input}\r\n`);
            });

            terminalWindow.on('close', () => {
                resolve(null);
            })

            let output = null;
            let error = null;
            child.stdout.on('data', (data) => {
                output = data.toString();
                terminalWindow.webContents.send('terminal-data', output);
            });

            child.stderr.on('data', (data) => {
                error = data.toString();
                terminalWindow.webContents.send('terminal-data', error);
            });

            child.on('close', (code) => {
                unlinkSync(tempFile);
                terminalWindow.close();
                setTimeout(() => {
                    resolve(JSON.stringify({
                        success: code === 0,
                        output: output,
                        error: error
                    }));
                }, params.delay_time * 1000);
            });
        });
    }
}

function getPrompt() {
    const prompt = `## python_execute
Description: Execute Python code locally, such as file reading, data analysis, and code execution.
Parameters:
- code: (Required) Executable Python code snippet (Python code output must retain "\n" and spaces, please strictly follow the code format, incorrect indentation and line breaks will cause code execution to fail)
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "python_execute",
  "params": {
    "code": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
