<template>
  <div class="action-bar">
    <div class="action-bar-row">
      <span class="action-status">
        {{ statusText }}
        <span v-if="status === 'error' && error && !errorIssue" class="severity-critical"> — {{ error }}</span>
      </span>
      <button v-if="status === 'running'" @click="$emit('abort')">중단</button>
      <button v-else :disabled="!canStart" @click="$emit('start')">자동 복구 계속 ▶</button>
    </div>
    <!-- v1.0: push 실패 등 원인이 분류된 경우, 뭉뚱그린 에러 문구 대신 다음 행동을 보여준다
         (진단 이슈와 같은 shape이라 IssueItem.vue를 그대로 재사용) -->
    <IssueItem v-if="status === 'error' && errorIssue" :issue="errorIssue" @rescan="$emit('rescan')" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import IssueItem from './IssueItem.vue';

const props = defineProps({
  status: { type: String, default: 'idle' }, // idle | running | done | error
  canStart: { type: Boolean, default: false },
  error: { type: String, default: '' },
  errorIssue: { type: Object, default: null },
});
defineEmits(['start', 'abort', 'rescan']);

const statusText = computed(
  () =>
    ({
      idle: '복구 대기 중',
      running: '자동 복구 진행 중...',
      done: '복구 완료 ✅',
      error: '복구 중 오류 발생 ⚠️',
    })[props.status] ?? props.status
);
</script>
