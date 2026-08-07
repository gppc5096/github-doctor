const { Notification } = require('electron');

// 이 파일이 하는 일: 복구 완료 알림 띄우기만 (환경설정의 "알림" 토글, docs/04 §5-3 후속).
// Electron 내장 Notification API — OS 네이티브(macOS 알림센터 / Windows 토스트), 추가 패키지 불필요.
function notifyRecoveryDone(ok) {
  new Notification({
    title: ok ? '복구 완료 ✅' : '복구 실패 ⚠️',
    body: ok ? 'GitHub Doctor가 자동 복구를 완료했습니다.' : 'GitHub Doctor 자동 복구 중 문제가 발생했습니다.',
  }).show();
}

module.exports = { notifyRecoveryDone };
