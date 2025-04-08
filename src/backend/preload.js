const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  handleQuery: (callback) => ipcRenderer.on('query', (_event, data) => callback(data)),
  handleExtraLoad: (callback) => ipcRenderer.on('extra_load', (_event, data) => callback(data)),
  handleOptions: (callback) => ipcRenderer.on('options', (_event, data) => callback(data)),
  handleClear: (callback) => ipcRenderer.on('clear', (_event, value) => callback(value)),
  handlePrompt: (callback) => ipcRenderer.on('prompt', (_event, prompt) => callback(prompt)),
  handleMarkDownFormat: (callback) => ipcRenderer.on('markdown-format', (_event, markdown_statu) => callback(markdown_statu)),
  handleMathFormat: (callback) => ipcRenderer.on('math-format', (_event, math_statu) => callback(math_statu)),
  queryText: (data) => ipcRenderer.invoke('query-text', data),
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  planActMode: (mode) => ipcRenderer.send('plan-act-mode', mode),
  clickSubmit: (formData) => ipcRenderer.send('submit', formData),
  openExternal: (href) => ipcRenderer.send('open-external', href),
  captureRegion: (params) => ipcRenderer.invoke('capture-region', params),
  deleteMessage: (id) => ipcRenderer.invoke('delete-message', id),
  streamMessageStop: (id) => ipcRenderer.send('stream-message-stop', id),
  streamData: (callback) => ipcRenderer.on('stream-data', (_event, chunk) => callback(chunk)),
  infoData: (callback) => ipcRenderer.on('info-data', (_event, info) => callback(info)),
  userData: (callback) => ipcRenderer.on('user-data', (_event, info) => callback(info)),
})