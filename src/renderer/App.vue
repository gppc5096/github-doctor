<template>
  <div class="app-shell">
    <Sidebar />
    <main class="app-main">
      <div v-if="!hasElectronAPI" class="electron-api-banner">
        ⚠️ Electron API를 찾을 수 없습니다. 이 화면을 일반 브라우저 탭으로 열지 않았는지 확인하세요 —
        <code>npm run dev</code>는 Vite dev server만 띄웁니다. 실제 앱을 쓰려면 별도 터미널에서
        <code>NODE_ENV=development npm start</code>로 Electron 창을 띄워야 합니다.
      </div>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import { useRecoveryStore } from './stores/recovery';

// window.electronAPI는 Electron의 preload.js(contextBridge)가 주입한다 — 일반 브라우저
// 탭이나 preload 로드 실패 시에는 없다. 없을 때 uncaught exception 대신 명확히 안내한다
// (v1.0, 실제 사용 중 발견 — TODO.md 참고).
const hasElectronAPI = ref(typeof window !== 'undefined' && !!window.electronAPI);

onMounted(() => {
  if (hasElectronAPI.value) {
    useRecoveryStore().listen();
  }
});
</script>
