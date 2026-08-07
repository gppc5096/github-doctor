const { git: defaultGit } = require('./git-helper');

// 이 파일이 하는 일: credential.helper가 없을 때 플랫폼 기본값으로 설정만 한다.
// PAT 저장(git credential approve)이 실제로 영속되려면 credential.helper가 있어야 하므로
// 저장 전 명시적으로(사용자가 버튼을 눌러야만) 실행되는 별도 단계로 둔다 — 다른 규칙처럼
// 조용히 대신 처리하지 않는다(credential.helper처럼 인증 방식 자체를 바꾸는 설정은 항상 명시적으로).
function setDefaultCredentialHelper({ platform = process.platform, git = defaultGit } = {}) {
  const value = platform === 'darwin' ? 'osxkeychain' : platform === 'win32' ? 'manager' : null;
  if (!value) {
    throw new Error('지원하지 않는 운영체제입니다 (macOS/Windows만 지원).');
  }

  const result = git(`config --global credential.helper ${value}`);
  if (result === null) {
    throw new Error('credential.helper 설정 실패');
  }
  return { message: `credential.helper를 "${value}"로 설정했습니다.`, value };
}

module.exports = { setDefaultCredentialHelper };
