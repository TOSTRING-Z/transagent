!include "MUI2.nsh"

; 自定义安装页面
Page custom CustomInstallPage
Function CustomInstallPage
  !insertmacro MUI_HEADER_TEXT "安装选项" "选择安装设置"
  
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateCheckbox} 10% 20% 80% 10% "创建桌面快捷方式"
  Pop $R0
  ${NSD_SetState} $R0 ${BST_CHECKED}
  
  ${NSD_CreateCheckbox} 10% 40% 80% 10% "开机自动启动"
  Pop $R1
  
  nsDialogs::Show
FunctionEnd

; 安装后操作
Function .onInstSuccess
  ExecShell "" "$INSTDIR\bixchat.exe"
FunctionEnd