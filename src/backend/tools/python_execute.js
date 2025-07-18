const { spawn } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');

function threshold(data, threshold) {
    if (!!data && data?.length > threshold) {
        return "Returned content is too large, please try another solution!";
    } else {
        return data;
    }
}

function main(params) {
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
        writeFileSync(tempFile, code)
        console.log(tempFile)

        let terminalWindow = null;
        let child = null;
        // Create terminal window
        terminalWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false, // 隐藏默认标题栏和边框
            transparent: true, // 可选：实现透明效果
            resizable: true, // 允许调整窗口大小
            // eslint-disable-next-line no-undef
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false // 允许在渲染进程使用Electron API
            }
        });

        terminalWindow.loadFile('src/frontend/terminal.html');

        // 或者你也可以在窗口显示后立即打开开发者工具
        terminalWindow.on('ready-to-show', () => {
            // terminalWindow.webContents.openDevTools();
        });

        ipcMain.on('minimize-window', () => {
            terminalWindow?.minimize()
        })

        ipcMain.on('close-window', () => {
            child?.kill();
            terminalWindow?.close()
        })

        return new Promise((resolve) => {
            child = spawn(params.python_bin, [tempFile]);
            terminalWindow.webContents.send('terminal-data', `${code}\n`);
            
            ipcMain.on('terminal-input', (event, input) => {
                if (!input) {
                    child.stdin.end();
                } else {
                    child.stdin.write(`${input}`);
                }
            });
            ipcMain.on('terminal-signal', (event, input) => {
                switch (input) {
                    case "ctrl_c":
                        child.kill();
                        break;
                
                    default:
                        break;
                }
            });

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
                setTimeout(() => {
                    if (terminalWindow)
                        terminalWindow.close();
                    resolve(JSON.stringify({
                        success: code === 0,
                        output: threshold(output, params.threshold),
                        error: error
                    }));
                }, params.delay_time * 1000);
            });

            terminalWindow.on('close', () => {
                terminalWindow = null;
            })
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
  "thinking": "[Detailed thought process, including specifics of the executing code. If the current execution involves file content, please record the absolute file path here in detail.]",
  "tool": "python_execute",
  "params": {
    "code": "[Python code snippet to execute]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
