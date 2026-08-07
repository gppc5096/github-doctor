const { runScan } = require('../../engine/scanners');
const { runDiagnose } = require('../../engine/ai-diagnosis');
const appStore = require('../../engine/app-store');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: 스캔 + 진단 IPC만.
function registerScanHandlers(ipcMain) {
  ipcMain.handle(CH.SCAN_RUN, async (event, projectPath) => {
    try {
      return await runScan(projectPath);
    } catch (e) {
      return { error: e.message };
    }
  });

  // AI 우선, 실패 시 규칙 기반 자동 폴백. 성공 시 "최근 프로젝트"에 기록한다(SCR-02, docs/04 §2-2)
  // — 스캔이 아니라 진단 완료 시점에 기록해야 이슈 개수/심각도를 함께 남길 수 있다.
  ipcMain.handle(CH.DIAGNOSE_RUN, async (event, scanResult) => {
    const result = await runDiagnose(scanResult);
    appStore.addRecentProject({
      path: scanResult.projectPath,
      lastScanAt: new Date().toISOString(),
      issueCount: result.issues.length,
      worstSeverity: result.issues.some((i) => i.severity === 'critical')
        ? 'critical'
        : result.issues.some((i) => i.severity === 'warning')
          ? 'warning'
          : 'ok',
    });
    return result;
  });
}

module.exports = { registerScanHandlers };
