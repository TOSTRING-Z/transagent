document.addEventListener("click", (event) => {
  // Use Clipboard API to copy
  if (event.target.classList.contains("copy-btn")) {
    const codeToCopy = decodeURIComponent(event.target.getAttribute('data-code'));
    navigator.clipboard.writeText(codeToCopy).then(() => {
      showLog('Copy successful');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  }

  return event;

});

const system_prompt = document.getElementById("system_prompt");
const file_reader = document.getElementById("file_reader");
const act_plan = document.getElementById("act_plan");
const auto = document.getElementById("auto");
const act = document.getElementById("act");
const plan = document.getElementById("plan");
const pause = document.getElementById("pause");

const content = document.getElementById("content");
const input = document.getElementById("input");
const submit = document.getElementById("submit");
const messages = document.getElementById("messages");
const top_div = document.getElementById("top_div");
const bottom_div = document.getElementById("bottom_div");

const formData = {
  query: null,
  prompt: null,
  file_path: null,
  img_url: null
}

global = {
  math_statu: true,
  markdown_statu: true,
  scroll_top: {
    info: true,
    data: true,
  }
};

messages.addEventListener('mouseenter', () => {
  global.scroll_top.info = false;
  global.scroll_top.data = false;
});

messages.addEventListener('mouseleave', () => {
  global.scroll_top.info = true;
  global.scroll_top.data = true;
});

function getFileName(path) {
  return path.split('/').pop().split('\\').pop();
}

function toggleMode(mode) {
  window.electronAPI.planActMode(mode);
  auto.classList.remove("active")
  act.classList.remove("active")
  plan.classList.remove("active")
  switch (mode) {
    case "auto":
      auto.classList.add("active");
      break;
    case "act":
      act.classList.add("active");
      break;
    case "plan":
      plan.classList.add("active");
      break;
  }
}

auto.addEventListener("click", async function (e) {
  toggleMode("auto");
})

act.addEventListener("click", async function (e) {
  toggleMode("act");
})

plan.addEventListener("click", async function (e) {
  toggleMode("plan");
})

file_reader.addEventListener("click", async function (e) {
  formData.file_path = await window.electronAPI.getFilePath();
  if (!!formData.file_path) {
    e.target.innerText = getFileName(formData.file_path);
  } else {
    e.target.innerText = "Select file";
  }
})

const input_h = input.clientHeight;

function autoResizeTextarea(textarea) {
  textarea.style.height = null;
  const inputHeight = Math.min(textarea.scrollHeight, input_h * 3);
  textarea.style.height = inputHeight + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px"
}

function init_size() {
  system_prompt.style.height = input_h + "px";
  input.style.height = input_h + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px";
}

document.addEventListener("DOMContentLoaded", function () {

  autoResizeTextarea(input);

  // Listen for input events, auto-adjust height
  input.addEventListener("input", function () {
    autoResizeTextarea(input);
    if (this.value.trim() !== '') {
      submit.classList.add('success');
    } else {
      submit.classList.remove('success');
    }
  });
  input.addEventListener("change", function () {
    autoResizeTextarea(input);
    if (this.value.trim() !== '') {
      submit.classList.add('success');
    } else {
      submit.classList.remove('success');
    }
  });
  input.addEventListener("click", function () {
    autoResizeTextarea(input);
    if (this.value.trim() !== '') {
      submit.classList.add('success');
    } else {
      submit.classList.remove('success');
    }
  })

  system_prompt.addEventListener("input", function () {
    autoResizeTextarea(input);
  });
  system_prompt.addEventListener("click", function () {
    autoResizeTextarea(input);
  })

  top_div.addEventListener("click", function () {
    init_size();
  })

  // Add event listener for window resize event
  window.addEventListener("resize", function () {
    init_size();
  });
});

user_message = `<div class="relative space-y-2 space-x-2" data-role="user" data-id="">
  <div class="flex flex-row-reverse w-full">
    <div class="menu-container">
      <img class="menu user" src="img/user.svg" alt="User Avatar">
    </div>
    <div class="message"></div>
  </div>
</div>`;

system_message = `<div class="relative space-y-2 space-x-2" data-role="system" data-id="">
  <div class="absolute">
    <div class="menu-container">
      <img class="menu system" src="" alt="System Avatar">
      <div class="menu-item">
        <svg viewBox="0 0 1024 1024">
            <path fill="#ffffff"
                d="M950.857143 224.304762H799.695238V63.390476H224.304762v160.914286H73.142857v97.523809h87.771429v638.780953h697.295238V321.828571h92.647619v-97.523809zM321.828571 160.914286h385.219048v63.390476H321.828571V160.914286z m438.857143 702.171428H258.438095V321.828571h502.247619v541.257143z">
            </path>
            <path fill="#ffffff"
                d="M355.961905 438.857143h97.523809v326.704762h-97.523809zM570.514286 438.857143h97.523809v326.704762h-97.523809z">
            </path>
        </svg>
      </div>
      <div class="menu-item">
        <svg viewBox="0 0 1024 1024">
          <path fill="#ffffff"
              d="M725.333333 960H128c-23.466667 0-42.666667-19.2-42.666667-42.666667V277.333333c0-23.466667 19.2-42.666667 42.666667-42.666666h128V106.666667c0-23.466667 19.2-42.666667 42.666667-42.666667h597.333333c23.466667 0 42.666667 19.2 42.666667 42.666667v640c0 23.466667-19.2 42.666667-42.666667 42.666666h-128v128c0 23.466667-19.2 42.666667-42.666667 42.666667zM170.666667 874.666667h512V320H170.666667v554.666667z m170.666666-725.333334v85.333334h384c23.466667 0 42.666667 19.2 42.666667 42.666666v426.666667h85.333333V149.333333H341.333333z">
          </path>
          <path fill="#ffffff"
              d="M298.666667 490.666667h128c23.466667 0 42.666667-19.2 42.666666-42.666667s-19.2-42.666667-42.666666-42.666667h-128c-23.466667 0-42.666667 19.2-42.666667 42.666667s19.2 42.666667 42.666667 42.666667M512 576H298.666667c-23.466667 0-42.666667 19.2-42.666667 42.666667s19.2 42.666667 42.666667 42.666666h213.333333c23.466667 0 42.666667-19.2 42.666667-42.666666s-19.2-42.666667-42.666667-42.666667">
          </path>
        </svg>
      </div>
    </div>
  </div>
  <div class="info hidden">
    <div class="info-header">Call information</div>
    <div class="info-content" data-content=""></div>
  </div>
  <div class="thinking">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <button class="btn">Stop generation</button>
  </div>
  <div class="message" data-content=""></div>
</div>`

function showLog(log) {
  const htmlString = `<div style="display: flex; pointer-events: none; height: 100%; width: 100%; justify-content: center; align-items: center; font-size: large; position: absolute;">
          <b style="border: 2px solid #666; text-align: center; padding: 5px; background: white;">${log}</b>
      </div>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const newElement = doc.body.firstChild;
  document.body.appendChild(newElement);
  setInterval(() => { newElement.remove() }, 2000)
}

function copy_message(raw) {
  navigator.clipboard.writeText(raw).then(() => {
    showLog('Copy successful');
  }).catch(err => {
    console.error('Copy failed', err);
  });
}

function infoAdd(info) {
  const messageSystem = document.querySelectorAll(`[data-id='${info.id}']`)[1];
  const info_content = messageSystem.getElementsByClassName('info-content')[0];
  const info_div = messageSystem.getElementsByClassName('info')[0];
  if (info_div && info_div.classList.contains('hidden')) {
    info_div.classList.remove('hidden');
  }
  if (info.content) {
    info_content.dataset.content += info.content;
    info_content.innerHTML = marked.parse(info_content.dataset.content);
    if (global.scroll_top.info)
      info_content.scrollTop = info_content.scrollHeight;
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
}

function userAdd(data) {
  if (typeof (data.content) == "string") {
    messages.appendChild(user_message.formatMessage({
      "id": data.id,
      "message": data.content,
      "image_url": data?.img_url,
    }, "user"));
  } else {
    messages.appendChild(user_message.formatMessage({
      "id": data.id,
      "message": data.content[0].text.content,
      "image_url": data.content[1].image_url.url,
    }, "user"));
  }
  let system_message_cursor = system_message.formatMessage({
    "icon": getIcon(false),
    "id": data.id,
    "message": ""
  }, "system")
  addEventStop(system_message_cursor, data.id);
  messages.appendChild(system_message_cursor);

}

function streamMessageAdd(chunk) {
  const messageSystem = document.querySelectorAll(`[data-id='${chunk.id}']`)[1];
  const message_content = messageSystem.getElementsByClassName('message')[0];
  if (chunk.content) {
    message_content.dataset.content += chunk.content;
    message_content.innerHTML = marked.parse(message_content.dataset.content);
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
  if (chunk.end) {
    message_content.innerHTML = marked.parse(message_content.dataset.content);
    const thinking = messageSystem.getElementsByClassName("thinking")[0];
    thinking.remove();
    typesetMath();
    menuEvent(chunk.id, message_content.dataset.content);
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
}

function menuEvent(id, raw) {
  const messageSystem = document.querySelectorAll(`[data-id='${id}']`)[1];
  const menuContainer = messageSystem.getElementsByClassName('menu-container')[0];
  const menu = menuContainer.getElementsByClassName("menu")[0];
  const menu_items = menuContainer.getElementsByClassName("menu-item");

  [...menu_items].forEach((menu_item, i) => {
    menu_item.addEventListener('click', (e) => {
      e.stopPropagation();
      menuContainer.classList.remove('active');
      switch (i) {
        case 0:
          delete_message(id);
          break;
        case 1:
          copy_message(raw);
          break;

        default:
          break;
      }

    })
  })

  menu.addEventListener('mouseenter', () => {
    menuContainer.classList.add('active');
  })

  menuContainer.addEventListener('mouseleave', () => {
    menuContainer.classList.remove('active');
  })
}


const { Marked } = globalThis.marked;
const { markedHighlight } = globalThis.markedHighlight;

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

const marked_input = new Marked({
  renderer: {
    html(token) {
      token.type = "plaintext";
      return formatText(token);
    },
    link(token) {
      token.type = "plaintext";
      return formatText(token);
    },
    text(token) {
      if (token.hasOwnProperty("tokens")) {
        return this.parser.parseInline(token.tokens);
      } else {
        token.type = "plaintext";
        return formatText(token);
      }
    },
  }
});

const formatCode = (token) => {
  let encodeCode;
  // Define regex to match ```<language>\n<code>\n``` block
  const codeBlockRegex = /```\w*\n([\s\S]*?)```/;
  // Execute matching
  const match = token.raw.match(codeBlockRegex);
  if (match) {
    // Extract code block content (remove language identifier)
    const codeContent = match[1].trim();
    encodeCode = encodeURIComponent(codeContent);
  } else {
    encodeCode = encodeURIComponent(token.raw);
  }
  return `<div class="code-header">
            <span class="language-tag">${token.type}</span>
            <button
            class="copy-btn"
            data-code="${encodeCode}"
            title="Copy code">Copy</button>
          </div>
          <pre class="hljs"><code>${token.text}</code></pre>`;
}

const formatText = (token) => {
  let language = hljs.getLanguage(token.type) ? token.type : "plaintext";
  const highlightResult = hljs.highlight(token.raw, { language }).value;
  return highlightResult;
}

const renderer = {
  code(token) {
    return formatCode(token);
  },
  html(token) {
    return formatCode(token);
  },
  link(token) {
    return formatText(token);
  },
  text(token) {
    if (token.hasOwnProperty("tokens")) {
      return this.parser.parseInline(token.tokens);
    } else if (token.hasOwnProperty("typeThink")) {
      const highlightResult = marked_input.parse(token.text);
      return `<div class="think">${highlightResult}</div>`;
    } else {
      return token.raw;
    }
  },
}

const think = {
  name: 'think',
  level: 'block',
  start(src) { return src.match(/<think>/)?.index; },
  tokenizer(src, tokens) {
    const rule0 = /^<think>([\s\S]*?)<\/think>/;
    const match0 = rule0.exec(src);
    const rule1 = /^<think>([\s\S]*)/;
    const match1 = rule1.exec(src);
    const match = match0 || match1
    if (match) {
      const token = {
        type: "text",
        typeThink: true,
        raw: match[0],
        text: match[1],
      };
      return token
    }
  },
};

marked.use({ renderer, extensions: [think] });

var typesetMath = function () { };

function createElement(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const newElement = doc.body.firstChild;
  return newElement;
}

// Extend String prototype
String.prototype.formatMessage = function (params, role) {
  const newElement = createElement(this);
  let message = newElement.getElementsByClassName("message")[0]
  if (params.hasOwnProperty("icon")) {
    let menu = newElement.getElementsByClassName("menu")[0]
    menu.src = `img/${params["icon"]}.svg`;
  }
  if (role === "system") {
    message.innerHTML = marked.parse(params["message"])
  } else {
    if (!!params.image_url) {
      let img = createElement(`<img class="size-48 shadow-xl rounded-md mb-1" src="${params.image_url}">`);
      message.appendChild(img);
    }
    let text = createElement(`<div class="text"></div>`);
    text.innerText = params["message"] || "";
    message.appendChild(text);
  }
  newElement.dataset.id = params["id"]
  return newElement;
};

String.prototype.format = function (params) {
  const formattedText = this.replace(/@(\w+)/g, (match, key) => {
    if (params.hasOwnProperty(key)) {
      return params[key];
    } else {
      console.warn(`Key "${key}" not found in params`);
      return match;
    }
  });
  const parser = new DOMParser();
  const doc = parser.parseFromString(formattedText, 'text/html');
  const newElement = doc.body.firstChild;
  return newElement;
};

window.electronAPI.handleMarkDownFormat((markdown_statu) => {
  global.markdown_statu = markdown_statu;
})

window.electronAPI.handleMathFormat((math_statu) => {
  global.math_statu = math_statu;
  if (global.math_statu) {
    typesetMath = function () {
      MathJax.typesetPromise().catch((err) => console.log(err));
    }
    typesetMath();
  }
  else {
    typesetMath = function () { }
  }
})

async function delete_message(id) {
  await window.electronAPI.deleteMessage(id);
  var elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(function (element) {
    element.remove();
  });
}

function response_success(id) {
  var elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(function (element) {
    if (element.getAttribute('data-role') === 'system') {
      element.remove();
    }
  });
}

function getIcon(is_plugin) {
  return is_plugin ? "api" : "ai";
}

window.electronAPI.streamData((chunk) => {
  streamMessageAdd(chunk);
})

window.electronAPI.infoData((info) => {
  infoAdd(info);
})

window.electronAPI.userData((data) => {
  userAdd(data);
})

function addEventStop(messageSystem, id) {
  const message_content = messageSystem.getElementsByClassName('message')[0];
  const thinking = messageSystem.getElementsByClassName("thinking")[0];
  const btn = messageSystem.getElementsByClassName("btn")[0];
  btn.addEventListener("click", () => {
    window.electronAPI.streamMessageStop(id);
    thinking.remove();
    typesetMath();
    menuEvent(id, message_content.dataset.content);
  })
}

window.electronAPI.handleQuery(async (data) => {
  let user_content;
  data.prompt = system_prompt.value;
  if (data.img_url) {
    data.query = input.value;
  } else {
    user_content = data.query;
  }
  messages.appendChild(user_message.formatMessage({
    "id": data.id,
    "message": user_content,
    "image_url": data.img_url,
  }, "user"));
  let system_message_cursor = system_message.formatMessage({
    "icon": getIcon(data.is_plugin),
    "id": data.id,
    "message": ""
  }, "system")
  addEventStop(system_message_cursor, data.id);
  messages.appendChild(system_message_cursor);
  top_div.scrollTop = top_div.scrollHeight;
  window.electronAPI.queryText(data);
})

window.electronAPI.handleExtraLoad((data) => {
  system_prompt.style.display = "none";
  file_reader.style.display = "none";
  act_plan.style.display = "none";
  data?.forEach(item => {
    switch (item.type) {
      case "system-prompt":
        system_prompt.style.display = "block";
        break;
      case "file-reader":
        file_reader.style.display = "block";
        break;
      case "act-plan":
        act_plan.style.display = "flex";
        break;
    }
  })
  init_size();
})

let option_template = `<div class="btn" data-id="@id">@value</div>`

window.electronAPI.handleOptions(({ options, id }) => {
  pause.style.display = "flex";
  options.forEach(value => {
    const option = option_template.format({ value, id });
    option.addEventListener("click", async function (e) {
      formData.query = value;
      formData.prompt = "";
      window.electronAPI.clickSubmit(formData);
      pause.style.display = "none";
      pause.innerHTML = "";
    })
    pause.appendChild(option);
  })
})

window.electronAPI.handlePrompt((prompt) => {
  system_prompt.value = prompt;
})

window.electronAPI.handleClear(() => {
  messages.innerHTML = null;
  pause.style.display = "none";
  pause.innerHTML = "";
})

submit.addEventListener("click", () => {
  formData.query = input.value;
  formData.prompt = system_prompt.value;
  window.electronAPI.clickSubmit(formData);
  pause.style.display = "none";
  pause.innerHTML = "";
})
