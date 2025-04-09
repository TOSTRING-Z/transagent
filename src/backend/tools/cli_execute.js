const { exec } = require('child_process');
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
        let terminalWindow = null;
        // Create terminal window
        terminalWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false, // 隐藏默认标题栏和边框
            transparent: true, // 可选：实现透明效果
            resizable: true, // 允许调整窗口大小
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false // 允许在渲染进程使用Electron API
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

        ipcMain.on('minimize-window', () => {
            BrowserWindow.getFocusedWindow().minimize()
        })

        ipcMain.on('close-window', () => {
            BrowserWindow.getFocusedWindow().close()
        })

        return new Promise((resolve, reject) => {
            const child = exec(`${params.bash} ${code}`);
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
                setTimeout(() => {
                    if (!!terminalWindow)
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
    const prompt = `## cli_execute
Description: Execute bash code locally, such as file reading, data analysis, and code execution.
Parameters:
- code: (Required) Executable bash code snippet (please strictly follow the code format, incorrect indentation and line breaks will cause code execution to fail)
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "cli_execute",
  "params": {
    "code": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
