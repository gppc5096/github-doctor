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
    // 기록 실패(예: electron-store 문제)가 진단 자체를 실패로 만들면 안 된다 — "최근 프로젝트"는
    // 부가 기능이라, 실패해도 경고만 남기고 진단 결과는 정상적으로 사용자에게 돌려준다
    // (실사용 중 electron-store ESM import 버그로 이 호출이 조용히 전체 핸들러를 실패시켰던 적이
    // 있어 재발 방지 차원에서 감싼다).
    try {
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
    } catch (e) {
      console.warn('최근 프로젝트 기록 실패:', e.message);
    }
    return result;
  });
}

module.exports = { registerScanHandlers };
