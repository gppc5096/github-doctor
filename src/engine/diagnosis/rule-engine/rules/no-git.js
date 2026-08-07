// 규칙 1: Git 미설치
function checkNoGit(items) {
  if (items.gitInstalled?.ok) return null;
  return {
    id: 'no_git', severity: 'critical',
    title: 'Git이 설치되지 않음',
    description: 'Git을 설치해야 GitHub 기능을 사용할 수 있습니다.',
    autoFixable: false, fixType: 'guide',
    action: { type: 'openUrl', label: 'Git 설치 페이지 열기', url: 'https://git-scm.com/downloads' },
  };
}

module.exports = checkNoGit;
