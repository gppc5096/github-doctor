const { run } = require('../engine/git-helper');
const nodeKeytar = require('keytar');
const nodeChildProcess = require('child_process');
const nodeFs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_SERVICE = 'github.com';
const DEFAULT_SSH_DIR = path.join(os.homedir(), '.ssh');

// 모든 함수는 실제 OS 호출부(runFn/execSync/keytar/fs)를 주입받을 수 있다.
// 기본값은 실제 시스템이며, 테스트는 반드시 이 값들을 fake 함수로 교체해서 호출한다
// (vi.mock에 의존하지 않는 이유: CJS require 체인을 vi.mock이 놓치면 실제 OS를 건드릴 수 있음).

// macOS Keychain에서 GitHub 인증정보 목록 조회.
//
// ⚠️ 한계 (v1.0, 실제 다중 계정 Keychain으로 검증되지 않음 — TODO.md 참고):
// `security find-internet-password`는 계정을 지정하지 않으면 서비스에 매칭되는 항목 중
// 하나만 반환하고, macOS API 특성상 "이 서비스로 저장된 모든 계정"을 안전하게(전체 Keychain
// 덤프 없이) 나열하는 표준 방법이 없다. 그래서 (1) 계정 미지정 조회로 1건을 찾고,
// (2) candidateAccounts(이 앱이 SSH 키를 만들어준 계정들)에 한해 `-a <account>`로 존재
// 여부만 추가 확인한다. candidateAccounts에 없는 계정이 Keychain에 더 있어도 놓칠 수 있다.
async function getStoredCredentials({ service = DEFAULT_SERVICE, runFn = run, candidateAccounts = [] } = {}) {
  const found = new Map();

  try {
    const raw = runFn(`security find-internet-password -s ${service} -g 2>&1 || true`);
    const accountMatch = raw && raw.match(/"acct"<blob>="([^"]+)"/);
    if (accountMatch) {
      found.set(accountMatch[1], { account: accountMatch[1], server: service, isWrong: false });
    }
  } catch {
    // noop — 조회 실패는 "해당 계정 없음"과 동일하게 취급
  }

  for (const account of candidateAccounts) {
    if (found.has(account)) continue;
    try {
      // -g(비밀번호 요청) 없이 존재 여부만 확인 — 불필요한 Keychain 접근 승인 팝업을 피한다.
      const raw = runFn(`security find-internet-password -a "${account}" -s ${service} 2>&1 || true`);
      if (raw && raw.includes(`"acct"<blob>="${account}"`)) {
        found.set(account, { account, server: service, isWrong: false });
      }
    } catch {
      // noop
    }
  }

  return [...found.values()];
}

// Keychain에서 GitHub 인증정보 삭제
async function deleteCredential(account, { service = DEFAULT_SERVICE, execSync = nodeChildProcess.execSync } = {}) {
  try {
    execSync(`security delete-internet-password -a "${account}" -s ${service}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    // "이미 없음"은 삭제 목표(그 계정이 Keychain에 없는 상태)가 이미 달성된 것과 같아 실패로
    // 치지 않는다 (실사용 중 발견: security find-internet-password로는 존재가 확인됐는데
    // security delete-internet-password는 "찾을 수 없음"으로 실패하는 경우가 있었음 —
    // 직전에 이미 삭제됐거나 진단이 최신 Keychain 상태를 반영하지 못한 경우로 추정).
    if (/could not be found in the keychain/i.test(e.message)) {
      return { ok: true };
    }
    return { ok: false, error: e.message };
  }
}

// Keychain에 새 인증정보 저장 (keytar 사용)
async function saveCredential(account, token, { service = DEFAULT_SERVICE, keytar = nodeKeytar } = {}) {
  await keytar.setPassword(service, account, token);
  return { ok: true };
}

// Ed25519 SSH 키 생성
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
