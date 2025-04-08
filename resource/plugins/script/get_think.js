async function main({ input }) {
    try {
        const rule = /^<think>([\s\S]*?)<\/think>/;
        const match = rule.exec(input);

        if (match) {
            return match[1]
        }
        return null;
    } catch (error) {
        console.error(error.message);
        return null;
    }
}

module.exports = {
    main
};