// 규칙 9 (v1.0, 2026-08-07 — 사용자가 실제 push에서 "Permission ... denied to <다른 계정>"을
// 겪은 뒤 발견한 공백): SSH로 인증되는 GitHub 계정이 origin 저장소 소유자와 다름. push하면
// 반드시 권한 거부되므로 push 실패 이전, 스캔 단계에서 미리 알려준다.
// autoFixable로 처리하지 않는다 — "맞는" 계정이 무엇인지, 저장소 접근 권한을 새로 받아야 하는지
// 다른 SSH 키를 써야 하는지는 다른 사람(저장소 소유자)의 권한 설정에 달려 있어 GitHub Doctor가
// 대신 결정할 수 없다. 항상 guide로 안내한다.
function checkWrongSshAccount(items) {
  const identity = items.sshIdentity;
  if (!identity || identity.matches !== false) return null;

  return {
    id: 'wrong_ssh_account', severity: 'critical',
    title: `SSH 인증 계정 불일치 (${identity.authenticatedAs} ≠ ${identity.originOwner})`,
    description:
      `현재 활성화된 SSH 키는 GitHub 계정 "${identity.authenticatedAs}"로 인증되는데, ` +
      `이 저장소는 "${identity.originOwner}" 소유입니다. 이 상태로 push하면 권한 거부됩니다 — ` +
      `"${identity.originOwner}" 계정이 "${identity.authenticatedAs}"에게 저장소 접근 권한을 주었는지, ` +
      `또는 "${identity.originOwner}" 계정용 SSH 키를 쓰고 있는지 확인하세요.`,
    autoFixable: false, fixType: 'guide',
    action: { type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' },
  };
}

module.exports = checkWrongSshAccount;
