<template>
  <div class="dashboard">
    <TopBar title="환경설정" />

    <div class="card">
      <h3>🤖 AI 엔진 설정</h3>
      <input v-model="apiKey" type="password" placeholder="Claude API 키 (sk-ant-...)" style="margin-right: 8px" />
      <button :disabled="!apiKey || settingsStore.isSavingKey" @click="onSaveKey">
        {{ settingsStore.isSavingKey ? '저장 중...' : '저장' }}
      </button>
      <p v-if="settingsStore.aiKeyConfigured" class="severity-ok">✅ 설정됨</p>
      <p v-else class="severity-warning">⚠️ 미설정 (규칙 기반으로 동작 중)</p>
      <p v-if="settingsStore.error" class="severity-critical">{{ settingsStore.error }}</p>
    </div>

    <div class="card">
      <h3>🔔 알림</h3>
      <label>
        <input type="checkbox" :checked="settingsStore.settings.notificationsEnabled" @change="onToggleNotifications" />
        복구 완료 시 알림 (준비 중 — 값만 저장되고 아직 실제 알림은 뜨지 않습니다)
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import TopBar from '../components/TopBar.vue';

// 이 컴포넌트가 하는 일: 화면 조립만 (SCR-10, docs/04 §5). "언어" 항목은 이번 스코프에서 제외
// (실질적 다국어 지원은 훨씬 큰 별도 작업 — docs/04 §5-1 판단).
const settingsStore = useSettingsStore();
const apiKey = ref('');

onMounted(() => settingsStore.load());

async function onSaveKey() {
  const ok = await settingsStore.saveAiKey(apiKey.value);
  apiKey.value = ''; // 보안 원칙: 저장 시도 직후 즉시 폐기 (성공/실패 무관, PAT와 동일 원칙)
  if (ok) await settingsStore.load();
}

function onToggleNotifications(event) {
  settingsStore.toggleNotifications(event.target.checked);
}
</script>
