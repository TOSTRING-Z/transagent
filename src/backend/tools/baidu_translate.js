const he = require('he');

const TRANSLATION_API_URL = 'https://fanyi.baidu.com/v2transapi'

function decodeHtmlEntities(str) {
    if (typeof str !== 'string') {
        return str;
    }
    // Decode HTML entities like &amp;, &lt;, &gt;, etc.
    return str.replace(/&#x([0-9A-F]+);/gi, function (match, hex) {
        return String.fromCharCode(parseInt(hex, 16));
    });
}


function hash(r) {
    function a(r) {
        if (Array.isArray(r)) {
            for (var o = 0, t = Array(r.length); o < r.length; o++) t[o] = r[o];
            return t
        }
        return Array.from(r)
    }

    function n(r, o) {
        for (var t = 0; t < o.length - 2; t += 3) {
            var a = o.charAt(t + 2);
            a = a >= 'a' ? a.charCodeAt(0) - 87 : Number(a),
                a = '+' === o.charAt(t + 1) ? r >>> a : r << a,
                r = '+' === o.charAt(t) ? r + a & 4294967295 : r ^ a
        }
        return r
    }

    var o = r.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    if (null === o) {
        var t = r.length;
        t > 30 && (r = '' + r.substr(0, 10) + r.substr(Math.floor(t / 2) - 5, 10) + r.substr(-10, 10))
    } else {
        for (var e = r.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), C = 0, h = e.length, f = []; h > C; C++) '' !== e[C] && f.push.apply(f, a(e[C].split(''))),
            C !== h - 1 && f.push(o[C]);
        var g = f.length;
        g > 30 && (r = f.slice(0, 10).join('') + f.slice(Math.floor(g / 2) - 5, Math.floor(g / 2) + 5).join('') + f.slice(-10).join(''))
    }
    var u = void 0;
    u = '320305.131321201';
    for (var d = u.split('.'), m = Number(d[0]) || 0, s = Number(d[1]) || 0, S = [], c = 0, v = 0; v < r.length; v++) {
        var A = r.charCodeAt(v);
        128 > A ? S[c++] = A : (2048 > A ? S[c++] = A >> 6 | 192 : (55296 === (64512 & A) && v + 1 < r.length && 56320 === (64512 & r.charCodeAt(v + 1)) ? (A = 65536 + ((1023 & A) << 10) + (1023 & r.charCodeAt(++v)), S[c++] = A >> 18 | 240, S[c++] = A >> 12 & 63 | 128) : S[c++] = A >> 12 | 224, S[c++] = A >> 6 & 63 | 128), S[c++] = 63 & A | 128)
    }
    for (var p = m, F = '' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(97) + ('' + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(54)), D = '' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(51) + ('' + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(98)) + ('' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(102)), b = 0; b < S.length; b++) p += S[b],
        p = n(p, F);
    return p = n(p, D),
        p ^= s,
        0 > p && (p = (2147483647 & p) + 2147483648),
        p %= 1000000,
        p.toString() + '.' + (p ^ m)
}

// Determine the translation method
function getMode(text) {
    return text.match('[\u4e00-\u9fa5]') ? ['zh', 'en'] : ['en', 'zh']
}

// Result parsing
function format(result) {
    try {
        let text = '';
        if ('dict_result' in result) {
            let word = result['dict_result']['simple_means']?.word_means?.join(";")
            if (word) {
                let en = result['dict_result']['simple_means']['symbols'][0]['ph_en']
                let am = result['dict_result']['simple_means']['symbols'][0]['ph_am']
                if (en) 
                    text += `UK[${en}]\n`
                if (am)
                    text += `US[${am}]\n`
                if (word)   
                    text += `${word}`
            }
        }
        if ('trans_result' in result && !text) {
            text = result['trans_result']['data'].map((d) => {
                return d['dst']
            }).join('\n')
        }
        return he.encode(text)
    } catch (error) {
        console.log(error.message);
        return null;
    }
}

async function main({ input }) {
    try {
        let mode = getMode(input)
        const sign = hash(input).toString();
        const params = new URLSearchParams();
        params.append('from', mode[0]);
        params.append('to', mode[1]);
        params.append('sign', sign);
        params.append('simple_means_flag', '3');
        params.append('token', 'f1ea842a77d73327b3124c62454b13df');
        params.append('domain', 'common');
        params.append('transtype', 'realtime');
        params.append('query', input);

        const response = await fetch(TRANSLATION_API_URL, {
            method: 'POST',
            headers: {
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Cookie": "BAIDUID=A8A82BD2F42CC6BD4E0FD54ABB746B32:FG=1",
                "Host": "fanyi.baidu.com",
                "Origin": "https://fanyi.baidu.com",
                "Pragma": "no-cache",
                "Referer": "https://fanyi.baidu.com/?aldtype=16047",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: params.toString().replaceAll('+', '%20'),
        });

        const data = await response.json();
        return decodeHtmlEntities(format(data));
    } catch (error) {
        console.log(error);
        return null;
    }

}

module.exports = {
    main,
};
