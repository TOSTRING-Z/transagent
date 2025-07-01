const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')

// 根据操作系统选择可执行文件
function getExecutablePath() {
  // eslint-disable-next-line no-undef
  const platform = process.platform
  // eslint-disable-next-line no-undef
  const executableDir = path.join(__dirname, 'bin')

  let executableName
  if (platform === 'linux') {
    executableName = 'capture_mouse_x11'
  } else if (platform === 'win32') {
    executableName = 'capture_mouse_win.exe'
  } else {
    throw new Error(`Unsupported platform: ${platform}`)
  }

  const fullPath = path.join(executableDir, executableName)
  
  // 验证文件是否存在
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Executable not found: ${fullPath}`)
  }

  return fullPath
}

// 使用示例
async function captureMouse() {
  return new Promise((resolve, reject) => {
    const executablePath = getExecutablePath()

    execFile(executablePath, (error, stdout, stderr) => {
      if (error) {
        return reject(error)
      }
      if (stderr) {
        return reject(new Error(stderr))
      }

      try {
        const position = JSON.parse(stdout)
        resolve(position)
      } catch (parseError) {
        reject(parseError)
      }
    })
  })
}

module.exports = {
    captureMouse,
};