// 이 파일이 하는 일: git push 실패 시 stderr 문자열을 보고 원인 카테고리로 분류만 한다.
// 반환 형태는 진단 이슈(diagnosis/rule-engine)와 동일하게 맞춰서 렌더러의 IssueItem.vue가
// 그대로 재사용할 수 있게 한다 (v1.0, "권한 또는 네트워크를 확인하세요"라는 뭉뚱그린 메시지만
// 뜨던 문제 — 사용자 판단으로 원인별 안내를 추가함).
function classifyPushError(stderr = '') {
  const text = stderr || '';

  // GitHub이 SSH push를 거부할 때 "어느 계정으로 인증됐는지"를 메시지에 직접 알려주는 경우
  // (예: "ERROR: Permission to owner/repo.git denied to actual-account.") — 단순 "인증 실패"보다
  // 훨씬 구체적인 원인(계정 불일치)이라 별도 분류. 실사용 중 발견 (v1.0, 2026-08-07).
  const deniedMatch = text.match(/denied to ([^\s.]+)/i);
  if (deniedMatch) {
    const deniedAccount = deniedMatch[1];
    return {
      id: 'push_account_mismatch', severity: 'critical',
      title: `push 권한 없음 (${deniedAccount} 계정으로 인증됨)`,
      description: `현재 사용 중인 인증 수단(SSH 키 등)이 GitHub 계정 "${deniedAccount}"로 연결되는데, 이 저장소에는 그 계정의 접근 권한이 없습니다. 저장소 소유자가 맞는지, 여러 계정을 쓴다면 이 프로젝트에 맞는 SSH 키를 쓰고 있는지 확인하세요.`,
      action: { type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' },
    };
  }

  if (/authentication failed|permission denied \(publickey\)|403/i.test(text)) {
    return {
      id: 'push_auth_failed', severity: 'critical',
      title: 'push 인증 실패',
      description: '인증정보가 만료됐거나 잘못됐을 수 있습니다. 다시 스캔해서 인증 상태를 확인하세요.',
      action: { type: 'rescan', label: '다시 스캔' },
    };
  }

  if (/could not resolve host|connection timed out|failed to connect|network is unreachable/i.test(text)) {
    return {
      id: 'push_network_failed', severity: 'critical',
      title: 'push 중 네트워크 연결 실패',
      description: '인터넷 연결 또는 방화벽 설정을 확인한 뒤 다시 시도하세요.',
      action: { type: 'rescan', label: '다시 스캔' },
    };
  }

  if (/repository not found/i.test(text)) {
    return {
      id: 'push_repo_not_found', severity: 'critical',
      title: '원격 저장소를 찾을 수 없음',
      description:
        'origin 주소가 존재하지 않거나 접근 권한이 없는 저장소를 가리키고 있습니다. 저장소 주소를 확인하세요.',
    };
  }

  if (/rejected.*non-fast-forward|tip of your current branch is behind|\(fetch first\)/i.test(text)) {
    return {
      id: 'push_diverged', severity: 'warning',
      title: '원격 저장소에 로컬에 없는 변경사항이 있음',
      description:
        '원격 저장소가 로컬보다 앞서 있어 push가 거부됐습니다. 원격 변경사항을 먼저 받아온(pull/merge) 뒤 다시 시도하세요 — 자동으로 처리하면 충돌이 날 수 있어 수동 확인이 필요합니다.',
    };
  }

  if (/src refspec .* does not match any/i.test(text)) {
    return {
      id: 'push_no_commits', severity: 'warning',
      title: '커밋이 없거나 브랜치 이름이 다름',
      description:
        '첫 커밋이 없거나 현재 브랜치 이름이 main이 아닐 수 있습니다(예: master). 커밋 후 다시 시도하거나 브랜치 이름을 확인하세요.',
    };
  }

  return {
    id: 'push_unknown', severity: 'critical',
    title: 'push 실패',
    description: 'git push 실패 (원격 저장소 권한 또는 네트워크를 확인하세요)',
  };
}

module.exports = { classifyPushError };
