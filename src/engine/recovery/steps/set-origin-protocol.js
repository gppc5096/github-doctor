const { git: defaultGit } = require('../../git-helper');
const { convertOriginProtocol } = require('../../recovery-context');

// 이 파일이 하는 일: 사용자가 명시적으로 고른 프로토콜로 origin을 전환만 한다.
// fix_origin(자동 판단)과 달리 "어느 쪽이 맞는지" 추측하지 않고, 사용자가 고른 값을 그대로
// 적용한다 — SSH 키와 HTTPS 인증정보가 둘 다 있어 자동 판단이 애매한 경우를 위한 스텝 (v1.1).
async function setOriginProtocol(ctx) {
  const { desiredProtocol, projectPath, git = defaultGit } = ctx;
  if (desiredProtocol !== 'ssh' && desiredProtocol !== 'https') {
    throw new Error('set_origin_protocol: desiredProtocol은 "ssh" 또는 "https"여야 합니다.');
  }

  const currentUrl = git('remote get-url origin', projectPath);
  if (!currentUrl) {
    throw new Error('set_origin_protocol: 현재 origin을 읽을 수 없습니다.');
  }

  const newUrl = convertOriginProtocol(currentUrl, desiredProtocol);
  if (!newUrl) {
    throw new Error('set_origin_protocol: github.com 형식이 아니어서 자동 전환할 수 없습니다.');
  }

  const result = git(`remote set-url origin ${newUrl}`, projectPath);
  if (result === null) {
    throw new Error(`set_origin_protocol: git remote set-url 실패 — ${projectPath}가 git 저장소가 맞는지 확인하세요.`);
  }
  return { message: `origin을 ${desiredProtocol.toUpperCase()}로 전환했습니다: ${newUrl}` };
}

module.exports = setOriginProtocol;
