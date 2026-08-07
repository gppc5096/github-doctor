import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRecentProject, getRecentProjects,
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
    expect(list[0]).toEqual({ path: '/a', lastScanAt: 't2', issueCount: 0 });
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
