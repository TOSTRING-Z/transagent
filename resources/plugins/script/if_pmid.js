const axios = require('axios');

async function jours_if(input) {
    const regex = /(.*?)\n/g;
    try {
        const processedContent = `${input.replace(/\./g, '')}\n`;
        const pubmidJudge = [...processedContent.matchAll(regex)].map(match => match[1]);

        if (!pubmidJudge.length) return "";

        const params = pubmidJudge.map(pmjab => ({ pmjab: pmjab }));
        const response = await axios.post(
            'https://api.pubmedplus.com/v1/pmjournal/impactfactor',
            params
        );

        return response.data
            .map(item => `Journal:${item.pmjab}, IF:${item.jour_if}`)
            .join('\n');

    } catch (error) {
        throw new Error(`Processing failed: ${error.message}`);
    }
}

async function pmids_if(input) {
    let url = `https://eutils.pubmedplus.com/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&retmax=100&retstart=0&id=${input}`
    const response = await axios.post(url);
    const result = response.data.result;
    const content = result.uids.map(uid => {
        return result[uid].source
    }).join("\n");
    return jours_if(content)
}

function main({input}) {
    if (input.trim().match(/^[\d,]+$/)) {
        return pmids_if(input);
    } else {
        return jours_if(input);
    }
}

module.exports = {
    main
};