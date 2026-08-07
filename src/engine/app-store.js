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
    realStore = new nodeElectronStore({
      defaults: { recentProjects: [], recoveryHistory: [], settings: {}, knownAccounts: [] },
    });
  }
  return realStore;
}

function addRecentProject(entry, { store } = {}) {
  const s = getStore(store);
  const all = s.get('recentProjects');
  // 재스캔으로 같은 경로 항목을 다시 추가할 때, 사용자가 적어둔 메모가 지워지면 안 된다.
  const existingMemo = all.find((p) => p.path === entry.path)?.memo ?? '';
  const list = all.filter((p) => p.path !== entry.path);
  s.set('recentProjects', [{ memo: existingMemo, ...entry }, ...list].slice(0, MAX_RECENT_PROJECTS));
}

function getRecentProjects({ store } = {}) {
  return getStore(store).get('recentProjects');
}

function removeRecentProject(path, { store } = {}) {
  const s = getStore(store);
  s.set('recentProjects', s.get('recentProjects').filter((p) => p.path !== path));
}

function updateRecentProjectMemo(path, memo, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recentProjects').map((p) => (p.path === path ? { ...p, memo } : p));
  s.set('recentProjects', list);
}

// SSH 키 파일명(id_ed25519_<account>)만으로는 PAT로만 등록한 계정을 알 수 없다 — Keychain은
// "이 서비스로 저장된 모든 계정"을 나열하는 안전한 방법이 없어서, 후보 계정을 최대한 넓혀야
// 스캔이 실제로 존재하는 계정을 놓치지 않는다 (실사용 중 발견: PAT만 등록한 계정이 스캔 결과에
// 아예 안 보이던 문제 — scanners/index.js가 이 목록을 candidateAccounts에 합쳐서 쓴다).
function addKnownAccount(account, { store } = {}) {
  const s = getStore(store);
  const list = s.get('knownAccounts') ?? [];
  if (!list.includes(account)) s.set('knownAccounts', [...list, account]);
}

function getKnownAccounts({ store } = {}) {
  return getStore(store).get('knownAccounts') ?? [];
}

function addRecoveryHistoryEntry(entry, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recoveryHistory');
  s.set('recoveryHistory', [entry, ...list].slice(0, MAX_RECOVERY_HISTORY));
}

function getRecoveryHistory({ store } = {}) {
  return getStore(store).get('recoveryHistory');
}

function clearRecoveryHistory({ store } = {}) {
  getStore(store).set('recoveryHistory', []);
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
  addRecentProject, getRecentProjects, removeRecentProject, updateRecentProjectMemo,
  addKnownAccount, getKnownAccounts,
  addRecoveryHistoryEntry, getRecoveryHistory, clearRecoveryHistory,
  getSettings, updateSettings,
};
