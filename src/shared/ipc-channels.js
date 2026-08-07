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
};
