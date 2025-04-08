const { ipcRenderer } = require('electron')
let startX, startY, selectionBox
let isCapturing = false

document.addEventListener('mousedown', e => {
  isCapturing = true
  startX = e.clientX
  startY = e.clientY
  selectionBox = document.getElementById('selection-box')
  selectionBox.style.display = 'block'
  updateSelectionBox(e)
})

document.addEventListener('mousemove', e => {
  if (!isCapturing) return
  updateSelectionBox(e)
})

async function captureScreen(source, captureRect) {
  // 获取媒体流
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        minWidth: 1920,   // 设置最小分辨率
        maxWidth: 4096,   // 设置最大分辨率
        minHeight: 1080,
        maxHeight: 4096
      }
    }
  })

  // 通过 video 标签解码
  const video = document.createElement('video')
  video.srcObject = stream
  await video.play()

  // 创建 canvas 绘制
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // 同步视频分辨率
  canvas.width = captureRect.width;
  canvas.height = captureRect.height;
  
  // 等待视频渲染完成
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 绘制帧
  ctx.drawImage(
    video,
    captureRect.x, captureRect.y,
    captureRect.width, captureRect.height,
    0, 0,
    captureRect.width, captureRect.height
  );
  
  // 获取图像数据
  const screenshot = canvas.toDataURL('image/png')

  // 清理资源
  stream.getTracks().forEach(track => track.stop())
  video.remove()

  return screenshot
}

// 监听键盘按下事件
document.addEventListener('keydown', function(event) {
  // 检查按下的键是否是Escape键（键码为27）
  if (event.keyCode === 27) {
    // 关闭当前页面
    window.close();
  }
});


document.addEventListener('mouseup', async e => {
  if (!isCapturing) return
  isCapturing = false
  selectionBox.style.display = 'none'
  // 获取设备像素比
  const dpr = window.devicePixelRatio || 1
  const { source, captureRect } = await ipcRenderer.invoke('capture-region', {
    start: { x: startX, y: startY },
    end: { x: e.clientX, y: e.clientY },
    dpr
  })
  // 在渲染进程处理图像
  const img_url = await captureScreen(source, captureRect);
  // 发送BMP缓冲区到主进程
  ipcRenderer.send('query-img', img_url);
})

function updateSelectionBox(e) {
  selectionBox.style.left = Math.min(e.clientX, startX) + 'px'
  selectionBox.style.top = Math.min(e.clientY, startY) + 'px'
  selectionBox.style.width = Math.abs(e.clientX - startX) + 'px'
  selectionBox.style.height = Math.abs(e.clientY - startY) + 'px'
}