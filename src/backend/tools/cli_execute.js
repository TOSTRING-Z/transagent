const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');
const fs = require('fs');
const { BrowserWindow, ipcMain } = require('electron');
const { Client } = require('ssh2');
const { utils } = require('../modules/globals');

function threshold(data, threshold) {
    if (!!data && data?.length > threshold) {
        return "Returned content is too large, please try another solution!";
    } else {
        return data;
    }
}

let cli_prompt = "Execute bash code locally, such as file reading, data analysis, and code execution.";

function main(params) {
    if (!!params.cli_prompt && fs.existsSync(params.cli_prompt)) {
        cli_prompt = fs.readFileSync(params.cli_prompt, 'utf-8');
    }
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.sh`)
        if (!!params?.bashrc) {
            code = `source ${params.bashrc};\n${code}`;
        }
        writeFileSync(tempFile, code)
        console.log(tempFile)

        // Create terminal window
        let terminalWindow = null;
        terminalWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            frame: false, // 隐藏默认标题栏和边框
            transparent: true, // 可选：实现透明效果
            resizable: true, // 允许调整窗口大小
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                devTools: true, // 保持 DevTools 开启
                nodeIntegration: true,
                contextIsolation: false // 允许在渲染进程使用Electron API
            }
        });

        // 监听 DevTools 打开事件，移除 Autofill 相关功能
        terminalWindow.webContents.on('devtools-opened', () => {
            terminalWindow.webContents.executeJavaScript(`
                if (window.DevToolsAPI) {
                    window.DevToolsAPI.setExperimentsDisabledForTest('autofill');
                }
            `);
        });

        terminalWindow.loadFile('src/frontend/terminal.html');

        // 在窗口加载完成后打开开发者工具
        terminalWindow.webContents.on('did-finish-load', () => {
            terminalWindow.webContents.openDevTools();
        });

        ipcMain.on('minimize-window', () => {
            terminalWindow?.minimize()
        })

        ipcMain.on('close-window', () => {
            terminalWindow?.close()
        })

        return new Promise((resolve, reject) => {
            let output = null;
            let error = null;
            const sshConfig = utils.getSshConfig();
            if (!!sshConfig) {
                const conn = new Client();

                conn.on('ready', () => {
                    console.log('SSH Connection Ready');
                    conn.exec(code, (err, stream) => {
                        if (err) {
                            error = err.message;
                            resolve(JSON.stringify({
                                success: false,
                                output: threshold(output, params.threshold),
                                error: error
                            }));
                        }

                        stream.on('close', (code, signal) => {
                            console.log(`命令执行完毕: 退出码 ${code}, 信号 ${signal}`);
                            conn.end(); // 关闭连接
                            unlinkSync(tempFile);
                            setTimeout(() => {
                                if (!!terminalWindow)
                                    terminalWindow.close();
                                resolve(JSON.stringify({
                                    success: code === 0,
                                    output: threshold(output, params.threshold),
                                    error: error
                                }));
                            }, params.delay_time * 1000);
                        })

                        stream.stdout.on('data', (data) => {
                            output = data.toString();
                            terminalWindow.webContents.send('terminal-data', output);
                        })

                        stream.stderr.on('data', (data) => {
                            error = data.toString();
                            terminalWindow.webContents.send('terminal-data', error);
                        });

                        ipcMain.on('terminal-input', (event, input) => {
                            if (!input) {
                                stream.end()
                            } else {
                                stream.write(input)
                            }
                        });

                        ipcMain.on('terminal-signal', (event, input) => {
                            switch (input) {
                                case "ctrl_c":
                                    stream.close();
                                    break;

                                default:
                                    break;
                            }
                        });
                    })
                })
                    .on('error', (err) => {
                        console.error('Connection Error:', err);
                        return err.message;
                    })
                    .on('close', () => {
                        console.log('Connection Closed');
                    })
                    .connect(sshConfig);

            } else {
                const child = exec(`${params.bash} ${tempFile}`);
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
                        if (!!terminalWindow)
                            terminalWindow.close();
                        resolve(JSON.stringify({
                            success: code === 0,
                            output: threshold(output, params.threshold),
                            error: error
                        }));
                    }, params.delay_time * 1000);
                });

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
            }

            terminalWindow.on('close', () => {
                terminalWindow = null;
            })
        });
    }
}

function getPrompt() {
    const prompt = `## cli_execute
Description: ${cli_prompt}
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
