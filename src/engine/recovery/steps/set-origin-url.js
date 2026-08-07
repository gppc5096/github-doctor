const { git: defaultGit } = require('../../git-helper');

// 이 파일이 하는 일: 사용자가 입력한 임의의 주소로 origin을 등록/교체만 한다.
// add_origin(없을 때만)/fix_origin·set_origin_protocol(프로토콜만)과 달리, origin 존재 여부와
// 무관하게 사용자가 준 주소를 검증 없이 그대로 적용한다 (Remote 설정 화면 전용, docs/04 §3-2).
async function setOriginUrl(ctx) {
  const { originUrl, projectPath, git = defaultGit } = ctx;
  if (!originUrl) {
    throw new Error('set_origin_url: originUrl이 없어 실행할 수 없습니다.');
  }

  const exists = git('remote get-url origin', projectPath) !== null;
  const cmd = exists ? `remote set-url origin ${originUrl}` : `remote add origin ${originUrl}`;
  const result = git(cmd, projectPath);
  if (result === null) {
    throw new Error(`set_origin_url: git ${exists ? 'remote set-url' : 'remote add'} 실패 — ${projectPath}가 git 저장소가 맞는지 확인하세요.`);
  }
  return { message: `origin을 ${originUrl}로 설정했습니다.` };
}

module.exports = setOriginUrl;
