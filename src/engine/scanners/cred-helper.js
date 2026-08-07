const { git: nodeGit } = require('../git-helper');

// 이 파일이 하는 일: credential.helper 설정 여부 확인만.
function checkCredHelper(ctx, { git = nodeGit } = {}) {
  ctx.items.credHelper = { value: git('config --global credential.helper') };
  const helper = ctx.items.credHelper.value || '';
  ctx.items.credHelper.ok = !!helper;
  ctx.items.credHelper.severity = helper ? 'ok' : 'warning';
}

module.exports = checkCredHelper;
