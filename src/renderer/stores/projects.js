import { defineStore } from 'pinia';

// SCR-02 "프로젝트 선택"의 최근 프로젝트 목록만 담당한다 (docs/04 §2).
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    recentProjects: [],
  }),
  actions: {
    async load() {
      this.recentProjects = await window.electronAPI.getRecentProjects();
    },
    async remove(path) {
      this.recentProjects = await window.electronAPI.removeRecentProject(path);
    },
  },
});
