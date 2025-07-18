const cheerio = require('cheerio');
const S = require('string');

async function fetchUrlContent({ url, text_max_len = 10000 }) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        $('script, style, noscript, iframe').remove();
        
        const contentElements = $('body');
        let text = contentElements.text().trim();
        
        const result = {
            url: url,
            text: S(text).collapseWhitespace().s.slice(0, text_max_len)
        };
        
        console.log('fetch_url result:', result);
        return result;
        
    } catch (error) {
        console.error('fetch_url error:', error);
        return {
            error: error.message
        };
    }
}

async function main(params) {
    try {
        const result = await fetchUrlContent(params);
        return result;
    } catch (e) {
        console.error(e);
        return {error: e.message};
    }
}

function getPrompt() {
    return `## fetch_url
Description: Fetch content from a given URL
Parameters:
- url: (Required) URL to fetch content from
- text_max_len: (Optional) Maximum length of text to return, default is 10000 characters
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "fetch_url",
  "params": {
    "url": "[value]",
    "text_max_len": "[value]"
  }
}`;
}

module.exports = {
    main,
    getPrompt
};