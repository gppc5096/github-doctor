const appStore = require('../../engine/app-store');
const { saveAiKey, getAiKey } = require('../../engine/ai-key-store');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: 최근 프로젝트/복구 히스토리/앱 설정/Claude API 키 IPC만 (docs/04).
function registerStoreHandlers(ipcMain) {
  ipcMain.handle(CH.RECENT_PROJECTS_GET, async () => appStore.getRecentProjects());
  ipcMain.handle(CH.RECENT_PROJECTS_REMOVE, async (event, path) => {
    appStore.removeRecentProject(path);
    return appStore.getRecentProjects();
  });
  ipcMain.handle(CH.RECOVERY_HISTORY_GET, async () => appStore.getRecoveryHistory());
  ipcMain.handle(CH.SETTINGS_GET, async () => appStore.getSettings());
  ipcMain.handle(CH.SETTINGS_UPDATE, async (event, partial) => appStore.updateSettings(partial));

  ipcMain.handle(CH.AI_KEY_SAVE, async (event, key) => {
    await saveAiKey(key);
    return { ok: true };
  });

  // 키 값 자체는 절대 렌더러로 보내지 않는다 — 설정 여부만 확인 (docs/04 §5-2 보안 원칙).
  ipcMain.handle(CH.AI_KEY_STATUS, async () => {
    const key = await getAiKey();
    return { configured: !!key };
  });
}

module.exports = { registerStoreHandlers };
