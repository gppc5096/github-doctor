const fs = require('fs');
const adapter = require('../../adapters');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: SSH 키 생성/삭제/공개키 읽기 IPC만 (SCR-04).
function registerSshHandlers(ipcMain) {
  ipcMain.handle(CH.SSH_GENERATE, async (event, account) => {
    return await adapter.generateSshKey(account);
  });

  ipcMain.handle(CH.SSH_DELETE, async (event, keyPath) => {
    return await adapter.deleteSshKey(keyPath);
  });

  // 비밀 정보가 아닌 공개키 파일만 읽으므로 어댑터/DI 없이 단순 fs 사용.
  ipcMain.handle(CH.SSH_READ_PUBLIC, async (event, keyPath) => {
    try {
      return { ok: true, pubKey: fs.readFileSync(`${keyPath}.pub`, 'utf8').trim() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = { registerSshHandlers };
