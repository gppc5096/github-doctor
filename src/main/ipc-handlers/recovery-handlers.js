const { randomUUID } = require('crypto');
const { runRecovery } = require('../../engine/recovery');
const appStore = require('../../engine/app-store');
const { notifyRecoveryDone } = require('../notify');
const CH = require('../../shared/ipc-channels');

// 이 파일이 하는 일: 복구 실행 IPC만 (자동 항목만 순차 실행, push는 plan.steps에 명시된 경우만).
function registerRecoveryHandlers(ipcMain) {
  ipcMain.handle(CH.RECOVER_RUN, async (event, plan) => {
    const startedAt = new Date().toISOString();
    const result = await runRecovery(plan, (progress) => {
      event.sender.send(CH.RECOVER_PROGRESS, progress);
    });

    // 복구 히스토리 기록 (SCR-08, docs/04 §4-3) — steps 안 메시지는 계정명/URL 등 비민감 정보만
    // 담는다는 기존 불변식을 그대로 신뢰한다(각 스텝 파일이 지켜야 할 규칙, docs/04 §4-3 경고 참고).
    // 기록 실패가 복구 결과 자체를 사용자에게 못 돌려주는 원인이 되면 안 된다 (scan-handlers.js와
    // 동일한 이유로 감쌈 — electron-store ESM import 버그 재발 방지).
    try {
      appStore.addRecoveryHistoryEntry({
        id: randomUUID(),
        projectPath: plan.context?.projectPath ?? null,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: result.ok,
        summary: result.ok ? '전체 성공' : `${result.failedStep}에서 중단: ${result.error}`,
        steps: result.results,
      });
    } catch (e) {
      console.warn('복구 히스토리 기록 실패:', e.message);
    }

    // 환경설정의 "알림" 토글이 켜져 있으면 복구 완료 시 OS 알림을 띄운다. 알림 표시 실패가
    // 복구 결과 반환을 막으면 안 되므로 여기도 방어적으로 처리한다(위 히스토리 기록과 동일 원칙).
    try {
      if (appStore.getSettings().notificationsEnabled) {
        notifyRecoveryDone(result.ok);
      }
    } catch (e) {
      console.warn('알림 표시 실패:', e.message);
    }

    return result;
  });
}

module.exports = { registerRecoveryHandlers };
