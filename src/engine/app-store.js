const nodeElectronStore = require('electron-store');

// 이 파일이 하는 일: 최근 프로젝트/복구 히스토리 영속 저장만. 실제 electron-store는 지연
// 생성(app.getPath가 Electron 준비 후에만 동작)하고, 테스트는 반드시 fake store를 주입한다
// (PAT/API 키는 여기 저장하지 않는다 — docs/04 §1-3 보안 원칙, ai-key-store.js가 keytar로 분리).
const MAX_RECENT_PROJECTS = 20;
const MAX_RECOVERY_HISTORY = 50;

let realStore = null;
function getStore(store) {
  if (store) return store;
  if (!realStore) {
    realStore = new nodeElectronStore({ defaults: { recentProjects: [], recoveryHistory: [], settings: {} } });
  }
  return realStore;
}

function addRecentProject(entry, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recentProjects').filter((p) => p.path !== entry.path);
  s.set('recentProjects', [entry, ...list].slice(0, MAX_RECENT_PROJECTS));
}

function getRecentProjects({ store } = {}) {
  return getStore(store).get('recentProjects');
}

function addRecoveryHistoryEntry(entry, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recoveryHistory');
  s.set('recoveryHistory', [entry, ...list].slice(0, MAX_RECOVERY_HISTORY));
}

function getRecoveryHistory({ store } = {}) {
  return getStore(store).get('recoveryHistory');
}

function getSettings({ store } = {}) {
  return getStore(store).get('settings');
}

function updateSettings(partial, { store } = {}) {
  const s = getStore(store);
  s.set('settings', { ...s.get('settings'), ...partial });
  return s.get('settings');
}

module.exports = {
  addRecentProject, getRecentProjects,
  addRecoveryHistoryEntry, getRecoveryHistory,
  getSettings, updateSettings,
};
