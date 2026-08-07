const { git: nodeGit } = require('../git-helper');

// 이 파일이 하는 일: origin remote 등록 여부/프로토콜 확인만.
function checkOrigin(ctx, { git = nodeGit } = {}) {
  const remote = git('remote get-url origin', ctx.projectPath);
  ctx.items.origin = {
    value: remote || null,
    protocol: remote ? (remote.startsWith('git@') ? 'SSH' : 'HTTPS') : null,
    severity: remote ? 'ok' : 'warning',
  };
}

module.exports = checkOrigin;
