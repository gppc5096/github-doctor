import { defineStore } from 'pinia';

export const useScanStore = defineStore('scan', {
  state: () => ({
    projectPath: null,
    scanResult: null,
    isScanning: false,
    scanError: null,
  }),
  actions: {
    async runScan(projectPath) {
      this.isScanning = true;
      this.scanError = null;
      try {
        this.projectPath = projectPath;
        this.scanResult = await window.electronAPI.scan(projectPath);
      } catch (e) {
        this.scanError = e.message;
      } finally {
        this.isScanning = false;
      }
    },
  },
});
