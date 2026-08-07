const { git: defaultGit } = require('../../git-helper');

// 이 파일이 하는 일: origin이 아예 없을 때 사용자가 입력한 주소로 새로 등록만 한다.
// (fix-origin.js와 다른 점: fix-origin은 "이미 있는 origin의 프로토콜만 교체"하고,
// add-origin은 "origin 자체가 없어서 사용자가 직접 알려준 주소로 새로 만든다".)
async function addOrigin(ctx) {
  const { originUrl, projectPath, git = defaultGit } = ctx;
  // originUrl은 진단 시점 _context가 아니라 사용자가 화면에서 그 자리에 입력한 값이다
  // (SCR-01 no_origin 이슈의 "input" 액션 — TODO.md 참고). 값 없이는 절대 실행하지 않는다.
  if (!originUrl) {
    throw new Error('add_origin: originUrl이 없어 실행할 수 없습니다.');
  }
  // git-helper.js의 git()은 실패 시 null을 반환한다(성공 시 빈 문자열일 수 있어 falsy 체크는
  // 안 됨 — === null로만 판별). 확인 없이 항상 "성공했습니다"를 반환하던 버그를 고침
  // (v1.0, 사용자가 "진짜 실행되는지" 질문하며 발견 — projectPath가 git 저장소가 아니거나
  // origin이 이미 있으면 이 명령이 조용히 실패했었음).
  const result = git(`remote add origin ${originUrl}`, projectPath);
  if (result === null) {
    throw new Error(
      `add_origin: git remote add 실패 — ${projectPath}가 git 저장소가 아니거나 origin이 이미 등록되어 있을 수 있습니다.`
    );
  }
  return { message: `원격 저장소를 연결했습니다: ${originUrl}` };
}

module.exports = addOrigin;
