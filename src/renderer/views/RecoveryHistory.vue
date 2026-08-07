<template>
  <div class="dashboard">
    <TopBar title="복구 히스토리">
      <template #actions>
        <button :disabled="!historyStore.entries.length" @click="confirmingClear = true">🗑 초기화</button>
      </template>
    </TopBar>

    <div class="card">
      <p v-if="!historyStore.entries.length">아직 실행된 복구가 없습니다.</p>
      <ul v-else class="scan-list">
        <li v-for="entry in historyStore.entries" :key="entry.id">
          <div class="scan-row" style="cursor: pointer" @click="toggle(entry.id)">
            <span :class="['dot', entry.ok ? 'dot-ok' : 'dot-critical']" />
            <span class="scan-label">{{ formatDate(entry.startedAt) }} · {{ projectName(entry.projectPath) }}</span>
            <span class="scan-value">{{ entry.ok ? '✅ 성공' : '⚠️ 실패' }} ({{ entry.steps.length }}단계)</span>
          </div>
          <div v-if="expanded === entry.id" class="issue-desc" style="padding: 8px 0 12px 20px">
            <p>{{ entry.summary }}</p>
            <p v-for="(step, i) in entry.steps" :key="i">
              {{ step.ok ? '✅' : '❌' }} {{ step.stepId }} — {{ step.message ?? step.error }}
            </p>
          </div>
        </li>
      </ul>
    </div>

    <ConfirmModal
      v-if="confirmingClear"
      message="복구 히스토리를 전부 초기화하시겠습니까? 되돌릴 수 없습니다."
      @confirm="onClear"
      @cancel="confirmingClear = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useHistoryStore } from '../stores/history';
import TopBar from '../components/TopBar.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

// 이 컴포넌트가 하는 일: 화면 조립만 — 행 클릭 시 단계별 상세를 펼치는 아코디언 UI (SCR-08, docs/04 §4).
const historyStore = useHistoryStore();
const expanded = ref(null);
const confirmingClear = ref(false);

onMounted(() => historyStore.load());

function toggle(id) {
  expanded.value = expanded.value === id ? null : id;
}
async function onClear() {
  confirmingClear.value = false;
  await historyStore.clear();
}
function projectName(p) {
  return p ? p.split('/').filter(Boolean).pop() : '알 수 없음';
}
function formatDate(iso) {
  return new Date(iso).toLocaleString('ko-KR');
}
</script>
