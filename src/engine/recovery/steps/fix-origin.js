const { git: defaultGit } = require('../../git-helper');

// 이 파일이 하는 일: origin 주소 수정만.
async function fixOrigin(ctx) {
  const { correctOrigin, projectPath, git = defaultGit } = ctx;
  // 규칙 기반 진단은 correctOrigin을 알 수 없다(§5-2 갈림길 노트) — AI가 제시하지 않으면
  // null인 채로 여기 도달할 수 있으므로 git config에 잘못된 값을 쓰지 않도록 명확히 실패한다.
  if (!correctOrigin) {
    throw new Error('fix_origin: correctOrigin이 없어 실행할 수 없습니다.');
  }
  // git()은 실패 시 null(성공 시 빈 문자열일 수 있음) — === null로만 실패를 판별한다
  // (v1.0, add-origin.js와 동일한 "확인 없이 항상 성공 반환" 버그를 여기서도 발견해 함께 수정).
  const result = git(`remote set-url origin ${correctOrigin}`, projectPath);
  if (result === null) {
    throw new Error(`fix_origin: git remote set-url 실패 — ${projectPath}가 git 저장소가 맞는지 확인하세요.`);
  }
  return { message: '원격 저장소 주소를 수정했습니다.' };
}

module.exports = fixOrigin;
