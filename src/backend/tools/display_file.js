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
            resolve(`File download successful: ${remotePath} -> ${localPath}`);
          });
        });
      }).connect(sshConfig);

      conn.on('error', (err) => {
        reject(`SSH connection error: ${err.message}`);
      });
    });
  }

  // 图片处理方法
  async processImage(filePath) {
    try {
      return `![${path.basename(filePath)}](${filePath})`;
    } catch (err) {
      console.error('图片处理错误:', err);
      return `Image loading failed: ${err.message}`;
    }
  }
  // 表格处理方法
  async processTable(filePath,maxLines=20,maxLineLength=100) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        return "Empty table";
      }

      // 处理函数：截断过长的单元格内容
      const processCellValue = (value) => {
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        return strValue.length > maxLineLength
          ? strValue.substring(0, maxLineLength) + '...'
          : strValue;
      };

      // 将表格转换为Markdown格式
      let markdown = '|';
      // 表头
      Object.keys(json[0]).forEach(key => {
        markdown += ` ${processCellValue(key)} |`;
      });
      markdown += '\n|';

      // 分隔线
      Object.keys(json[0]).forEach(() => {
        markdown += ' --- |';
      });
      markdown += '\n';

      // 表格内容
      const totalRows = json.length;

      if (totalRows <= maxLines) {
        // 行数不多，全部显示
        json.forEach(row => {
          markdown += '|';
          Object.values(row).forEach(value => {
            markdown += ` ${processCellValue(value)} |`;
          });
          markdown += '\n';
        });
      } else {
        // 显示前10行
        json.slice(0, 10).forEach(row => {
          markdown += '|';
          Object.values(row).forEach(value => {
            markdown += ` ${processCellValue(value)} |`;
          });
          markdown += '\n';
        });

        // 添加省略行
        markdown += '|';
        Object.keys(json[0]).forEach(() => {
          markdown += ' [omitted intermediate lines because the output is too long] ... |';
        });
        markdown += '\n';

        // 显示后5行
        // json.slice(-5).forEach(row => {
        //   markdown += '|';
        //   Object.values(row).forEach(value => {
        //     markdown += ` ${processCellValue(value)} |`;
        //   });
        //   markdown += '\n';
        // });
      }

      return markdown;
    } catch (err) {
      console.error('表格处理错误:', err);
      return `Table loading failed: ${err.message}`;
    }
  }

  // 文本处理方法
  async processText(filePath,maxLines=20,maxLineLength=100) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let result = null;

      if (filePath.endsWith('.md')) {
        // 返回原始Markdown内容
        return content;
      } else {
        // 纯文本处理
        const lines = content.split('\n');

        // 处理每行长度，超过限制的截断并添加...
        const processedLines = lines.map(line => {
          if (line.length > maxLineLength) {
            return line.substring(0, maxLineLength) + '...';
          }
          return line;
        });

        if (processedLines.length <= maxLines) {
          // 行数不多，全部显示
          result = processedLines.join('\n');
        } else {
          // 显示前10行
          result = processedLines.slice(0, 10).join('\n');

          // 添加省略行
          result += '\n...\n...\n...\n';

          // 显示后5行
          // result += processedLines.slice(-5).join('\n');
        }
        return `\`\`\`text\n${result}\n\`\`\`\n\n`;
      }
    } catch (err) {
      console.error('文本处理错误:', err);
      return `Text loading failed: ${err.message}`;
    }
  }

  // 主处理方法
  async display(filePath,maxLines=20,maxLineLength=100) {
    const sshConfig = utils.getSshConfig();

    // 如果SSH配置为空，使用本地文件处理
    if (!sshConfig || !sshConfig.host) {
      const ext = path.extname(filePath).toLowerCase();

      // 根据文件类型调用不同处理方法
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
        return this.processImage(filePath);
      } else if (['.csv', '.tsv', '.xls', '.xlsx'].includes(ext)) {
        return this.processTable(filePath,maxLines,maxLineLength);
      } else {
        return this.processText(filePath,maxLines,maxLineLength);
      }
    } else {
      // 否则使用远程文件处理
      const tmpdir = utils.getConfig("tool_call")?.tmpdir || os.tmpdir();
      const tempPath = path.join(tmpdir, path.basename(filePath));
      await this.downloadViaSSH(filePath, tempPath);

      const ext = path.extname(tempPath).toLowerCase();
      let result;
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
        result = await this.processImage(tempPath);
      } else if (['.csv', '.tsv', '.xls', '.xlsx'].includes(ext)) {
        result = await this.processTable(tempPath,maxLines=10,maxLineLength=100);
      } else {
        result = await this.processText(tempPath,maxLines=10,maxLineLength=100);
      }

      // 添加下载链接
      if (!sshConfig || !sshConfig.host) {
        result += '\n\n[Local file](' + filePath + ')';
      } else {
        result += '\n\n- Remote file: ' + filePath;
        result += '\n\n- Local file: [' + tempPath + '](' + tempPath + ')';
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
Description: Display or read various file types (images, tables, text) in Markdown format and download files via SSH.
- When to use this tool  
  - When you need to view a table or text file  
  - When you need to display results to the user
- Supported file types:
  - Images: .png, .jpg, .jpeg, .gif, .svg, .pdf
  - Tables: .csv, .tsv, .xls, .xlsx
  - Text: .txt, .md

Parameters:
- filePath: (Required) Path to the file to be displayed or read
- maxLines: Maximum number of rows to read for text or tables (default: 20).
- maxLineLength: Maximum character length per line or cell for text/tables (default: 100).

Usage:
{
  "thinking": "[Record the absolute path of the file to be displayed/read in detail]",
  "tool": "display_file",
  "params": {
    "filePath": "[file-path]",
    "maxLines": [maxLines],
    "maxLineLength": [maxLineLength],
  }
}`;
  return prompt;
}

module.exports = {
  main,
  getPrompt
};