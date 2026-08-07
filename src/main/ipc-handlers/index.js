const { registerScanHandlers } = require('./scan-handlers');
const { registerRecoveryHandlers } = require('./recovery-handlers');
const { registerSshHandlers } = require('./ssh-handlers');
const { registerCredentialHandlers } = require('./credential-handlers');
const { registerStoreHandlers } = require('./store-handlers');
const { registerMiscHandlers } = require('./misc-handlers');

// 이 파일이 하는 일: 관심사별 IPC 핸들러 등록 순서만 담당한다 (각 채널의 처리 로직은 개별 파일에 있음).
function setupIpcHandlers(ipcMain) {
  registerScanHandlers(ipcMain);
  registerRecoveryHandlers(ipcMain);
  registerSshHandlers(ipcMain);
  registerCredentialHandlers(ipcMain);
  registerStoreHandlers(ipcMain);
  registerMiscHandlers(ipcMain);
}

module.exports = { setupIpcHandlers };
