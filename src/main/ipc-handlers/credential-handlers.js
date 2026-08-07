const { validatePat } = require('../../engine/pat-validator');
const { storePatViaGitCredential } = require('../../engine/pat-store');
const { setDefaultCredentialHelper } = require('../../engine/cred-helper-setup');
const appStore = require('../../engine/app-store');
const adapter = require('../../adapters');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: PAT 저장 + credential.helper 설정 IPC만 (SCR-03, docs/03 §16).
function registerCredentialHandlers(ipcMain) {
  // 검증 먼저, 성공해야만 저장.
  ipcMain.handle(CH.CREDENTIAL_SAVE, async (event, { account, token }) => {
    const validation = await validatePat(token);
    if (!validation.ok) return validation;

    const stored = storePatViaGitCredential(account, token);
    if (!stored.ok) return { ok: false, error: `저장 실패: ${stored.stderr}` };

    // SSH 키가 없는 계정(PAT로만 등록)은 스캔의 candidateAccounts(SSH 키 파일명 기반)에 절대
    // 안 잡혀서, 실제로는 Keychain에 저장돼 있어도 스캔 결과에 영영 안 보일 수 있다 — 실사용
    // 중 발견. 여기 기록해두면 scanners/index.js가 SSH 후보와 합쳐서 확인 대상에 포함시킨다.
    try {
      appStore.addKnownAccount(account);
    } catch (e) {
      console.warn('알려진 계정 기록 실패:', e.message);
    }

    return { ok: true, scopes: validation.scopes, hasRepoScope: validation.hasRepoScope };
  });

  // §16-9 결정: 명시적 버튼 클릭으로만 실행(자동/조용히 설정하지 않음).
  ipcMain.handle(CH.CREDENTIAL_SET_HELPER, async () => {
    try {
      return { ok: true, ...setDefaultCredentialHelper() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // 인증정보 관리 화면의 수동 삭제 (사용자 요청). wrong_cred 자동 복구가 이미 쓰던 것과 같은
  // adapter.deleteCredential을 그대로 재사용 — 새 삭제 로직을 추가하지 않는다.
  ipcMain.handle(CH.CREDENTIAL_DELETE, async (event, account) => {
    return await adapter.deleteCredential(account);
  });
}

module.exports = { registerCredentialHandlers };
