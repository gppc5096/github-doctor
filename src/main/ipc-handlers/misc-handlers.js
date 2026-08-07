const { shell, dialog, BrowserWindow } = require('electron');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: 외부 URL 열기 + 네이티브 폴더 선택 다이얼로그 IPC만.
function registerMiscHandlers(ipcMain) {
  ipcMain.handle(CH.SHELL_OPEN_URL, async (event, url) => {
    await shell.openExternal(url);
  });

  // SCR-02, v1.0 추가 — 네이티브 Finder/탐색기 다이얼로그.
  ipcMain.handle(CH.DIALOG_SELECT_FOLDER, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null };
    }
    return { canceled: false, path: result.filePaths[0] };
  });
}

module.exports = { registerMiscHandlers };
