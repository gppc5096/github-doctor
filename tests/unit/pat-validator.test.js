import { describe, it, expect } from 'vitest';
import { validatePat } from '../../src/engine/pat-validator.js';

// fetchFn을 항상 fake로 주입한다 — 실제 GitHub API·실제 토큰은 절대 쓰지 않는다
// (TODO.md "개발 위임 원칙": 테스트는 항상 더미 데이터로만 진행).
function fakeResponse({ ok, status = 200, scopes = null }) {
  return {
    ok,
    status,
    headers: { get: (name) => (name === 'x-oauth-scopes' ? scopes : null) },
  };
}

describe('validatePat (GitHub API로 토큰 유효성 + repo 스코프 확인만, 저장은 하지 않음)', () => {
  it('유효한 classic 토큰이 repo 스코프를 가지면 hasRepoScope:true를 반환한다', async () => {
    const result = await validatePat('ghp_FAKE1234567890', {
      fetchFn: async () => fakeResponse({ ok: true, scopes: 'repo, read:org' }),
    });
    expect(result.ok).toBe(true);
    expect(result.hasRepoScope).toBe(true);
    expect(result.scopes).toEqual(['repo', 'read:org']);
  });

  it('유효한 토큰인데 repo 스코프가 없으면 hasRepoScope:false를 반환한다', async () => {
    const result = await validatePat('ghp_FAKE1234567890', {
      fetchFn: async () => fakeResponse({ ok: true, scopes: 'read:user' }),
    });
    expect(result.ok).toBe(true);
    expect(result.hasRepoScope).toBe(false);
  });

  it('fine-grained 토큰처럼 x-oauth-scopes 헤더가 없으면 hasRepoScope:null(판단 불가)로 관대하게 통과시킨다', async () => {
    const result = await validatePat('github_pat_FAKE1234567890', {
      fetchFn: async () => fakeResponse({ ok: true, scopes: null }),
    });
    expect(result.ok).toBe(true);
    expect(result.hasRepoScope).toBeNull();
    expect(result.scopes).toBeNull();
  });

  it('401이면 유효하지 않은 토큰으로 판정한다', async () => {
    const result = await validatePat('bad-token', {
      fetchFn: async () => fakeResponse({ ok: false, status: 401 }),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('유효하지 않');
  });

  it('401 외 오류는 상태 코드를 그대로 알려준다', async () => {
    const result = await validatePat('token', {
      fetchFn: async () => fakeResponse({ ok: false, status: 503 }),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('503');
  });
});
