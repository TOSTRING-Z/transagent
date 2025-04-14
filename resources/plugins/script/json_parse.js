async function main({ input }) {
    const rule = /(\{[\s\S]*?\})/g;
    const match = rule.exec(input);

    if (match) {
        return JSON.parse(match[1]);
    }
    return null;
}

module.exports = {
    main
};