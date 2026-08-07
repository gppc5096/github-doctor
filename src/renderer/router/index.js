import { createRouter, createWebHashHistory } from 'vue-router';

// 배포 연동(SCR-07)은 v1.5 로드맵 항목이라 이번 스코프 밖 (docs/04 §0 참고).
const routes = [
  { path: '/', component: () => import('../views/Dashboard.vue') },
  { path: '/ssh', component: () => import('../views/SshManager.vue') }, // SCR-04
  { path: '/credentials', component: () => import('../views/CredentialManager.vue') }, // SCR-03 (v1.1, §16)
  { path: '/account', component: () => import('../views/AccountManager.vue') }, // 계정 관리 (v1.1, 수동 전환)
  { path: '/projects', component: () => import('../views/ProjectSelect.vue') }, // SCR-02 (v1.1, docs/04 §2)
  { path: '/remote', component: () => import('../views/RemoteConfig.vue') }, // SCR-06 (v1.1, docs/04 §3)
  { path: '/history', component: () => import('../views/RecoveryHistory.vue') }, // SCR-08 (v1.1, docs/04 §4)
  { path: '/settings', component: () => import('../views/Settings.vue') }, // SCR-10 (v1.1, docs/04 §5)
];

export default createRouter({
  history: createWebHashHistory(), // Electron은 Hash 모드 사용 (§6-3 주의사항)
  routes,
});
