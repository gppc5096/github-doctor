// 이 파일이 하는 일: GitHub API 연결 가능 여부 확인만.
async function checkGithubConn(ctx, { fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn('https://api.github.com/', { signal: AbortSignal.timeout(5000) });
    ctx.items.githubConn = { ok: res.ok, status: res.status, severity: 'ok' };
  } catch {
    ctx.items.githubConn = { ok: false, status: null, severity: 'critical' };
  }
}

module.exports = checkGithubConn;
