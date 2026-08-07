const { git: nodeGit } = require('../git-helper');

// 이 파일이 하는 일: user.name / user.email 확인만.
function checkUserConfig(ctx, { git = nodeGit } = {}) {
  const r = ctx.items;
  r.userName = {
    local: git('config --local user.name', ctx.projectPath),
    global: git('config --global user.name'),
  };
  r.userEmail = {
    local: git('config --local user.email', ctx.projectPath),
    global: git('config --global user.email'),
  };
  r.userName.active = r.userName.local || r.userName.global;
  r.userEmail.active = r.userEmail.local || r.userEmail.global;
  r.userName.severity = r.userName.active ? 'ok' : 'warning';
  r.userEmail.severity = r.userEmail.active ? 'ok' : 'warning';
}

module.exports = checkUserConfig;
