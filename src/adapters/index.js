const os = require('os');

// GH_DOCTOR_MOCK_ADAPTER=1이면 실제 OS 자격증명 저장소를 절대 조회하지 않는다.
// 개발 중 CLI 수동 검증용 안전장치 — 실제 배포 빌드는 이 값을 설정하지 않는다.
const isMocked = process.env.GH_DOCTOR_MOCK_ADAPTER === '1';

function getAdapter() {
  return os.platform() === 'darwin'
    ? require('./macos-adapter')
    : require('./windows-adapter');
}

// 공통 인터페이스 — 어댑터는 반드시 이 함수들을 export.
// options는 각 어댑터 함수로 그대로 전달된다 (테스트에서 fake execSync/runFn 주입용).
module.exports = {
  getStoredCredentials: (options) => (isMocked ? Promise.resolve([]) : getAdapter().getStoredCredentials(options)),
  deleteCredential: (account, options) => getAdapter().deleteCredential(account, options),
  saveCredential: (account, token, options) => getAdapter().saveCredential(account, token, options),
  generateSshKey: (account, options) => getAdapter().generateSshKey(account, options),
  deleteSshKey: (keyPath, options) => getAdapter().deleteSshKey(keyPath, options),
};
