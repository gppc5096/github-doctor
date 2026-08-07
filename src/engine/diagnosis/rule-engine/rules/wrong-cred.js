// 규칙 2: 저장된 인증정보에 오계정 존재 (isWrong은 scanner의 stored-creds.js가 이미 계산해둔 값)
function checkWrongCred(items) {
  const wrongCreds = (items.storedCreds || []).filter((c) => c.isWrong);
  if (wrongCreds.length === 0) return null;
  return {
    id: 'wrong_cred', severity: 'critical',
    title: `Keychain에 다른 계정 토큰 잔존 (${wrongCreds.map((c) => c.account).join(', ')})`,
    description: '이전 계정 인증정보가 남아 있어 push가 막힙니다. 자동으로 삭제합니다.',
    autoFixable: true, fixType: 'auto',
  };
}

module.exports = checkWrongCred;
