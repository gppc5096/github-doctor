import { defineStore } from 'pinia';

// SCR-03 "인증정보 관리"의 PAT 저장 흐름만 담당한다 (docs/03 §16).
// 보안 원칙: 토큰 값은 이 store의 state에 절대 두지 않는다 — 호출자(컴포넌트)가 로컬 ref에만
// 담아 넘기고, IPC 왕복이 끝나면(성공/실패 무관) 그 ref를 즉시 비운다.
export const useCredentialsStore = defineStore('credentials', {
  state: () => ({
    isSaving: false,
    isSettingHelper: false,
    isDeleting: false,
    error: null,
    lastResult: null, // { ok, scopes, hasRepoScope } — 토큰 값 자체는 절대 담지 않음
  }),
  actions: {
    async saveToken(account, token) {
      this.isSaving = true;
      this.error = null;
      try {
        const result = await window.electronAPI.saveCredential(account, token);
        if (!result.ok) {
          this.error = result.error;
          return null;
        }
        this.lastResult = result;
        return result;
      } finally {
        this.isSaving = false;
      }
    },
    async setDefaultHelper() {
      this.isSettingHelper = true;
      this.error = null;
      try {
        const result = await window.electronAPI.setDefaultCredentialHelper();
        if (!result.ok) this.error = result.error;
        return result.ok;
      } finally {
        this.isSettingHelper = false;
      }
    },
    async deleteCredential(account) {
      this.isDeleting = true;
      this.error = null;
      try {
        const result = await window.electronAPI.deleteCredential(account);
        if (!result.ok) this.error = result.error;
        return result.ok;
      } finally {
        this.isDeleting = false;
      }
    },
  },
});
