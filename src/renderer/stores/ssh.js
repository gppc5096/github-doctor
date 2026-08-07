import { defineStore } from 'pinia';

export const useSshStore = defineStore('ssh', {
  state: () => ({
    isGenerating: false,
    isBusy: false,
    error: null,
    lastGenerated: null, // { keyPath, pubKey }
  }),
  actions: {
    async generate(account) {
      this.isGenerating = true;
      this.error = null;
      try {
        this.lastGenerated = await window.electronAPI.genSshKey(account);
        return this.lastGenerated;
      } catch (e) {
        this.error = e.message;
        return null;
      } finally {
        this.isGenerating = false;
      }
    },
    async remove(keyPath) {
      this.isBusy = true;
      this.error = null;
      try {
        const result = await window.electronAPI.deleteSshKey(keyPath);
        if (!result.ok) this.error = result.error;
        return result.ok;
      } finally {
        this.isBusy = false;
      }
    },
    async copyPublicKey(keyPath) {
      const result = await window.electronAPI.readSshPublicKey(keyPath);
      if (!result.ok) {
        this.error = result.error;
        return false;
      }
      await navigator.clipboard.writeText(result.pubKey);
      return true;
    },
  },
});
