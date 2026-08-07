const { gitDetailed: defaultGitDetailed } = require('../../git-helper');
const { classifyPushError } = require('../push-error-classifier');

// 단순 string|null 계약의 fake git()을 { ok, stdout, stderr } 형태로 감싼다 — 기존 테스트가
// 주입하는 ctx.git을 그대로 재사용하면서, stderr가 없으니 분류기는 자연히 'unknown'(기존
// 범용 메시지)으로 떨어진다. 실제 실행 경로(ctx.git 미주입)만 stderr 기반 상세 분류를 받는다.
function adaptSimpleGit(simpleGit) {
  return (cmd, cwd) => {
    const result = simpleGit(cmd, cwd);
    return result === null ? { ok: false, stdout: '', stderr: '' } : { ok: true, stdout: result, stderr: '' };
  };
}

// 이 파일이 하는 일: git push 실행 + 실패 시 원인 분류만 — 복구 파이프라인의 마지막 단계.
async function runPush(ctx) {
  const { projectPath, git, gitDetailed = git ? adaptSimpleGit(git) : defaultGitDetailed } = ctx;

  const { ok, stdout, stderr } = gitDetailed('push -u origin main', projectPath);
  if (!ok) {
    const issue = classifyPushError(stderr);
    const err = new Error(issue.description);
    err.guidance = issue;
    throw err;
  }
  return { message: 'Push 성공! ✅', pushResult: stdout };
}

module.exports = runPush;
