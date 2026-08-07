const { contextBridge, ipcRenderer } = require('electron');

// 렌더러(Vue)가 메인 프로세스와 통신하는 유일한 통로.
contextBridge.exposeInMainWorld('electronAPI', {
  scan: (projectPath) => ipcRenderer.invoke('scan:run', projectPath),
  diagnose: (scanResult) => ipcRenderer.invoke('diagnose:run', scanResult),
  recover: (plan) => ipcRenderer.invoke('recover:run', plan),
  genSshKey: (account) => ipcRenderer.invoke('ssh:generate', account),
  deleteSshKey: (keyPath) => ipcRenderer.invoke('ssh:delete', keyPath),
  readSshPublicKey: (keyPath) => ipcRenderer.invoke('ssh:readPublic', keyPath),
  openUrl: (url) => ipcRenderer.invoke('shell:openUrl', url),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  saveCredential: (account, token) => ipcRenderer.invoke('credential:save', { account, token }),
  setDefaultCredentialHelper: () => ipcRenderer.invoke('credential:setHelper'),
  deleteCredential: (account) => ipcRenderer.invoke('credential:delete', account),
  getRecentProjects: () => ipcRenderer.invoke('store:getRecentProjects'),
  removeRecentProject: (path) => ipcRenderer.invoke('store:removeRecentProject', path),
  updateRecentProjectMemo: (path, memo) => ipcRenderer.invoke('store:updateRecentProjectMemo', { path, memo }),
  getRecoveryHistory: () => ipcRenderer.invoke('store:getRecoveryHistory'),
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  updateSettings: (partial) => ipcRenderer.invoke('store:updateSettings', partial),
  saveAiKey: (key) => ipcRenderer.invoke('store:saveAiKey', key),
  getAiKeyStatus: () => ipcRenderer.invoke('store:getAiKeyStatus'),
  onProgress: (cb) => ipcRenderer.on('recover:progress', (_, data) => cb(data)),
});
