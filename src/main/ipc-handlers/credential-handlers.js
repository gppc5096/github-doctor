const { validatePat } = require('../../engine/pat-validator');
const { storePatViaGitCredential } = require('../../engine/pat-store');
const { setDefaultCredentialHelper } = require('../../engine/cred-helper-setup');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: PAT 저장 + credential.helper 설정 IPC만 (SCR-03, docs/03 §16).
function registerCredentialHandlers(ipcMain) {
  // 검증 먼저, 성공해야만 저장.
  ipcMain.handle(CH.CREDENTIAL_SAVE, async (event, { account, token }) => {
    const validation = await validatePat(token);
    if (!validation.ok) return validation;

    const stored = storePatViaGitCredential(account, token);
    if (!stored.ok) return { ok: false, error: `저장 실패: ${stored.stderr}` };

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
}

module.exports = { registerCredentialHandlers };
