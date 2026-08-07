const { run: nodeRun } = require('../git-helper');

// 이 파일이 하는 일: Git 설치 여부 확인만.
function checkGitInstall(ctx, { run = nodeRun } = {}) {
  const gitVer = run('git --version');
  ctx.items.gitInstalled = {
    ok: !!gitVer,
    value: gitVer || '미설치',
    severity: gitVer ? 'ok' : 'critical',
  };
}

module.exports = checkGitInstall;
