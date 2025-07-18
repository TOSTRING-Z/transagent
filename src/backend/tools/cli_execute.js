const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow, ipcMain } = require('electron');
const { Client } = require('ssh2');
const { utils } = require('../modules/globals');

function threshold(data, max_lines = 10, max_chars_per_line = 200) {
    if (!data) return data;
    // 分割成行（使用 let 而不是 const）
    let lines = data.split('\n');
    
    let result = '';
    
    // 如果行数超过限制，只保留最后 max_lines 行
    if (lines.length > max_lines) {
        result += `[truncated because the output is too long, showing only last ${max_lines} lines (max ${max_chars_per_line} chars per line)]\n`;
        lines = lines.slice(-max_lines);
    }
    
    // 处理每行，限制字符数
    lines.forEach(line => {
        if (line.length > max_chars_per_line) {
            result += line.substring(0, max_chars_per_line) + '...\n';
        } else {
            result += line + '\n';
        }
    });
    
    return result.trim(); // 移除末尾多余的换行符
}

let cli_prompt = null;

function main(params) {
    if (!!params.cli_prompt && fs.existsSync(params.cli_prompt)) {
        cli_prompt = fs.readFileSync(params.cli_prompt, 'utf-8');
    } else {
        cli_prompt = fs.readFileSync(utils.getDefault("cli_prompt.md"), 'utf-8');
    }
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.sh`)
        if (params?.bashrc) {
            code = `source ${params.bashrc};\n${code}`;
        }
        fs.writeFileSync(tempFile, code)
        console.log(tempFile)

        // Create terminal window
        let terminalWindow = null;
        terminalWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false, // 隐藏默认标题栏和边框
            transparent: true, // 可选：实现透明效果
            resizable: true, // 允许调整窗口大小
            // eslint-disable-next-line no-undef
            icon: path.join(__dirname, 'icon/icon.ico'),
            webPreferences: {
                // devTools: true, // 保持 DevTools 开启
                nodeIntegration: true,
                contextIsolation: false // 允许在渲染进程使用Electron API
            }
        });

        terminalWindow.loadFile('src/frontend/terminal.html');

        ipcMain.on('minimize-window', () => {
            terminalWindow?.minimize()
        })
        
        terminalWindow.on('closed', () => {
            terminalWindow = null;
        })

        return new Promise((resolve, reject) => {
            let output = "";
            let error = "";
            const sshConfig = utils.getSshConfig();
            if (sshConfig?.enabled) {
                const conn = new Client();

                ipcMain.on('close-window', () => {
                    terminalWindow?.close()
                    resolve({
                        success: false,
                        output: threshold(output, params.threshold),
                        error: threshold(error, params.threshold)
                    });
                })

                conn.on('ready', async () => {
                    console.log('SSH Connection Ready');
                    // 将代码写入临时文件
                    const remoteScriptPath = `/tmp/bash_script_${Date.now()}.sh`;
                    conn.sftp((err, sftp) => {
                        if (err) return reject(err);

                        // 1. 上传 Bash 脚本
                        const writeStream = sftp.createWriteStream(remoteScriptPath);
                        writeStream.write(`#!/bin/bash\n${code}`);
                        writeStream.end();

                        writeStream.on('close', () => {
                            // 2. 赋予执行权限并运行
                            conn.exec(`chmod +x ${remoteScriptPath} && ${remoteScriptPath};\nrm ${remoteScriptPath}`, (err, stream) => {
                                terminalWindow?.webContents.send('terminal-data', `${code}\n`);
                                if (err) {
                                    error = err.message;
                                    resolve({
                                        success: false,
                                        output: threshold(output, params.threshold),
                                        error: threshold(error, params.threshold)
                                    });
                                }

                                stream.on('close', (code, signal) => {
                                    console.log(`命令执行完毕: 退出码 ${code}, 信号 ${signal}`);
                                    conn.end(); // 关闭连接
                                    fs.unlinkSync(tempFile);
                                    setTimeout(() => {
                                        if (terminalWindow)
                                            terminalWindow?.close();
                                        resolve({
                                            success: code === 0,
                                            output: threshold(output, params.threshold),
                                            error: threshold(error, params.threshold)
                                        });
                                    }, params.delay_time * 1000);
                                })

                                stream.on('data', (data) => {
                                    output += data.toString();
                                    terminalWindow?.webContents.send('terminal-data', data.toString());
                                })

                                stream.stderr.on('data', (data) => {
                                    error += data.toString();
                                    terminalWindow?.webContents.send('terminal-data', data.toString());
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
                                            conn.end();
                                            stream.close();
                                            break;

                                        default:
                                            break;
                                    }
                                });
                            });
                        });

                    });
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
                    output += data.toString();
                    terminalWindow?.webContents.send('terminal-data', data.toString());
                });

                child.stderr.on('data', (data) => {
                    error += data.toString();
                    terminalWindow?.webContents.send('terminal-data', data.toString());
                });

                child.on('close', (code) => {
                    fs.unlinkSync(tempFile);
                    setTimeout(() => {
                        if (terminalWindow)
                            terminalWindow?.close();
                        resolve({
                            success: code === 0,
                            output: threshold(output, params.threshold),
                            error: threshold(error, params.threshold)
                        });
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
  "thinking": "[Detailed thought process, including specifics of the executing code. If the current execution involves file content, please record the absolute file path here in detail.]",
  "tool": "cli_execute",
  "params": {
    "code": "[Code snippet to execute]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
