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
const file_upload = document.getElementById("file_upload");
const act_plan = document.getElementById("act_plan");
const auto = document.getElementById("auto");
const act = document.getElementById("act");
const plan = document.getElementById("plan");
const pause = document.getElementById("pause");
const progress_container = document.getElementById('progress-container')
const progress_bar = document.getElementById('progress-bar')

const content = document.getElementById("content");
const input = document.getElementById("input");
const submit = document.getElementById("submit");
const messages = document.getElementById("messages");
const top_div = document.getElementById("top_div");
const bottom_div = document.getElementById("bottom_div");

const version = document.getElementById("version");
const tokens = document.getElementById("tokens");
const seconds = document.getElementById("seconds");

const formData = {
  query: null,
  prompt: null,
  file_path: null,
  img_url: null
}

global = {
  math_statu: true,
  markdown_statu: true,
  seconds_timer: null,
  chat: { tokens: 0, seconds: 0 },
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

file_upload.addEventListener("click", async function (e) {
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
  let system_prompt_height = system_prompt.clientHeight;
  let input_height = input.clientHeight;
  let bottom_div_height = bottom_div.clientHeight;
  system_prompt.style.height = input_h + "px";
  input.style.height = input_h + "px";
  top_div.style.height = window.innerHeight - (bottom_div_height - system_prompt_height - input_height + (!!system_prompt_height ? 2 : 1) * input_h) + "px";
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
    autoResizeTextarea(system_prompt);
  });

  system_prompt.addEventListener("click", function () {
    autoResizeTextarea(system_prompt);
  })

  // Add event listener for window resize event
  window.addEventListener("resize", function () {
    init_size();
  });


  loadOptions();
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
  <div class="menu-container">
    <img class="menu system" src="" alt="System Avatar">
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
  <div class="message-actions">
    <button class="action-btn copy" title="copy">
      <i class="far fa-copy"></i>
    </button>
    <button class="action-btn delete" title="delete">
      <i class="far fa-trash-alt"></i>
    </button>
    <button class="action-btn toggle" title="toggle">
      <i class="fas fa-toggle-off"></i>
    </button>
  </div>
</div>`

// The HTML content that would normally be loaded from the file
const htmlContent = `
<div class="base-container">
    <div class="base-header">
      <div class="base-icon">B</div>
      <h1 class="base-title">I am BixChat, an AI agent specialized in transcriptional regulation analysis.</h1>
    </div>
    <div class="options-container">
      <div data-query="Coverage analysis of SNPs on the GATA2 gene" class="option-card">
        <div class="option-icon">📍</div>
        <h3 class="option-title">Regional annotation analysis</h3>
        <p class="option-desc">Enhancer annotation, transcription factor binding prediction, SNP site analysis"</p>
      </div>

      <div data-query="Analyze TP53 gene expression across tissues and generate a heatmap visualization" class="option-card">
        <div class="option-icon">📈</div>
        <h3 class="option-title">Gene expression analysis</h3>
        <p class="option-desc">Tissue/cell/disease-specific expression profiling, co-expression network analysis, and expression pattern visualization</p>
      </div>

      <div data-query="Analyze the enhancer coverage of ESR1, GATA3, FOXA1, and EP300 genes, and identify motifs in overlapping enhancers" class="option-card">
        <div class="option-icon">🧬</div>
        <h3 class="option-title">Sequence data analysis</h3>
        <p class="option-desc">Motif discovery, sequence alignment, deepTools analysis</p>
      </div>
    </div>
  </div>
`;

let optionDom = null;

function loadOptions() {
  // init
  messages.innerHTML = null;
  pause.style.display = "none";
  pause.innerHTML = "";
  global.chat.seconds = 0;
  global.chat.tokens = 0;
  tokens.innerText = global.chat.tokens;
  seconds.innerText = global.chat.seconds;
  // dom
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  optionDom = doc.querySelector('.base-container');

  // Get all option cards and bind click events
  const optionCards = optionDom.querySelectorAll('.option-card');
  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.dataset.query;
      // Assuming the query function is available in the same scope
      if (query) {
        formData.query = query;
        formData.prompt = system_prompt;
        window.electronAPI.clickSubmit(formData);
      }
    });

    // Add hover effect for better UX
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.2s';
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.02)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
    });
  });

  messages.append(optionDom);
}

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

function getTokens(text) {
  // 1. 先处理转义字符（可选，根据需求）
  const normalizedText = text
    .replace(/\\n/g, '\n')   // 换行符
    .replace(/\\t/g, '\t')   // 制表符
    .replace(/\\"/g, '"')    // 双引号
    .replace(/\\\\/g, '\\'); // 反斜杠

  // 2. 匹配纯中文（不含标点）
  const chineseTokens = normalizedText.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || [];

  // 3. 匹配英文单词和常见编程符号
  const wordTokens = normalizedText.match(/[a-zA-Z_][a-zA-Z0-9_]*|\+\+|--|&&|\|\||[<>!=]=?|\d+\.?\d*|[^\s\u4e00-\u9fa5]/g) || [];

  return chineseTokens.length + wordTokens.length;
}


function userAdd(data) {
  let messageUser;
  if (typeof (data.content) == "string") {
    messageUser = user_message.formatMessage({
      "id": data.id,
      "message": data.content,
      "image_url": data?.img_url,
    }, "user")
  } else {
    messageUser = user_message.formatMessage({
      "id": data.id,
      "message": data.content[0].text.content,
      "image_url": data.content[1].image_url.url,
    }, "user");
  }
  messages.appendChild(messageUser);
  let messageSystem = system_message.formatMessage({
    "icon": getIcon(false),
    "id": data.id,
    "message": ""
  }, "system")
  messages.appendChild(messageSystem);
  addEventStop(messageSystem, data.id);
  if (!!data?.del) {
    messageUser.classList.add("message_del")
    messageSystem.classList.add("message_del")
    messageUser.classList.add("message_toggle")
    messageSystem.classList.add("message_toggle")
  }
}

function infoAdd(info) {
  const messageSystem = document.querySelectorAll(`[data-id='${info.id}']`)[1];
  const info_content = messageSystem.getElementsByClassName('info-content')[0];
  const info_div = messageSystem.getElementsByClassName('info')[0];
  if (info_div && info_div.classList.contains('hidden')) {
    info_div.classList.remove('hidden');
  }
  if (!!info.content) {
    if (global.seconds_timer) {
      global.chat.tokens += getTokens(info.content);
      tokens.innerText = global.chat.tokens;
    }
    let info_item_content = marked.parse(info.content);
    let info_item = createElement(`<div info_data-id="${info.memory_id}">
  <div class="info-item">
  </div>
</div>`);
    if (info?.del)
      info_item.classList.add("del");
    info_item.getElementsByClassName('info-item')[0].innerHTML = info_item_content;
    info_content.appendChild(info_item);
    info_content.dataset.content += info.content;
    if (global.scroll_top.info)
      info_content.scrollTop = info_content.scrollHeight;
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
}


async function streamMessageAdd(chunk) {
  const messageSystem = document.querySelectorAll(`[data-id='${chunk.id}']`)[1];
  const message_content = messageSystem.getElementsByClassName('message')[0];
  if (!!chunk.content) {
    if (global.seconds_timer) {
      global.chat.tokens += getTokens(chunk.content);
      tokens.innerText = global.chat.tokens;
    }
    optionDom?.remove();
    let memory_id = chunk.hasOwnProperty("memory_id") ? chunk.memory_id : chunk.id;
    console.log(`memory_id: ${memory_id}`)
    console.log(`content: ${chunk.content}`)
    console.log(`------------------------`)

    let chunk_content = null;
    let chunk_item_content = null;
    let chunk_item = null;
    let chunk_item_query = message_content.querySelectorAll(`[chunk_data-id='${memory_id}']`);
    if (chunk_item_query.length > 0) {
      chunk_content = chunk_item_query[0].dataset.content + chunk.content;
      chunk_item_content = marked.parse(chunk_content);
      chunk_item = chunk_item_query[0];
      chunk_item.dataset.content = chunk_content;
      chunk_item.getElementsByClassName('chunk-content')[0].innerHTML = chunk_item_content;
    } else {
      chunk_item = createElement(`<div chunk_data-id="${memory_id}">
  <div class="chunk-content"></div>
  <div class="chunk-actions">
    <button class="action-btn chunk-delete" title="删除">
      <i class="far fa-trash-alt"></i>
    </button>
  </div>
</div>`);
      if (chunk?.del)
        chunk_item.classList.add("del");
      chunk_content = chunk.content;
      chunk_item_content = marked.parse(chunk_content);
      chunk_item.dataset.content = chunk.content;
      chunk_item.getElementsByClassName('chunk-content')[0].innerHTML = chunk_item_content;
      chunk_item.getElementsByClassName('chunk-delete')[0].addEventListener("click", () => {
        delete_memory(memory_id)
      })
      message_content.appendChild(chunk_item);
    }
    message_content.dataset.content += chunk.content;
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
  if (chunk.end) {
    clearInterval(global.seconds_timer);
    global.seconds_timer = null;
    if (!messageSystem.dataset?.event_stop) {
      messageSystem.dataset.event_stop = true;
      const message_content = messageSystem.getElementsByClassName('message')[0];
      const thinking = messageSystem.getElementsByClassName("thinking")[0];
      thinking.remove();
      typesetMath();
      menuEvent(messageSystem, message_content.dataset.content);
    }
    if (global.scroll_top.data)
      top_div.scrollTop = top_div.scrollHeight;
  }
  await window.electronAPI.setGlobal(global.chat);
}


async function delete_message(id) {
  let elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(async function (message_element) {
    if (message_element.classList.contains('message_del')) {
      await window.electronAPI.toggleMessage({ id, del: false });
      message_element.classList.remove('message_del')
      message_element.querySelectorAll("[info_data-id]").forEach(function (element) {
        if (element.classList.contains('del'))
          element.classList.remove('del');
      });

      message_element.querySelectorAll("[chunk_data-id]").forEach(function (element) {
        if (element.classList.contains('del'))
          element.classList.remove('del');
      });
    } else {
      await window.electronAPI.toggleMessage({ id, del: true });
      message_element.classList.add('message_del')
      message_element.classList.add('message_toggle')
      message_element.querySelectorAll("[info_data-id]").forEach(function (element) {
        if (!element.classList.contains('del'))
          element.classList.add('del');
      });

      message_element.querySelectorAll("[chunk_data-id]").forEach(function (element) {
        if (!element.classList.contains('del'))
          element.classList.add('del');
      });
    }

  });
}

async function delete_memory(memory_id) {
  await window.electronAPI.toggleMemory(memory_id);
  let elements = document.querySelectorAll(`[info_data-id="${memory_id}"]`);
  elements.forEach(function (element) {
    element.classList.toggle('del');
  });
  elements = document.querySelectorAll(`[chunk_data-id="${memory_id}"]`);
  elements.forEach(function (element) {
    element.classList.toggle('del');
  });
}

function menuEvent(messageSystem, raw) {
  const copy = messageSystem.getElementsByClassName("copy")[0];
  const del = messageSystem.getElementsByClassName("delete")[0];
  const toggle = messageSystem.getElementsByClassName("toggle")[0];
  copy.classList.add("active");
  del.classList.add("active");
  toggle.classList.add("active");
  copy.addEventListener("click", () => {
    copy_message(raw);
  })
  del.addEventListener("click", () => {
    delete_message(messageSystem.dataset.id);
  })
  toggle.addEventListener("click", () => {
    messageSystem.classList.toggle("message_toggle");
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

const formatImage = (token) => {
  return `<img class="size-48 shadow-xl rounded-md mb-1" src="${token.href}" alt="${token.text}"></img>`;
}

const formatLink = (token) => {
  return `<a href="${token.href}">${token.text}</a>`;
}

const renderer = {
  code(token) {
    return formatCode(token);
  },
  html(token) {
    return formatText(token);
  },
  link(token) {
    return formatLink(token);
  },
  image(token) {
    return formatImage(token);
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
      window.MathJax.typesetPromise().catch((err) => console.log(err));
    }
    typesetMath();
  }
  else {
    typesetMath = function () { }
  }
})

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
    menuEvent(messageSystem, message_content.dataset.content);
  })

}

window.electronAPI.handleQuery(async (data) => {
  optionDom?.remove();
  if (!global.seconds_timer) {
    global.seconds_timer = setInterval(() => {
      global.chat.seconds += 0.1;
      seconds.innerText = global.chat.seconds.toFixed(1);
    }, 100)
  } else {
    clearInterval(global.seconds_timer);
    global.seconds_timer = null;
    global.seconds_timer = setInterval(() => {
      global.chat.seconds += 0.1;
      seconds.innerText = global.chat.seconds.toFixed(1);
    }, 100)
  }
  tokens.innerText = global.chat.tokens;
  version.innerText = data.version;
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
  let messageSystem = system_message.formatMessage({
    "icon": getIcon(data.is_plugin),
    "id": data.id,
    "message": ""
  }, "system")
  addEventStop(messageSystem, data.id);
  messages.appendChild(messageSystem);
  top_div.scrollTop = top_div.scrollHeight;
  window.electronAPI.queryText(data);
})

window.electronAPI.handleExtraLoad((data) => {
  system_prompt.style.display = "none";
  file_upload.style.display = "none";
  act_plan.style.display = "none";
  data?.forEach(item => {
    switch (item.type) {
      case "system-prompt":
        system_prompt.style.display = "block";
        break;
      case "file-upload":
        file_upload.style.display = "block";
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
  if (global.scroll_top.data)
    top_div.scrollTop = top_div.scrollHeight;
})

window.electronAPI.setPrompt((prompt) => {
  system_prompt.value = prompt;
})

window.electronAPI.initInfo((info) => {
  system_prompt.value = info.prompt;
  version.innerText = info.version;
  info.chats.forEach(chat => addChatItem(chat));
  if (global.seconds_timer) {
    clearInterval(global.seconds_timer);
  }
  global.seconds_timer = null;
  global.chat = info.chat;
  tokens.innerText = global.chat.tokens;
  seconds.innerText = global.chat.seconds;
})

window.electronAPI.handleClear(() => {
  loadOptions();
})

submit.addEventListener("click", () => {
  formData.query = input.value;
  formData.prompt = system_prompt.value;
  window.electronAPI.clickSubmit(formData);
  pause.style.display = "none";
  pause.innerHTML = "";
})

window.electronAPI.uploadProgress((info) => {
  switch (info.state) {
    case "start":
      progress_bar.style.width = `0%`;
      progress_container.style.display = "block";
      break;
    case "end":
      progress_bar.style.width = `100%`
      setTimeout(() => {
        progress_container.style.display = "none";
        input.value = `Upload: ${info.remotePath}\n${input.value}`;
      }, 500);
      break;
  }
})

const ai_model = document.getElementById("ai-model");
const api_url = document.getElementById("api-url");
const api_key = document.getElementById("api-key");

// 配置弹窗控制
async function showConfig() {
  document.querySelector('.config-modal').style.display = 'flex';
  const config = await window.electronAPI.getConfig();
  ai_model.innerHTML = null;
  for (const model in config.models) {
    if (config.models[model].hasOwnProperty("api_key")) {
      if (!api_url.value && !api_key.value) {
        api_url.value = config.models[model]?.api_url || null;
        api_key.value = config.models[model]?.api_key || null;
      }
      const option = createElement(`<option value="${model}">${model}</option>`);
      ai_model.appendChild(option);
    }
  }
  ai_model.addEventListener("change", (event) => {
    api_url.value = config.models[event.target.value]?.api_url || null;
    api_key.value = config.models[event.target.value]?.api_key || null;
  })

  document.getElementById('ssh-host').value = config.tool_call.ssh_config?.host || null;
  document.getElementById('ssh-port').value = config.tool_call.ssh_config?.port || null;
  document.getElementById('ssh-username').value = config.tool_call.ssh_config?.username || null;
  document.getElementById('ssh-password').value = config.tool_call.ssh_config?.password || null;
  document.getElementById('cli-prompt').value = config.plugins.cli_execute.params.cli_prompt || null;
  document.getElementById('mcp_server-biotools-url').value = config.mcp_server.biotools.url || null;
  document.getElementById('mcp_server-biotools-enabled').checked = !!config.mcp_server.biotools.enabled || null;
}

function hideConfig(event) {
  if (!event || event.target === document.querySelector('.config-modal')) {
    document.querySelector('.config-modal').style.display = 'none';
  }
}

async function saveConfig() {
  const config = await window.electronAPI.getConfig();
  const postConfig = {
    tool_call: {
      ssh_config: {
        host: document.getElementById('ssh-host').value,
        port: parseInt(document.getElementById('ssh-port').value),
        username: document.getElementById('ssh-username').value,
        password: document.getElementById('ssh-password').value
      }
    },
    plugins: {
      cli_execute: {
        params: {
          cli_prompt: document.getElementById('cli-prompt').value
        }
      }
    },
    mcp_server: {
      biotools: {
        url: document.getElementById('mcp_server-biotools-url').value,
        enabled: document.getElementById('mcp_server-biotools-enabled').checked
      }
    },
  };
  let ai_config = {
    model: document.getElementById('ai-model').value,
    api_url: document.getElementById('api-url').value,
    api_key: document.getElementById('api-key').value,
  }

  config.tool_call.ssh_config = postConfig.tool_call.ssh_config;
  config.plugins.cli_execute.params.cli_prompt = postConfig.plugins.cli_execute.params.cli_prompt;
  config.mcp_server.biotools.url = postConfig.mcp_server.biotools.url;
  config.mcp_server.biotools.enabled = postConfig.mcp_server.biotools.enabled;
  config.models[ai_config.model].api_url = ai_config.api_url;
  config.models[ai_config.model].api_key = ai_config.api_key;

  const state = await window.electronAPI.setConfig(config);

  // In a real application, you would save this to localStorage or send to a server
  console.log('State:', state);
  showLog('Configuration saved successfully!');
  hideConfig();
}

// Close modal when pressing Escape key
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    hideConfig();
  }
});

// 动态交互效果
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mouseover', () => btn.style.transform = 'translateY(-2px)');
  btn.addEventListener('mouseout', () => btn.style.transform = 'none');
});

// 侧边栏折叠
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('collapsed');
  const icon = document.querySelector('.collapse-btn i');
  icon.classList.toggle('fa-chevron-left');
  icon.classList.toggle('fa-chevron-right');
}

// 新对话
const new_item = `<div class="history-item" onclick="selectChat('@id')">
    <div class="history-text"></div>
    <div class="history-menu" onclick="showHistoryMenu(event, '@id')">
    <i class="fas fa-ellipsis-v"></i>
    <div class="history-menu-dropdown">
    <div class="history-menu-item" onclick="renameChat('@id')">
    <i class="fas fa-edit"></i> Rename
    </div>
    <div class="history-menu-item" onclick="deleteChat('@id')">
    <i class="fas fa-trash"></i> Delete
    </div>
    </div>
    </div>
    </div>`;

const history_list = document.getElementById("history-list");

function addChatItem(chat) {
  const item = createElement(new_item.replaceAll("@id", chat.id));
  item.getElementsByClassName("history-text")[0].innerText = chat.name;
  item.id = chat.id;
  history_list.appendChild(item);
}

async function newChat() {
  const chat = await window.electronAPI.newChat();
  addChatItem(chat);
  const items = history_list.getElementsByClassName("history-item");
  [...items].forEach(item_ => {
    if (item_.id == chat.id)
      item_.classList.add("active");
    else
      item_.classList.remove("active");
  });
}

// 选择聊天
async function selectChat(chatId) {
  const chat = await window.electronAPI.loadChat(chatId);
  global.chat = chat;
  tokens.innerText = global.chat.tokens;
  seconds.innerText = global.chat.seconds.toFixed(1);
  const items = history_list.getElementsByClassName("history-item");
  [...items].forEach(item_ => {
    if (item_.id == chatId)
      item_.classList.add("active");
    else
      item_.classList.remove("active");
  });
}

// 删除聊天
async function deleteChat(chatId) {
  if (confirm('Are you sure you want to delete this conversation?')) {
    await window.electronAPI.delChat(chatId);
    const items = history_list.getElementsByClassName("history-item");
    [...items].forEach(item => {
      if (item.id == chatId)
        item.remove();
    })
  }
}

// 显示历史菜单
function showHistoryMenu(event, chatId) {
  event.stopPropagation();
  const menus = document.querySelectorAll('.history-menu-dropdown');
  menus.forEach(menu => menu.style.display = 'none');

  const menu = event.currentTarget.querySelector('.history-menu-dropdown');
  menu.style.display = 'block';
  currentChatId = chatId;
}

// 添加对话框控制逻辑
let currentChatId = null;
const renameDialog = document.getElementById('renameDialog');
const renameInput = document.getElementById('renameInput');

function showDialog() {
  renameDialog.style.display = 'flex';
  renameInput.focus();
}

function hideDialog() {
  renameDialog.style.display = 'none';
  renameInput.value = '';
}

async function confirmRename() {
  const newName = renameInput.value.trim();
  if (newName) {
    // 这里调用Electron主进程或执行重命名逻辑
    console.log(`重命名对话 ${currentChatId} 为: ${newName}`);
    await window.electronAPI.renameChat({ id: currentChatId, name: newName });
    // 实际更新UI...
    const items = history_list.getElementsByClassName("history-item");
    [...items].forEach(item_ => {
      if (item_.id == currentChatId)
        item_.getElementsByClassName("history-text")[0].innerText = newName;
    });
  }
  hideDialog();
}

// 修改后的重命名函数
function renameChat(chatId) {
  currentChatId = chatId;
  showDialog();
}


// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
  if (!e.target.closest('.history-menu')) {
    document.querySelectorAll('.history-menu-dropdown').forEach(m => m.style.display = 'none');
  }
  if (!["input", "system_prompt"].includes(e.target.id)) {
    init_size();
  }
});