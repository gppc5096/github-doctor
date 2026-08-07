const defaultAdapter = require('../../../adapters');

// 이 파일이 하는 일: 잘못된 인증정보 삭제만.
// ctx.adapter를 주입하면 테스트에서 실제 어댑터 대신 fake를 쓸 수 있다.
async function fixWrongCred(ctx) {
  const { wrongCreds = [], adapter = defaultAdapter } = ctx;
  const failed = [];
  for (const cred of wrongCreds) {
    const result = await adapter.deleteCredential(cred.account);
    // deleteCredential은 {ok, error} 형태를 반환한다 — 확인 없이 항상 성공 반환하던 버그를
    // 여기서도 발견해 함께 수정 (v1.0, add-origin.js와 같은 패턴).
    if (!result.ok) failed.push({ account: cred.account, error: result.error });
  }
  if (failed.length > 0) {
    const detail = failed.map((f) => `${f.account}(${f.error})`).join(', ');
    throw new Error(`wrong_cred: 일부 인증정보 삭제 실패 — ${detail}`);
  }
  return {
    message: `인증정보 삭제 완료: ${wrongCreds.map((c) => c.account).join(', ')}`,
  };
}

module.exports = fixWrongCred;
