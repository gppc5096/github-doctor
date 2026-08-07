// 이 파일이 하는 일: PAT 유효성 + repo 스코프 확인만 (저장은 하지 않는다).
async function validatePat(token, { fetchFn = fetch } = {}) {
  const res = await fetchFn('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.status === 401 ? '토큰이 유효하지 않습니다.' : `GitHub API 오류 (${res.status})`,
    };
  }

  // fine-grained 토큰은 이 헤더가 아예 안 실릴 수 있음(GitHub API 알려진 한계) — 그 경우
  // hasRepoScope:null("판단 불가")로 두고 저장을 막지 않는다. classic 토큰만 정확히 판별 가능.
  const scopeHeader = res.headers.get('x-oauth-scopes');
  const scopes = scopeHeader ? scopeHeader.split(',').map((s) => s.trim()).filter(Boolean) : null;

  return { ok: true, scopes, hasRepoScope: scopes ? scopes.includes('repo') : null };
}

module.exports = { validatePat };
