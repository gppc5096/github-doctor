const { run: nodeRun } = require('../git-helper');

// 이 파일이 하는 일: ssh-agent 실행 여부 확인만.
function checkSshAgent(ctx, { run = nodeRun } = {}) {
  const agentOut = run('ssh-add -l');
  ctx.items.sshAgent = {
    running: agentOut !== null,
    keyCount: agentOut ? agentOut.split('\n').length : 0,
    severity: agentOut !== null ? 'ok' : 'warning',
  };
}

module.exports = checkSshAgent;
