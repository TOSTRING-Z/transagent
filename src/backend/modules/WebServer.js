const express = require('express');
const bodyParser = require('body-parser');
const { global, utils } = require('./globals')
const { clearMessages } = require('../server/llm_service');


class WebServer {
  constructor(window) {
    this.app = express();
    this.port = utils.getConfig("webserver")?.port || 3005;

    this.app.use(bodyParser.json());

    this.app.post('/chat/list', async (_req, res) => {
      try {
        const history_data = utils.getHistoryData();
        res.json({ history_data: history_data });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/chat/checkout', async (req, res) => {
      try {
        const data = req.body;
        // 根据data.chat_id切换会话
        clearMessages();
        if (data?.chat_id) {
          const history = await window.loadHistory(data.chat_id);
          if (history) {
            global.chat = history;
            window.window.webContents.send('select-chat',global.chat);
          }
        } else {
          window.window.webContents.send('clear');
          global.chat = utils.getChatInit();
          global.chat.id = utils.getChatId();
          window.window.webContents.send('new-chat',global.chat);
          window.setHistory();
        }
        res.json({ chat: global.chat });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/chat/completions', async (req, res) => {
      try {
        const { messages } = req.body;
        let data = { query: messages[messages.length - 1].content };
        window.send_query(data, global.model, global.version, false);
        data = window.getDataDefault(data);
        data.id = global.id;
        const result = await window.callReAct(data);
        res.json({ choices: [{ message: { content: result } }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`Web server listening on port ${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = {
  WebServer
};