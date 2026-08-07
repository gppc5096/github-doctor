const { runDetailed: nodeRunDetailed } = require('../git-helper');
const { parseGithubOwner } = require('../recovery-context');

// 이 파일이 하는 일: origin이 SSH일 때만, 실제로 GitHub에 인증되는 계정이 origin
// 소유자와 일치하는지 확인만 한다 (v1.0, 2026-08-07 — 사용자가 실제 push에서
// "Permission ... denied to <다른 계정>"을 겪은 뒤 발견한 공백. push 실패 이후가
// 아니라 스캔 단계에서 미리 보여주기 위해 추가).
//
// `ssh -T git@github.com`은 셸 접근을 주지 않아 성공해도 항상 종료 코드 1을 반환하지만,
// stderr에 "Hi <계정>!"이 포함된다 — 이 메시지만 읽고 판단하는 완전 읽기 전용 호출이며
// 어떤 파일도 만들거나 지우지 않는다.
async function checkSshIdentity(ctx, { runDetailed = nodeRunDetailed } = {}) {
  const origin = ctx.items.origin;
  if (!origin?.value || origin.protocol !== 'SSH') {
    ctx.items.sshIdentity = null; // HTTPS origin이거나 origin이 없으면 해당 없음
    return;
  }

  const { stdout, stderr } = runDetailed('ssh -T git@github.com');
  const match = `${stdout}\n${stderr}`.match(/Hi ([^!]+)!/);
  const authenticatedAs = match ? match[1] : null;
  const originOwner = parseGithubOwner(origin.value);
  const matches = authenticatedAs && originOwner ? authenticatedAs === originOwner : null;

  ctx.items.sshIdentity = {
    authenticatedAs,
    originOwner,
    matches,
    severity: matches === false ? 'critical' : authenticatedAs ? 'ok' : 'warning',
  };
}

module.exports = checkSshIdentity;
