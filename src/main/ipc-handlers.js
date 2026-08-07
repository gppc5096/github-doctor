const { shell, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const { runScan } = require('../engine/scanners');
const { runDiagnose } = require('../engine/ai-diagnosis');
const { runRecovery } = require('../engine/recovery');
const { validatePat } = require('../engine/pat-validator');
const { storePatViaGitCredential } = require('../engine/pat-store');
const { setDefaultCredentialHelper } = require('../engine/cred-helper-setup');
const adapter = require('../adapters');
const CH = require('../shared/ipc-channels');

function setupIpcHandlers(ipcMain) {
  // ── 스캔 ───────────────────────────────────────
  ipcMain.handle(CH.SCAN_RUN, async (event, projectPath) => {
    try {
      return await runScan(projectPath);
    } catch (e) {
      return { error: e.message };
    }
  });

  // ── 진단 (AI 우선, 실패 시 규칙 기반 자동 폴백) ──
  ipcMain.handle(CH.DIAGNOSE_RUN, async (event, scanResult) => {
    return await runDiagnose(scanResult);
  });

  // ── 복구 (자동 항목만 순차 실행, push는 plan.steps에 명시된 경우만) ──
  ipcMain.handle(CH.RECOVER_RUN, async (event, plan) => {
    return await runRecovery(plan, (progress) => {
      event.sender.send(CH.RECOVER_PROGRESS, progress);
    });
  });

  // ── SSH 키 생성 ─────────────────────────────────
  ipcMain.handle(CH.SSH_GENERATE, async (event, account) => {
    return await adapter.generateSshKey(account);
  });

  // ── SSH 키 삭제 (v0.8, SCR-04) ───────────────────
  ipcMain.handle(CH.SSH_DELETE, async (event, keyPath) => {
    return await adapter.deleteSshKey(keyPath);
  });

  // ── SSH 공개키 내용 읽기 (v0.8, SCR-04 "공개키 복사" 버튼용) ──
  // 비밀 정보가 아닌 공개키 파일만 읽으므로 어댑터/DI 없이 단순 fs 사용.
  ipcMain.handle(CH.SSH_READ_PUBLIC, async (event, keyPath) => {
    try {
      return { ok: true, pubKey: fs.readFileSync(`${keyPath}.pub`, 'utf8').trim() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // ── 외부 URL ────────────────────────────────────
  ipcMain.handle(CH.SHELL_OPEN_URL, async (event, url) => {
    await shell.openExternal(url);
  });

  // ── 프로젝트 폴더 선택 (SCR-02, v1.0 추가) — 네이티브 Finder/탐색기 다이얼로그 ──
  ipcMain.handle(CH.DIALOG_SELECT_FOLDER, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null };
    }
    return { canceled: false, path: result.filePaths[0] };
  });

  // ── PAT 저장 (SCR-03, v1.1, docs/03 §16) — 검증 먼저, 성공해야만 저장 ──
  ipcMain.handle(CH.CREDENTIAL_SAVE, async (event, { account, token }) => {
    const validation = await validatePat(token);
    if (!validation.ok) return validation;

    const stored = storePatViaGitCredential(account, token);
    if (!stored.ok) return { ok: false, error: `저장 실패: ${stored.stderr}` };

    return { ok: true, scopes: validation.scopes, hasRepoScope: validation.hasRepoScope };
  });

  // ── credential.helper 플랫폼 기본값 설정 (§16-9 결정: 명시적 버튼 클릭으로만 실행) ──
  ipcMain.handle(CH.CREDENTIAL_SET_HELPER, async () => {
    try {
      return { ok: true, ...setDefaultCredentialHelper() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = { setupIpcHandlers };
