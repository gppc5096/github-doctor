import { defineStore } from 'pinia';

// SCR-08 "복구 히스토리" 목록만 담당한다 (docs/04 §4).
export const useHistoryStore = defineStore('history', {
  state: () => ({
    entries: [],
  }),
  actions: {
    async load() {
      this.entries = await window.electronAPI.getRecoveryHistory();
    },
  },
});
