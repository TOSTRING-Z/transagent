const fs = require('fs');
const path = require('path');

module.exports = async (context) => {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'darwin') {
    // macOS 特定处理
    const plistPath = path.join(appOutDir, 'BixChat.app/Contents/Info.plist');
    let plistContent = fs.readFileSync(plistPath, 'utf8');
    plistContent = plistContent.replace(
      '',
      `
        NSRequiresAquaSystemAppearance
        `
    );
    fs.writeFileSync(plistPath, plistContent);
  }
  
  if (electronPlatformName === 'linux') {
    // Linux 特定处理
    const desktopFile = path.join(appOutDir, 'resources/bixchat.desktop');
    fs.writeFileSync(desktopFile, 
      `[Desktop Entry]
      Name=BixChat
      Comment=BixChat Application
      ...
      `);
  }
};