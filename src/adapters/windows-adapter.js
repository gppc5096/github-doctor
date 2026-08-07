const nodeChildProcess = require('child_process');
const nodeKeytar = require('keytar');
const nodeFs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_TARGET = 'git:https://github.com';
const DEFAULT_SSH_DIR = path.join(os.homedir(), '.ssh');

// 모든 함수는 실제 OS 호출부(execSync/keytar/fs)를 주입받을 수 있다.
// 기본값은 실제 시스템이며, 테스트는 반드시 이 값들을 fake 함수로 교체해서 호출한다.

// Windows Credential Manager에서 GitHub 계정명 조회
// (버그 수정, docs/03 §7-3) Password가 아닌 UserName만 읽는다 —
// 계정 식별에는 토큰(PAT) 복호화가 필요 없고, 스캔 중 평문 노출을 피할 수 있다.
//
// ⚠️ 한계 (v1.0, 실제 다중 계정 환경으로 검증되지 않음 — TODO.md 참고):
// Windows Credential Manager는 target 문자열이 곧 키이므로, namespace 없이는
// `git:https://github.com` 하나만 존재할 수 있다(PRD가 지적하는 "다중 계정 namespace
// 미분리" 문제 그 자체). candidateAccounts(이 앱이 SSH 키를 만들어준 계정들)에 한해
// `git:https://<account>@github.com` 형태의 namespaced target도 함께 확인한다.
async function getStoredCredentials({ target = DEFAULT_TARGET, execSync = nodeChildProcess.execSync, candidateAccounts = [] } = {}) {
  const found = new Map();

  const checkTarget = (t) => {
    try {
      const raw = execSync(
        `powershell -Command "(Get-StoredCredential -Target '${t}').UserName"`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();
      if (raw && !found.has(raw)) found.set(raw, { account: raw, server: 'github.com', isWrong: false });
    } catch {
      // noop — 조회 실패는 "해당 target 없음"과 동일하게 취급
    }
  };

  checkTarget(target);
  for (const account of candidateAccounts) {
    checkTarget(`git:https://${account}@github.com`);
  }

  return [...found.values()];
}

// Windows Credential Manager에서 삭제
async function deleteCredential(account, { target = DEFAULT_TARGET, execSync = nodeChildProcess.execSync } = {}) {
  try {
    execSync(`cmdkey /delete:${target}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// keytar로 저장 (GCM과 호환)
async function saveCredential(account, token, { target = DEFAULT_TARGET, keytar = nodeKeytar } = {}) {
  await keytar.setPassword(target, account, token);
  return { ok: true };
}

// Ed25519 SSH 키 생성 (Windows)
async function generateSshKey(account, { sshDir = DEFAULT_SSH_DIR, execSync = nodeChildProcess.execSync, fs = nodeFs } = {}) {
  fs.mkdirSync(sshDir, { recursive: true });
  const keyPath = path.join(sshDir, `id_ed25519_${account}`);
  execSync(`ssh-keygen -t ed25519 -C "${account}" -f "${keyPath}" -N ""`, { stdio: 'pipe' });
  const pubKey = fs.readFileSync(`${keyPath}.pub`, 'utf8').trim();
  return { keyPath, pubKey };
}

// SSH 키 파일 삭제 (v0.8 추가 — SCR-04 삭제 버튼 지원, 원본 문서에는 없던 기능)
async function deleteSshKey(keyPath, { fs = nodeFs } = {}) {
  try {
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    if (fs.existsSync(`${keyPath}.pub`)) fs.unlinkSync(`${keyPath}.pub`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { getStoredCredentials, deleteCredential, saveCredential, generateSshKey, deleteSshKey };
