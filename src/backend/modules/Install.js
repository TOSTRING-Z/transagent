const fs = require('fs');
const os = require('os');
const path = require('path');

const copyConfigFile = () => {
    const sourcePath = path.join(__dirname, '../config.json');
    const targetPath = path.join(os.homedir(), '.bixchat', 'config.json');

    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
};

const isFirstInstall = () => {
    const targetPath = path.join(os.homedir(), '.bixchat', 'config.json');
    return !fs.existsSync(targetPath);
};

function install() {

    if (isFirstInstall()) {
        copyConfigFile();
    }

}

module.exports = {
    install
};