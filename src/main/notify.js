const { Notification } = require('electron');

// 이 파일이 하는 일: 복구 완료 알림 띄우기만 (환경설정의 "알림" 토글, docs/04 §5-3 후속).
// Electron 내장 Notification API — OS 네이티브(macOS 알림센터 / Windows 토스트), 추가 패키지 불필요.
//
// ⚠️ macOS 알려진 제약(실사용 중 발견 — "체크 후 알림이 안 보임"): 서명·공증 안 된 개발 모드
// 앱(electron .로 실행)은 시스템 설정 > 알림에 "GitHub Doctor"가 아니라 "Electron"이라는
// 이름으로 등록된다 — 거기서 알림이 꺼져 있으면 이 함수가 정상 호출돼도 아무것도 안 보인다.
// isSupported()가 false면 호출 자체를 안 하고 콘솔에 남긴다(무음 실패 대신 원인 파악 가능하게).
function notifyRecoveryDone(ok) {
  if (!Notification.isSupported()) {
    console.warn('알림 미지원 환경이라 표시하지 않음 (Notification.isSupported() === false)');
    return;
  }
  new Notification({
    title: ok ? '복구 완료 ✅' : '복구 실패 ⚠️',
    body: ok ? 'GitHub Doctor가 자동 복구를 완료했습니다.' : 'GitHub Doctor 자동 복구 중 문제가 발생했습니다.',
  }).show();
}

module.exports = { notifyRecoveryDone };
