const { git: defaultGit } = require('../../git-helper');

// 이 파일이 하는 일: user.name / user.email 교체만. (id: fix_config)
async function fixUserConfig(ctx) {
  const { targetAccount, targetEmail, projectPath, git = defaultGit } = ctx;
  // 값이 없으면 git config에 문자열 "undefined"를 쓰는 사고를 막기 위해 명확히 실패한다
  // (v1.0, _context 작업 중 발견 — diagnosis/rule-engine은 이제 이 값을 채울 수 있을 때만
  // autoFixable로 표시하므로 정상 흐름에서는 여기 도달하지 않아야 한다).
  if (!targetAccount || !targetEmail) {
    throw new Error('fix_config: targetAccount/targetEmail이 없어 실행할 수 없습니다.');
  }
  // git()은 실패 시 null(성공 시 빈 문자열일 수 있음) — === null로만 실패를 판별한다
  // (v1.0, add-origin.js와 동일한 "확인 없이 항상 성공 반환" 버그를 여기서도 발견해 함께 수정).
  const nameResult = git(`config --local user.name "${targetAccount}"`, projectPath);
  if (nameResult === null) {
    throw new Error(`fix_config: user.name 설정 실패 — ${projectPath}가 git 저장소가 맞는지 확인하세요.`);
  }
  const emailResult = git(`config --local user.email "${targetEmail}"`, projectPath);
  if (emailResult === null) {
    throw new Error(`fix_config: user.email 설정 실패 — ${projectPath}가 git 저장소가 맞는지 확인하세요.`);
  }
  return { message: 'Git 사용자 정보를 업데이트했습니다.' };
}

module.exports = fixUserConfig;
