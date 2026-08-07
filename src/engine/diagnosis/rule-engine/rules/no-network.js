// 규칙 6: GitHub 연결 불가 — 앱이 대신 손볼 수 없는 영역이라, 재확인(재스캔) 정도가 최선.
function checkNoNetwork(items) {
  if (items.githubConn?.ok) return null;
  return {
    id: 'no_network', severity: 'critical',
    title: 'GitHub 서버에 연결할 수 없음',
    description: '인터넷 연결 또는 방화벽 설정을 확인하세요.',
    autoFixable: false, fixType: 'guide',
    action: { type: 'rescan', label: '다시 스캔' },
  };
}

module.exports = checkNoNetwork;
