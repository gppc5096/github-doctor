const { runWithStdin: defaultRunWithStdin } = require('./git-helper');

// 이 파일이 하는 일: 검증된 토큰을 git credential approve로 넘기기만 한다.
// (macOS/Windows 어댑터 분기가 필요 없다 — 현재 설정된 credential.helper가 알아서
// 자신의 저장 방식대로 기록하므로, git이 push 시 찾는 곳과 항상 같은 곳에 저장됨이 보장된다.
// docs/03 §16-1 참고 — keytar로 직접 저장하면 git/기존 스캔이 못 찾는 항목이 될 수 있어 배제함.)
function storePatViaGitCredential(account, token, { runWithStdin = defaultRunWithStdin } = {}) {
  const input = `protocol=https\nhost=github.com\nusername=${account}\npassword=${token}\n\n`;
  return runWithStdin('git credential approve', input); // stdin으로만 전달 — 인자/로그에 토큰 노출 없음
}

module.exports = { storePatViaGitCredential };
