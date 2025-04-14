const axios = require('axios')
const cheerio = require('cheerio')
const S = require('string');

function main(params) {
    return async ({ context }) => {
        let num_results = 5;
        let text_max_len = 1000;
        let jina = "https://r.jina.ai/";
        if (params) {
            num_results = params.num_results;
            text_max_len = params.text_max_len;
            jina = params.jina;
        }

        const searchResults = []
        let page = 1
        let nextUrl = `https://www.baidu.com/s?ie=utf-8&tn=baidu&wd=${encodeURIComponent(context)}`

        while (searchResults.length < num_results) {
            const { results, nextPageUrl } = await parseBaiduPage(nextUrl, searchResults.length, num_results, text_max_len, jina)
            searchResults.push(...results)
            if (!nextPageUrl) break
            nextUrl = nextPageUrl
            page++
        }

        if (searchResults.length > 0)
            return searchResults.slice(0, num_results);
        else
            return null;
    }
}

async function parseBaiduPage(url, rankStart, num_results, text_max_len, jina) {

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        })

        const $ = cheerio.load(response.data)
        const infos = []

        $('#content_left .c-container').each((i, el) => {
            const $el = $(el)
            const title = $el.find('h3').text().trim()
            const url = $el.find('a').attr('href')
            let abstract = $el.find('.c-abstract').text().trim()

            if (!abstract) {
                abstract = $el.text()
                    .replace(title, '')
                    .replace(/\s+/g, ' ')
            }

            if (title && url) {
                infos.push({
                    rank: rankStart + i + 1,
                    title,
                    url,
                    abstract: abstract
                })
            }
        })

        const results = []
        for (const i in infos) {
            const info = infos[i];
            const dirtyText = await getText(info.url, jina);
            if (dirtyText) {
                let cleanText = S(dirtyText).collapseWhitespace().s;

                if (cleanText) {
                    results.push({
                        title: info.title,
                        abstract: info.abstract,
                        text: cleanText.slice(text_max_len)
                    })
                    rankStart++;
                }
            }

            if (rankStart >= num_results) {
                break;
            }
        }

        const nextPageUrl = $('a.n').eq(-1).attr('href')
        return {
            results,
            nextPageUrl: nextPageUrl ? new URL(nextPageUrl, 'https://www.baidu.com').href : null
        }
    } catch (error) {
        console.error('parseBaiduPage error!')
        return { results: [], nextPageUrl: null }
    }
}

async function getText(url, jina) {
    try {
        const response = await axios.get(`${jina}${url}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        })

        const $ = cheerio.load(response.data)
        let text;
        if (!!jina) {
            text = $('body').text();
        } else {
            // Clean the page before getting text
            $('script, style, noscript, iframe').remove(); // Remove useless tags
            // Extend selector to include common content containers
            const contentElements = $('p, div.article-content, section.main-text');
            text = contentElements
                .map((i, el) => {
                    // Remove unwanted child elements (such as buttons, ads, etc.)
                    $(el).find('button, .ad').remove();
                    return $(el).text().trim();
                })
                .get()
                .filter(t => t.length > 0) // Filter empty paragraphs
                .join('\n');
        }
        return text;
    } catch (error) {
        console.error('getText error!')
        return null;
    }

}

function getPrompt() {
    const prompt = `## baidu_search
Description: Perform online search
Parameters:
- context: (Required) Text to be searched, which should be keywords extracted from user input or summarized search content
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "baidu_search",
  "params": {
    "context": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};