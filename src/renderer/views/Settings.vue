<template>
  <div class="dashboard">
    <TopBar title="환경설정" />

    <div class="card">
      <h3>🤖 AI 엔진 설정</h3>
      <input v-model="apiKey" type="password" placeholder="Claude API 키 (sk-ant-...)" style="margin-right: 8px" />
      <button :disabled="!apiKey || settingsStore.isSavingKey" @click="onSaveKey">
        {{ settingsStore.isSavingKey ? '저장 중...' : '저장' }}
      </button>

      <template v-if="settingsStore.aiKeyConfigured">
        <button @click="onToggleAiEnabled">{{ aiEnabledLabel }}</button>
        <button @click="confirmingDeleteKey = true">삭제</button>
      </template>

      <p v-if="settingsStore.aiKeyConfigured && isPaused" class="severity-warning">⏸ 설정됨 (중지됨 — 규칙 기반으로만 동작 중)</p>
      <p v-else-if="settingsStore.aiKeyConfigured" class="severity-ok">✅ 설정됨</p>
      <p v-else class="severity-warning">⚠️ 미설정 (규칙 기반으로 동작 중)</p>
      <p v-if="settingsStore.error" class="severity-critical">{{ settingsStore.error }}</p>
    </div>

    <ConfirmModal
      v-if="confirmingDeleteKey"
      message="저장된 Claude API 키를 삭제하시겠습니까? 이후 진단은 규칙 기반으로만 동작합니다."
      @confirm="onDeleteKey"
      @cancel="confirmingDeleteKey = false"
    />

    <div class="card">
      <h3>🔔 알림</h3>
      <label>
        <input type="checkbox" :checked="settingsStore.settings.notificationsEnabled" @change="onToggleNotifications" />
        복구 완료 시 알림 (자동 복구가 끝나면 macOS 알림센터/Windows 토스트로 결과를 알려줍니다)
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import TopBar from '../components/TopBar.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

// 이 컴포넌트가 하는 일: 화면 조립만 (SCR-10, docs/04 §5). "언어" 항목은 이번 스코프에서 제외
// (실질적 다국어 지원은 훨씬 큰 별도 작업 — docs/04 §5-1 판단).
const settingsStore = useSettingsStore();
const apiKey = ref('');
const confirmingDeleteKey = ref(false);

onMounted(() => settingsStore.load());

const isPaused = computed(() => settingsStore.settings.aiEnabled === false);
const aiEnabledLabel = computed(() => (isPaused.value ? '▶ 재개' : '⏸ 중지'));

async function onSaveKey() {
  const ok = await settingsStore.saveAiKey(apiKey.value);
  apiKey.value = ''; // 보안 원칙: 저장 시도 직후 즉시 폐기 (성공/실패 무관, PAT와 동일 원칙)
  if (ok) await settingsStore.load();
}

function onToggleNotifications(event) {
  settingsStore.toggleNotifications(event.target.checked);
}

// "중지"/"재개" 토글 — 키는 그대로 두고 AI 사용 여부만 바꾼다.
function onToggleAiEnabled() {
  settingsStore.toggleAiEnabled(isPaused.value); // 중지 상태면 다음은 재개(true), 아니면 중지(false)
}

async function onDeleteKey() {
  confirmingDeleteKey.value = false;
  await settingsStore.deleteAiKey();
}
</script>
