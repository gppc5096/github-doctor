import { defineStore } from 'pinia';

// SCR-10 "환경설정" — 알림 토글 + Claude API 키 상태만 담당한다 (docs/04 §5).
// 보안 원칙: API 키 값 자체는 이 store에 절대 담지 않는다 — 저장 여부(boolean)만 유지한다.
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { notificationsEnabled: false },
    aiKeyConfigured: false,
    isSavingKey: false,
    error: null,
  }),
  actions: {
    async load() {
      this.settings = await window.electronAPI.getSettings();
      const status = await window.electronAPI.getAiKeyStatus();
      this.aiKeyConfigured = status.configured;
    },
    async toggleNotifications(enabled) {
      this.settings = await window.electronAPI.updateSettings({ notificationsEnabled: enabled });
    },
    async saveAiKey(key) {
      this.isSavingKey = true;
      this.error = null;
      try {
        await window.electronAPI.saveAiKey(key);
        this.aiKeyConfigured = true;
        return true;
      } catch (e) {
        this.error = e.message;
        return false;
      } finally {
        this.isSavingKey = false;
      }
    },
  },
});
