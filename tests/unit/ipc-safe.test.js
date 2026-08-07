import { describe, it, expect } from 'vitest';
import { toIpcSafe } from '../../src/renderer/utils/ipc-safe.js';

// Pinia reactive(Proxy) 객체를 ipcRenderer.invoke로 보내면 구조화 복제(structured clone)가
// 실패해 "An object could not be cloned" 에러가 난다 (v1.0, 실사용 중 발견 — API 키와 무관).
// toIpcSafe는 JSON round-trip으로 순수 plain 객체를 만들어 이 문제를 막는다.

describe('toIpcSafe', () => {
  it('중첩 객체/배열을 깊은 복사한 plain 객체로 반환한다', () => {
    const original = { a: 1, b: { c: [1, 2, { d: 'x' }] } };
    const result = toIpcSafe(original);
    expect(result).toEqual(original);
    expect(result).not.toBe(original);
    expect(result.b).not.toBe(original.b);
  });

  it('Proxy로 감싼 객체도 순수 plain 객체로 변환한다 (Pinia reactive 흉내)', () => {
    const target = { items: { gitInstalled: { ok: true } } };
    const proxy = new Proxy(target, {}); // Vue reactive()의 최소 흉내
    const result = toIpcSafe(proxy);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result).toEqual(target);
  });

  it('함수나 undefined 필드는 JSON 특성상 제거된다 (직렬화 불가능한 값 방어)', () => {
    const result = toIpcSafe({ ok: true, fn: () => {}, missing: undefined });
    expect(result).toEqual({ ok: true });
  });
});
