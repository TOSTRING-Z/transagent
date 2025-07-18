# Tool Configuration

> Install dependencies

```shell
npm install
```

_- If plugins report errors, please manually configure the absolute path of plugins. Configuration example: -_

> Agent Tools

config.json

```json
"plugins": {
  "python_execute": {
    "params": {
      "python_bin": "python",
      "delay_time": 10,
      "threshold": 10000
    },
    "enabled": true
  },
  "file_load": {
    "extra": [
      {
        "type": "file-upload"
      }
    ],
    "show": false,
    "params": {
      "threshold": 10000
    },
    "enabled": true
  },
  "search_files": {
    "enabled": true
  },
  "list_files": {
    "params": {
      "threshold": 50
    },
    "enabled": true
  },
  "write_to_file": {
    "enabled": true
  },
  "replace_in_file": {
    "enabled": true
  }
}
```

> Custom Tools

* Agent Tools must implement the `getPrompt` function

config.json

```json
"plugins": {
  "baidu_translate": {
    "path": "{resourcesPath}/resources/plugins/script/baidu_translate.js",
    "show": true
  },
  "get_think": {
    "path": "{resourcesPath}/resources/plugins/script/get_think.js",
    "show": false
  },
  "json_parse": {
    "path": "{resourcesPath}/resources/plugins/script/json_parse.js",
    "show": false
  }
}
```

_- More examples: -_

[./script](script)
