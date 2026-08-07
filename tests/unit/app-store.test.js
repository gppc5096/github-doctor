import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRecentProject, getRecentProjects, removeRecentProject, updateRecentProjectMemo,
  addRecoveryHistoryEntry, getRecoveryHistory,
  getSettings, updateSettings,
} from '../../src/engine/app-store.js';

// electron-store를 항상 fake로 주입한다 — 실제 디스크(~/Library/Application Support/...)는
// 절대 건드리지 않는다. fake는 Map 기반의 최소 get/set만 구현한다.
function fakeStore(initial = {}) {
  const data = { recentProjects: [], recoveryHistory: [], settings: {}, ...initial };
  return { get: (key) => data[key], set: (key, value) => { data[key] = value; } };
}

describe('app-store (electron-store 래퍼, 실제 디스크 미접근)', () => {
  let store;
  beforeEach(() => { store = fakeStore(); });

  it('addRecentProject는 최신 항목을 맨 앞에 추가한다', () => {
    addRecentProject({ path: '/a', lastScanAt: 't1' }, { store });
    addRecentProject({ path: '/b', lastScanAt: 't2' }, { store });
    expect(getRecentProjects({ store }).map((p) => p.path)).toEqual(['/b', '/a']);
  });

  it('같은 경로를 다시 추가하면 중복 없이 최신 정보로 갱신된다', () => {
    addRecentProject({ path: '/a', lastScanAt: 't1', issueCount: 3 }, { store });
    addRecentProject({ path: '/a', lastScanAt: 't2', issueCount: 0 }, { store });
    const list = getRecentProjects({ store });
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ path: '/a', lastScanAt: 't2', issueCount: 0, memo: '' });
  });

  it('재스캔으로 같은 경로를 다시 추가해도 기존에 적어둔 메모는 지워지지 않는다', () => {
    addRecentProject({ path: '/a', lastScanAt: 't1' }, { store });
    updateRecentProjectMemo('/a', '주택관리를 위한 앱', { store });
    addRecentProject({ path: '/a', lastScanAt: 't2', issueCount: 1 }, { store }); // 재스캔
    expect(getRecentProjects({ store })[0].memo).toBe('주택관리를 위한 앱');
  });

  it('updateRecentProjectMemo는 해당 경로의 메모만 바꾸고 다른 필드는 그대로 둔다', () => {
    addRecentProject({ path: '/a', lastScanAt: 't1', issueCount: 2 }, { store });
    updateRecentProjectMemo('/a', '메모 내용', { store });
    const entry = getRecentProjects({ store })[0];
    expect(entry.memo).toBe('메모 내용');
    expect(entry.lastScanAt).toBe('t1');
    expect(entry.issueCount).toBe(2);
  });

  it('removeRecentProject는 해당 경로만 제거하고 나머지는 그대로 둔다', () => {
    addRecentProject({ path: '/a' }, { store });
    addRecentProject({ path: '/b' }, { store });
    removeRecentProject('/a', { store });
    expect(getRecentProjects({ store }).map((p) => p.path)).toEqual(['/b']);
  });

  it('removeRecentProject는 없는 경로를 지워도 에러 없이 목록을 그대로 둔다', () => {
    addRecentProject({ path: '/a' }, { store });
    removeRecentProject('/no-such-path', { store });
    expect(getRecentProjects({ store })).toHaveLength(1);
  });

  it('최근 프로젝트는 20개를 넘으면 오래된 것부터 잘린다', () => {
    for (let i = 0; i < 25; i++) addRecentProject({ path: `/p${i}` }, { store });
    const list = getRecentProjects({ store });
    expect(list).toHaveLength(20);
    expect(list[0].path).toBe('/p24'); // 가장 최근
    expect(list.at(-1).path).toBe('/p5'); // /p0~/p4는 잘림
  });

  it('addRecoveryHistoryEntry는 최신 항목을 맨 앞에 추가하고 50개로 제한한다', () => {
    for (let i = 0; i < 55; i++) addRecoveryHistoryEntry({ id: i }, { store });
    const list = getRecoveryHistory({ store });
    expect(list).toHaveLength(50);
    expect(list[0].id).toBe(54);
  });

  it('updateSettings는 기존 설정에 병합한다', () => {
    updateSettings({ notificationsEnabled: true }, { store });
    updateSettings({ someOtherKey: 'x' }, { store });
    expect(getSettings({ store })).toEqual({ notificationsEnabled: true, someOtherKey: 'x' });
  });
});

// 회귀 테스트 (실사용 중 발견): electron-store v9+는 순수 ESM이라 plain require()로 받으면
// { default: Store } 래퍼가 나오고, .default를 안 꺼내면 "is not a constructor"로 조용히 실패해서
// 최근 프로젝트/복구 히스토리가 매번 저장 안 되는 버그가 됐었다. 여기서만 실제 electron-store
// 모듈을 쓰되, 진짜 사용자 설정 경로(~/Library/Application Support/...)가 아니라 격리된 임시
// 디렉터리(cwd)를 써서 실제 앱 데이터는 절대 건드리지 않는다.
describe('app-store (electron-store 실제 모듈 로딩 회귀 테스트, 임시 디렉터리만 사용)', () => {
  it('require("electron-store")에서 실제로 생성 가능한 Store 클래스를 가져온다', () => {
    const Store = require('electron-store').default;
    expect(typeof Store).toBe('function');

    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-doctor-store-test-'));
    try {
      const store = new Store({ cwd: tmpDir, defaults: { recentProjects: [] } });
      store.set('recentProjects', [{ path: '/tmp/fake' }]);
      expect(store.get('recentProjects')).toEqual([{ path: '/tmp/fake' }]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
