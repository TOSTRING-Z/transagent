const path = require('path');
const { Client } = require('ssh2');
const { utils } = require('../modules/globals')
const os = require('os');
const fs = require('fs');

class DisplayFile {
  constructor() {
    if (!DisplayFile.instance) {
      DisplayFile.instance = this;
    }
    return DisplayFile.instance;
  }

  // SSH下载文件方法
  async downloadViaSSH(remotePath, localPath) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const sshConfig = utils.getSshConfig();

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          sftp.fastGet(remotePath, localPath, (err) => {
            conn.end();
            if (err) {
              return reject(err);
            }
            resolve(`文件下载成功: ${remotePath} -> ${localPath}`);
          });
        });
      }).connect(sshConfig);

      conn.on('error', (err) => {
        reject(`SSH连接错误: ${err.message}`);
      });
    });
  }

  // 图片处理方法
  async processImage(filePath) {
    try {
      return `![${path.basename(filePath)}](${filePath})`;
    } catch (err) {
      console.error('图片处理错误:', err);
      return `图片加载失败: ${err.message}`;
    }
  }

  // 表格处理方法
  async processTable(filePath) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      // 将表格转换为Markdown格式
      let markdown = '|';
      // 表头
      Object.keys(json[0]).forEach(key => {
        markdown += ` ${key} |`;
      });
      markdown += '\n|';

      // 分隔线
      Object.keys(json[0]).forEach(() => {
        markdown += ' --- |';
      });
      markdown += '\n';

      // 表格内容
      const totalRows = json.length;
      const maxRows = 10; // 最多显示10行（前5+后5）

      if (totalRows <= maxRows) {
        // 行数不多，全部显示
        json.forEach(row => {
          markdown += '|';
          Object.values(row).forEach(value => {
            markdown += ` ${value} |`;
          });
          markdown += '\n';
        });
      } else {
        // 显示前5行
        json.slice(0, 5).forEach(row => {
          markdown += '|';
          Object.values(row).forEach(value => {
            markdown += ` ${value} |`;
          });
          markdown += '\n';
        });

        // 添加省略行
        markdown += '|';
        Object.keys(json[0]).forEach(() => {
          markdown += ' ... |';
        });
        markdown += '\n';

        // 显示后5行
        json.slice(-5).forEach(row => {
          markdown += '|';
          Object.values(row).forEach(value => {
            markdown += ` ${value} |`;
          });
          markdown += '\n';
        });
      }

      return markdown;
    } catch (err) {
      console.error('表格处理错误:', err);
      return `表格加载失败: ${err.message}`;
    }
  }

  // 文本处理方法
  async processText(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let result = null;

      if (filePath.endsWith('.md')) {
        // 返回原始Markdown内容
        return content;
      } else {
        // 纯文本处理
        const lines = content.split('\n');
        const maxLines = 10; // 最多显示10行（前5+后5）

        if (lines.length <= maxLines) {
          // 行数不多，全部显示
          result = content;
        } else {
          // 显示前5行
          result = lines.slice(0, 5).join('\n');

          // 添加省略行
          result += '\n...\n...\n...\n';

          // 显示后5行
          result += lines.slice(-5).join('\n');

        }
        return `\`\`\`text\n${result}\n\`\`\`\n\n`;
      }
    } catch (err) {
      console.error('文本处理错误:', err);
      return `文本加载失败: ${err.message}`;
    }
  }

  // 主处理方法
  async display(filePath) {
    const sshConfig = utils.getSshConfig();

    // 如果SSH配置为空，使用本地文件处理
    if (!sshConfig || !sshConfig.host) {
      const ext = path.extname(filePath).toLowerCase();

      // 根据文件类型调用不同处理方法
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
        return this.processImage(filePath);
      } else if (['.csv', '.tsv', '.xls', '.xlsx'].includes(ext)) {
        return this.processTable(filePath);
      } else {
        return this.processText(filePath);
      }
    } else {
      // 否则使用远程文件处理
      const tempPath = path.join(os.tmpdir(), path.basename(filePath));
      await this.downloadViaSSH(filePath, tempPath);

      const ext = path.extname(tempPath).toLowerCase();
      let result;
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
        result = await this.processImage(tempPath);
      } else if (['.csv', '.tsv', '.xls', '.xlsx'].includes(ext)) {
        result = await this.processTable(tempPath);
      } else {
        result = await this.processText(tempPath);
      }

      // 添加下载链接
      if (!sshConfig || !sshConfig.host) {
        result += '\n\n[下载本地文件](' + filePath + ')';
      } else {
        result += '\n\n[文件已下载到本地](' + tempPath + ')';
      }
      return result;
    }
  }
}

DisplayFile.instance = null;

async function main({ filePath }) {
  const display = new DisplayFile();
  return await display.display(filePath);
}

function getPrompt() {
  const prompt = `## display_file
Description: Display various file types (images, tables, text) in Markdown format and download files via SSH
Parameters:
- filePath: (Required) Path to the file to be displayed
Supported file types:
- Images: .png, .jpg, .jpeg, .gif, .svg, .pdf
- Tables: .csv, .tsv, .xls, .xlsx
- Text: .txt, .md
SSH Usage:
{
  "thinking": "[Thinking process]",
  "tool": "display_file",
  "params": {
    "filePath": "[file-path]"
  }
}`;
  return prompt;
}

module.exports = {
  main,
  getPrompt
};