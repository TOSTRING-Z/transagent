const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const { CookieJar } = require('tough-cookie');
const he = require('he');

const TRANSLATION_API_URL = 'https://fanyi.baidu.com/v2transapi'

function decodeHtmlEntities(str) {
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
    var u = void 0,
        l = '' + String.fromCharCode(103) + String.fromCharCode(116) + String.fromCharCode(107);
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
        if ('dict_result' in result) {
            let en = result['dict_result']['simple_means']['symbols'][0]['ph_en']
            let am = result['dict_result']['simple_means']['symbols'][0]['ph_am']
            let word = result['dict_result']['simple_means']['word_means'].join(";")
            text = `UK[${en}]\nUS[${am}]\n${word}`
        }
        else {
            text = result['trans_result']['data'].map((d) => {
                return d['dst']
            }).join('\n')
        }
        return he.encode(text)
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function main({ input }) {
    try {
        let query_text = encodeURIComponent(input);
        let mode = getMode(input)
        axiosCookieJarSupport(axios);
        let cookieJar = new CookieJar();
        cookieJar.setCookie('BAIDUID=A8A82BD2F42CC6BD4E0FD54ABB746B32:FG=1', 'https://fanyi.baidu.com')
        let get = `${TRANSLATION_API_URL}?query=${query_text}`;
        let response = await axios.post(get, {
            'from': mode[0],
            'to': mode[1],
            'sign': hash(input).toString(),
            'simple_means_flag': '3',
            'token': 'f1ea842a77d73327b3124c62454b13df',
            'domain': 'common',
            'transtype': 'realtime',
        }, {
            jar: cookieJar,
            withCredentials: true,
            headers: {
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "Acs-Token": "1700305936599_1700305947508_QsNjmj7DNmX0zOg7RDbnuoXP7zjBvAzhSn7UC6bjjJc3rrtfkzn8HVT6Tc9L0wM1QvkEN0+w8yC6QmrPH2CrlHPECG+2j3knbSj66zxNn8rpqRHaoc4uon0jvBZMFzaCKCuwN9LVg9/j+zEvEmzrN4LonF6WoDLphy4YtjUxrY2gbwEnyhFh4esrEmK8Kj9+8FA+F46PLrMneOZ2OzNAuPoenb0FjChVGiEhBzt1lPvnqq1L/2ZDJNmQ4eIDl2EL+s7A5dXCUHlfqO8CTZqKTM8P6eEXOqtNnJAGoNBv7panz8aWcT1PioBbGMkdgblW4AiaI3xFHHchNYpBDCnj6whD1mrFvls6Q3qugXU7eNTGyJ2HSCSm+4MzeB4NGxQlk4Q94hKQnAoEQkDLjJAbDhIfWh0aJN6//Q8M4sPLxBBMkS9tCGN8Jg/q4vV470UbkAfB8uOIAqmhC6Z9bNJlMQ==",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Cookie": "BAIDUID=A8A82BD2F42CC6BD4E0FD54ABB746B32:FG=1; BIDUPSID=A8A82BD2F42CC6BD8FC1F08AF77FED2D; PSTM=1685279246; ZFY=2T4uPmlWboGDAuRrjvNTAFMGA9DTgwe8S3U1J2hgtJU:C; BDSFRCVID=TM4OJexroG3O1HvqS3_BesblzuweG7bTDYrEOwXPsp3LGJLVFdWiEG0Pts1-dEu-S2OOogKKLmOTHpCF_2uxOjjg8UtVJeC6EG0Ptf8g0M5; H_BDCLCKID_SF=tbIJoDK5JDD3fP36q45HMt00qxby26nJBRb9aJ5nQI5nhKIzbb5tKt0f3H50L-QtQGOnQPnlQUbmjRO206oay6O3LlO83h52aC5LKl0MLPbtehTq0RoYBUL10UnMBMni5mOnaIQc3fAKftnOM46JehL3346-35543bRTLnLy5KJYMDFlDTAaD6jXeU5eetjK2CntsJOOaCvx8DbOy4oWK441DPPDBn5DLb7d5J5bKJR0ft3NQTJD3M04K4o9-hvT-54e2p3FBUQPeM3YQft20b0yDecb0RLLLbr92b7jWhvdDq72yb3TQlRX5q79atTMfNTJ-qcH0KQpsIJM5-DWbT8IjH62btt_tb-qVITP; H_PS_PSSID=39647_39669_39664_39676_39679_39712; delPer=0; PSINO=7; BA_HECTOR=85a1a581252g800k81a505a21ilh70b1r; BDORZ=B490B5EBF6F3CD402E515D22BCDA1598; BCLID=7932411791020770096; BCLID_BFESS=7932411791020770096; BDSFRCVID_BFESS=TM4OJexroG3O1HvqS3_BesblzuweG7bTDYrEOwXPsp3LGJLVFdWiEG0Pts1-dEu-S2OOogKKLmOTHpCF_2uxOjjg8UtVJeC6EG0Ptf8g0M5; H_BDCLCKID_SF_BFESS=tbIJoDK5JDD3fP36q45HMt00qxby26nJBRb9aJ5nQI5nhKIzbb5tKt0f3H50L-QtQGOnQPnlQUbmjRO206oay6O3LlO83h52aC5LKl0MLPbtehTq0RoYBUL10UnMBMni5mOnaIQc3fAKftnOM46JehL3346-35543bRTLnLy5KJYMDFlDTAaD6jXeU5eetjK2CntsJOOaCvx8DbOy4oWK441DPPDBn5DLb7d5J5bKJR0ft3NQTJD3M04K4o9-hvT-54e2p3FBUQPeM3YQft20b0yDecb0RLLLbr92b7jWhvdDq72yb3TQlRX5q79atTMfNTJ-qcH0KQpsIJM5-DWbT8IjH62btt_tb-qVITP; APPGUIDE_10_6_9=1; Hm_lvt_64ecd82404c51e03dc91cb9e8c025574=1700305936; Hm_lpvt_64ecd82404c51e03dc91cb9e8c025574=1700305936; REALTIME_TRANS_SWITCH=1; FANYI_WORD_SWITCH=1; HISTORY_SWITCH=1; SOUND_SPD_SWITCH=1; SOUND_PREFER_SWITCH=1; ab_sr=1.0.1_YTU3ZDNjNjY2ZDAyZGVkYmQ0M2E0NTM0M2Y4ZmU4NzNjZTI0NDgxOGI5MGNhNDU4YjI5YTJiZGVmZDQxNDMwM2VjNzg3Y2MzMWUwNDk4YmU0YTU5NDI5YjZlNzMwZWY3NGI0MjA1YjY5NThkY2VhNDhmNzcyNDY3MGViZTRiYWQxMWJhM2RhN2UxZWIwMWE5ZDNlZDE3ZmEwMjFlM2Y1OA==",
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
            transformRequest: [(data, headers) => {
                let queryString = Object.keys(data).map(key => {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
                }).join('&');
                return queryString;
            }]
        });

        return decodeHtmlEntities(format(response.data));
    } catch (error) {
        console.log(error);
        return null;
    }

}

module.exports = {
    main,
};
