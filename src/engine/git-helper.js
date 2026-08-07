const { execSync } = require('child_process');

// git 명령 실행 유틸 — 에러 시 null 반환
function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd, encoding: 'utf8', timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

// 플랫폼 독립 명령 실행
function run(cmd, cwd) {
  try {
    return execSync(cmd, {
      cwd, encoding: 'utf8', timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

// push처럼 실패 원인(stderr)까지 필요한 경우를 위한 상세 버전. git()/run()의 string|null
// 계약은 다른 모든 호출부가 이미 의존하고 있어 그대로 두고, 이 함수를 별도로 추가한다.
function gitDetailed(cmd, cwd) {
  try {
    const stdout = execSync(`git ${cmd}`, {
      cwd, encoding: 'utf8', timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, stdout, stderr: '' };
  } catch (e) {
    return { ok: false, stdout: '', stderr: (e.stderr || e.message || '').toString() };
  }
}

// run()의 상세 버전 — git 접두사 없이 임의 명령을 실행하고 exit code와 무관하게
// stdout/stderr를 그대로 돌려준다. `ssh -T git@github.com`처럼 "성공해도 exit 1"인
// 명령의 출력을 판별하려면 이 함수가 필요하다 (gitDetailed와 같은 이유로 추가).
function runDetailed(cmd, cwd) {
  try {
    const stdout = execSync(cmd, {
      cwd, encoding: 'utf8', timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, stdout, stderr: '' };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout || '').toString().trim(),
      stderr: (e.stderr || e.message || '').toString().trim(),
    };
  }
}

// stdin으로 값을 넘겨야 하는 명령(예: git credential approve)을 위한 버전.
// 비밀값을 인자/커맨드 문자열이 아니라 stdin으로만 전달하므로 프로세스 목록(ps)이나
// 에러 스택에 값이 노출되지 않는다 — 반환값도 stdout을 담지 않아 값이 되돌아올 일이 없다.
function runWithStdin(cmd, input, cwd) {
  try {
    execSync(cmd, {
      cwd, input, encoding: 'utf8', timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, stderr: (e.stderr || e.message || '').toString().trim() };
  }
}

module.exports = { git, run, gitDetailed, runDetailed, runWithStdin };
