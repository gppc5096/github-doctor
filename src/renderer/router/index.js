import { createRouter, createWebHashHistory } from 'vue-router';

// 나머지 SCR-02/05~10은 v0.8 이후 순차적으로 추가된다 (docs/03 §12, TODO.md 로드맵 참고).
const routes = [
  { path: '/', component: () => import('../views/Dashboard.vue') },
  { path: '/ssh', component: () => import('../views/SshManager.vue') }, // SCR-04
  { path: '/credentials', component: () => import('../views/CredentialManager.vue') }, // SCR-03 (v1.1, §16)
];

export default createRouter({
  history: createWebHashHistory(), // Electron은 Hash 모드 사용 (§6-3 주의사항)
  routes,
});
