// 규칙 3: SSH 키 없음
function checkNoSsh(items) {
  if ((items.sshKeys || []).length > 0) return null;
  return {
    id: 'no_ssh', severity: 'warning',
    title: 'SSH 키가 없습니다',
    description: 'SSH 키를 생성하면 더 안전하고 편리하게 GitHub를 사용할 수 있습니다.',
    autoFixable: false, fixType: 'semi',
    action: { type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' },
  };
}

module.exports = checkNoSsh;
