const fs = require('fs');
const os = require('os');
const path = require('path');

const copyConfigFile = (name) => {
    // eslint-disable-next-line no-undef
    const sourcePath = path.join(__dirname, '..', name);
    const targetPath = path.join(os.homedir(), '.transagent', name);

    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
};

const isFirstInstall = (name) => {
    const targetPath = path.join(os.homedir(), '.transagent', name);
    return !fs.existsSync(targetPath);
};

function install() {

    if (isFirstInstall("config.json")) {
        copyConfigFile("config.json");
    }
    if (isFirstInstall("cli_prompt.md")) {
        copyConfigFile("cli_prompt.md");
    }
    if (isFirstInstall("extra_prompt.md")) {
        copyConfigFile("extra_prompt.md");
    }

}

module.exports = {
    install
};