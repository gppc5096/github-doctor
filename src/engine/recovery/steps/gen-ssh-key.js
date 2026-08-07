const defaultAdapter = require('../../../adapters');

// 이 파일이 하는 일: SSH 키 생성만 (반자동 — UI에서 사용자가 1클릭 확인 후 호출됨).
async function genSshKey(ctx) {
  const { account, adapter = defaultAdapter, sshOptions } = ctx;
  const result = await adapter.generateSshKey(account, sshOptions);
  return { message: 'SSH 키를 생성했습니다.', ...result };
}

module.exports = genSshKey;
