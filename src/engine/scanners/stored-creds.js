const defaultAdapter = require('../../adapters');

// 이 파일이 하는 일: 저장된 인증정보 조회 + 다중 계정 충돌(isWrong) 판단만.
// (v1.0 결정: 2개 이상 계정이 저장돼 있고 그중 하나가 현재 git 사용자와 일치할 때만
// 나머지를 "잘못된 계정"으로 표시 — 애매하면 절대 표시하지 않는 보수적 규칙.)
async function checkStoredCreds(ctx, deps = {}) {
  const { getStoredCredentials = defaultAdapter.getStoredCredentials, candidateAccounts = [] } = deps;

  ctx.items.storedCreds = await getStoredCredentials({ candidateAccounts });

  const activeIdentity = ctx.items.userName?.active;
  if (ctx.items.storedCreds.length >= 2 && activeIdentity) {
    const hasMatch = ctx.items.storedCreds.some((c) => c.account === activeIdentity);
    if (hasMatch) {
      ctx.items.storedCreds = ctx.items.storedCreds.map((cred) => ({
        ...cred,
        isWrong: cred.account !== activeIdentity,
      }));
    }
  }
}

module.exports = checkStoredCreds;
