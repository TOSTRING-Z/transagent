const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function analyzeFile(filePath, language = 'js') {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    
    // 专门处理PHP文件
    if (language === 'php') {
      // 提取PHP变量（匹配$开头的变量名）
      const phpVars = code.match(/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/g) || [];
      // 提取PHP函数（匹配function关键字定义的函数）
      const phpFunctions = code.match(/function\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\(/g) || [];
      // 提取PHP类（匹配class关键字定义的类）
      const phpClasses = code.match(/class\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g) || [];
      // 提取PHP导入（匹配use关键字）
      const phpImports = code.match(/use\s+([^;]+);/g) || [];
      
      return {
        file: filePath,
        language: 'php',
        summary: {
          classes: phpClasses.length,
          functions: phpFunctions.length,
          variables: phpVars.length,
          imports: phpImports.length
        },
        details: {
          classes: phpClasses.map(cls => ({
            name: cls.replace('class', '').trim(),
            line: getLineNumber(code, cls),
            methods: [] // PHP类方法需要额外解析，这里留空
          })),
          functions: phpFunctions.map(fn => ({
            name: fn.replace(/function\s+|\s*\(/g, ''),
            line: getLineNumber(code, fn),
            type: 'function'
          })),
          variables: [...new Set(phpVars)].map(name => ({
            name: name,
            line: getLineNumber(code, name),
            type: 'variable'
          })),
          imports: phpImports.map(imp => ({
            source: imp.replace(/^use\s+|\s*;$/g, ''),
            line: getLineNumber(code, imp),
            specifiers: []
          }))
        }
      };
    }

    // 处理其他支持的语言（JS/Python/Java）
    const parserConfig = {
      sourceType: 'module',
      plugins: []
    };

    if (language === 'js') {
      parserConfig.plugins.push('jsx', 'typescript');
    } else if (language === 'python') {
      parserConfig.plugins.push('python');
      parserConfig.sourceType = 'script';
    } else if (language === 'java') {
      parserConfig.plugins.push('java');
      parserConfig.sourceType = 'script';
    }

    const ast = parser.parse(code, parserConfig);

    const result = {
      file: filePath,
      language: language,
      summary: {
        classes: 0,
        functions: 0,
        variables: 0,
        imports: 0
      },
      details: {
        classes: [],
        functions: [],
        variables: [],
        imports: []
      }
    };

    traverse(ast, {
      ClassDeclaration(nodePath) {
        const classInfo = {
          name: nodePath.node.id.name,
          line: nodePath.node.loc.start.line,
          methods: []
        };

        if (nodePath.node.body && nodePath.node.body.body) {
          classInfo.methods = nodePath.node.body.body
            .filter(m => m.type === 'ClassMethod')
            .map(m => ({
              name: m.key.name,
              line: m.loc.start.line
            }));
        }

        result.details.classes.push(classInfo);
        result.summary.classes++;
      },

      FunctionDeclaration(nodePath) {
        result.details.functions.push({
          name: nodePath.node.id.name,
          line: nodePath.node.loc.start.line,
          type: 'function'
        });
        result.summary.functions++;
      },

      ArrowFunctionExpression(nodePath) {
        if (nodePath.parent.type === 'VariableDeclarator') {
          result.details.functions.push({
            name: nodePath.parent.id.name,
            line: nodePath.node.loc.start.line,
            type: 'arrow'
          });
          result.summary.functions++;
        }
      },

      VariableDeclarator(nodePath) {
        if (nodePath.node.id.type === 'Identifier') {
          result.details.variables.push({
            name: nodePath.node.id.name,
            line: nodePath.node.loc.start.line,
            type: nodePath.parent.kind
          });
          result.summary.variables++;
        }
      },

      ImportDeclaration(nodePath) {
        result.details.imports.push({
          source: nodePath.node.source.value,
          line: nodePath.node.loc.start.line,
          specifiers: nodePath.node.specifiers.map(s => ({
            local: s.local.name,
            imported: s.imported ? s.imported.name : 'default'
          }))
        });
        result.summary.imports++;
      }
    });

    return {
      ...result,
      export: {
        json: () => JSON.stringify(result, null, 2),
        csv: () => {
          let csv = 'Type,Name,Line,Details\n';

          result.details.classes.forEach(c => {
            csv += `class,${c.name},${c.line},"${JSON.stringify(c.methods)}"\n`;
          });

          result.details.functions.forEach(f => {
            csv += `function,${f.name},${f.line},${f.type}\n`;
          });

          result.details.variables.forEach(v => {
            csv += `variable,${v.name},${v.line},${v.type}\n`;
          });

          result.details.imports.forEach(i => {
            csv += `import,${i.source},${i.line},"${i.specifiers.map(s => s.imported).join(',')}"\n`;
          });

          return csv;
        }
      }
    };
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
    return { 
      file: filePath,
      error: error.message 
    };
  }
}

function main({ filePath, language = 'js' }) {
  return analyzeFile(filePath, language);
}

function getPrompt() {
  const prompt = `## analyze_code
Description: Analyzes source code files to extract structural elements including classes, functions, variables and import statements. Supports JavaScript, Python, Java and PHP.

Key Features:
- Class analysis with method listings
- Function detection (including arrow functions)
- Variable declaration tracking
- Import/require statement parsing
- Language-specific parsing (PHP uses regex while others use AST)

Parameters:
- filePath: (Required) Absolute filesystem path to target code file
- language: (Optional) Specify code language (js|python|java|php), defaults to 'js'

Best Practices:
1. For large files, combine with search_files to analyze specific sections
2. Use language parameter for non-JS files
3. Check error field in response for parsing issues

Output Format:
{
  file: String,
  language: String,
  summary: {
    classes: Number,
    functions: Number,
    variables: Number,
    imports: Number
  },
  details: {
    classes: Array<{name, line, methods}>,
    functions: Array<{name, line, type}>,
    variables: Array<{name, line, type}>,
    imports: Array<{source, line, specifiers}>
  }
}`;
  return prompt;
}

function getLineNumber(code, searchString) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1; // Line numbers start at 1
    }
  }
  return -1; // Return -1 if not found
}

module.exports = {
  main,
  getPrompt
};