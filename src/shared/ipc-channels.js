// IPC 채널명을 상수로 관리 — 오탈자 방지
module.exports = {
  SCAN_RUN: 'scan:run',
  DIAGNOSE_RUN: 'diagnose:run',
  RECOVER_RUN: 'recover:run',
  RECOVER_PROGRESS: 'recover:progress',
  SSH_GENERATE: 'ssh:generate',
  SSH_DELETE: 'ssh:delete',
  SSH_READ_PUBLIC: 'ssh:readPublic',
  SHELL_OPEN_URL: 'shell:openUrl',
  DIALOG_SELECT_FOLDER: 'dialog:selectFolder',
  CREDENTIAL_SAVE: 'credential:save',
  CREDENTIAL_SET_HELPER: 'credential:setHelper',
  RECENT_PROJECTS_GET: 'store:getRecentProjects',
  RECOVERY_HISTORY_GET: 'store:getRecoveryHistory',
  SETTINGS_GET: 'store:getSettings',
  SETTINGS_UPDATE: 'store:updateSettings',
  AI_KEY_SAVE: 'store:saveAiKey',
  // 키 값 자체는 절대 렌더러로 보내지 않는다 — 설정 여부만 확인 (docs/04 §5-2 보안 원칙과 동일선상)
  AI_KEY_STATUS: 'store:getAiKeyStatus',
};
