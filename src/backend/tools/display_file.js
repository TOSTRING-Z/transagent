const fs = require('fs');
const path = require('path');
const marked = require('marked');

class DisplayFile {
  constructor() {
    // 初始化方法
  }

  // 图片处理方法
  async processImage(filePath) {
    try {
      const data = await fs.promises.readFile(filePath);
      const base64 = data.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.svg' ? 'image/svg+xml' : 
                      ext === '.pdf' ? 'application/pdf' : 
                      `image/${ext.slice(1)}`;
      
      return `<img src="data:${mimeType};base64,${base64}" alt="${path.basename(filePath)}" style="max-width: 100%;">`;
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
      const html = XLSX.utils.sheet_to_html(worksheet);
      
      // 添加响应式表格样式
      return `<div style="overflow-x: auto;">${html}</div>`;
    } catch (err) {
      console.error('表格处理错误:', err);
      return `表格加载失败: ${err.message}`;
    }
  }

  // 文本处理方法
  async processText(filePath) {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (filePath.endsWith('.md')) {
        // 使用marked库处理Markdown
        return `<div class="markdown-body">${marked.parse(content)}</div>`;
      } else {
        // 纯文本使用<pre>标签保持格式
        return `<pre>${content}</pre>`;
      }
    } catch (err) {
      console.error('文本处理错误:', err);
      return `文本加载失败: ${err.message}`;
    }
  }

  // 主处理方法
  async display(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // 根据文件类型调用不同处理方法
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
      return this.processImage(filePath);
    } else if (['.csv', '.tsv', '.xls', '.xlsx'].includes(ext)) {
      return this.processTable(filePath);
    } else {
      return this.processText(filePath);
    }
  }
}

function getPrompt() {
    const prompt = `## display_file
Description: Display various file types (images, tables, text) in HTML format
Parameters:
- filePath: (Required) Path to the file to be displayed
Supported file types:
- Images: .png, .jpg, .jpeg, .gif, .svg, .pdf
- Tables: .csv, .tsv, .xls, .xlsx
- Text: .txt, .md
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "display_file",
  "params": {
    "filePath": "[value]"
  }
}`;
    return prompt;
}

module.exports = {
    DisplayFile,
    getPrompt
};