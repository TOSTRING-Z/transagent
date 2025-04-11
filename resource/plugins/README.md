# 工具配置

> 安装依赖包

```shell
npm install
```

_- 若插件报错，请手动配置插件绝对路径。配置示例如下：-_

> Agent工具

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

> 自定义工具

* Agent工具必须需实现`getPrompt`函数

config.json

```json
"plugins": {
  "baidu_translate": {
    "path": "{resourcesPath}/resource/plugins/script/baidu_translate.js",
    "show": true
  },
  "get_think": {
    "path": "{resourcesPath}/resource/plugins/script/get_think.js",
    "show": false
  },
  "json_parse": {
    "path": "{resourcesPath}/resource/plugins/script/json_parse.js",
    "show": false
  }
}
```

_- 更多案例见： -_

[./script](script)
