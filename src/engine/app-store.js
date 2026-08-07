// electron-store v9+는 순수 ESM 패키지(package.json "type":"module")라 이 CommonJS 프로젝트에서
// plain require()로 받으면 { __esModule, default: Store } 래퍼 객체가 나온다 — .default를 명시적으로
// 꺼내야 실제 Store 클래스다. 이걸 놓치면 "nodeElectronStore is not a constructor"로 조용히
// 실패하고 최근 프로젝트/복구 히스토리 기록이 매번 저장 안 되는 문제가 된다(실사용 중 발견).
const nodeElectronStore = require('electron-store').default;

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

function removeRecentProject(path, { store } = {}) {
  const s = getStore(store);
  s.set('recentProjects', s.get('recentProjects').filter((p) => p.path !== path));
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
  addRecentProject, getRecentProjects, removeRecentProject,
  addRecoveryHistoryEntry, getRecoveryHistory,
  getSettings, updateSettings,
};
