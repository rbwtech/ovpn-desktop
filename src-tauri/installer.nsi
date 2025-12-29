!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "RBW-Tech OVPN"
!define PRODUCT_VERSION "0.2.1"
!define MAIN_BINARY "rbw-vpn-client.exe"

Name "${PRODUCT_NAME}"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
RequestExecutionLevel admin

OutFile "..\..\bundle\nsis\${PRODUCT_NAME}_${PRODUCT_VERSION}_x64-setup.exe"

!define MUI_ICON "..\..\..\..\icons\icon.ico"
!define MUI_UNICON "..\..\..\..\icons\icon.ico"
!define MUI_ABORTWARNING

; Fitur Launch Now
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_BINARY}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${PRODUCT_NAME}"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "RBW-Tech OVPN (Required)" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"

  File "..\..\${MAIN_BINARY}"
  
  SetOutPath "$INSTDIR\resources"
  File "..\..\..\..\resources\*.*"
  
  SetOutPath "$INSTDIR"
  
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_BINARY}"
  
  WriteRegStr HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${MAIN_BINARY}" "RUNASADMIN"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "RBW-Tech"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\${MAIN_BINARY}"
  
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "EstimatedSize" "$0"
SectionEnd

Section "Create Desktop Shortcut" SecDesktop
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_BINARY}"
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "The core application files."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} "Create a shortcut on your desktop."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  Delete "$INSTDIR\${MAIN_BINARY}"
  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR\resources"
  
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  RMDir "$INSTDIR"
  
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${MAIN_BINARY}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
SectionEnd