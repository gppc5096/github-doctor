// 규칙 4: DSA 키 감지
function checkDsaKey(items) {
  const dsaKeys = (items.sshKeys || []).filter((k) => k.isDSA);
  if (dsaKeys.length === 0) return null;
  return {
    id: 'dsa_key', severity: 'critical',
    title: '폐기된 DSA SSH 키 감지',
    description: 'DSA 키는 2022년 이후 GitHub에서 사용 불가. Ed25519 키를 새로 생성하세요.',
    autoFixable: false, fixType: 'semi',
    action: { type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' },
  };
}

module.exports = checkDsaKey;
