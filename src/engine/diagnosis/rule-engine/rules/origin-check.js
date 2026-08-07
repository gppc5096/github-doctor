// 규칙 5 (no_origin) / 규칙 8 (fix_origin): origin의 두 문제 상태는 같은 조건 트리
// (origin이 있는가 → 있다면 프로토콜이 맞는가)에서 나오는 상호 배타적 결과라 한 파일에 둔다.
function checkOrigin(items, ctx) {
  // origin 없음 — 로컬 정보만으로는 목표 저장소를 전혀 알 수 없어 항상 guide.
  // 다만 사용자가 주소만 알려주면 바로 실행 가능한 명령이라(git remote add), input 액션을 붙인다
  // (v1.0, 사용자 판단 — "guide인데 다음 행동이 없다" 문제 해결. add-origin.js 참고).
  if (!items.origin?.value) {
    return {
      id: 'no_origin', severity: 'warning',
      title: '원격 저장소(origin)가 연결되지 않음',
      description: 'GitHub 저장소 주소를 등록해야 push가 가능합니다.',
      autoFixable: false, fixType: 'guide',
      action: {
        type: 'input',
        label: '연결',
        placeholder: '예: https://github.com/owner/repo.git',
        step: 'add_origin',
        contextKey: 'originUrl', // 렌더러가 입력값을 이 키로 스텝 컨텍스트에 실어 보낸다
      },
    };
  }

  // origin은 있는데 사용 가능한 인증 수단과 프로토콜이 맞지 않는 경우 (v1.0, 사용자 결정:
  // "프로토콜 불일치만 완전자동"). owner/repo는 그대로 두고 프로토콜만 기계적으로 바꾸므로
  // "어느 저장소가 맞는지" 추측이 필요 없어 안전하게 완전자동으로 처리한다.
  // (완전히 다른 저장소를 가리키는 경우는 여전히 감지하지 않는다 — 알 방법이 없음.)
  if (ctx.correctOrigin) {
    return {
      id: 'fix_origin', severity: 'warning',
      title: `origin 프로토콜 불일치 (현재 ${items.origin.protocol})`,
      description: `사용 가능한 인증 수단에 맞춰 origin 주소를 자동으로 수정합니다: ${ctx.correctOrigin}`,
      autoFixable: true, fixType: 'auto',
    };
  }

  return null;
}

module.exports = checkOrigin;
