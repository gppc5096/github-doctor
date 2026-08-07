import { defineStore } from 'pinia';
import { toIpcSafe } from '../utils/ipc-safe';

export const useDiagnosisStore = defineStore('diagnosis', {
  state: () => ({
    diagnosis: null,
    isDiagnosing: false,
    diagnosisError: null,
  }),
  actions: {
    async runDiagnose(scanResult) {
      if (!scanResult) return;
      this.isDiagnosing = true;
      this.diagnosisError = null;
      try {
        this.diagnosis = await window.electronAPI.diagnose(toIpcSafe(scanResult));
      } catch (e) {
        this.diagnosisError = e.message;
      } finally {
        this.isDiagnosing = false;
      }
    },
  },
});
