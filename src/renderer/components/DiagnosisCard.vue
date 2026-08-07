<template>
  <div class="card">
    <h3>🩺 AI 진단 결과 <span class="badge badge-ok" v-if="diagnosis">{{ sourceLabel }}</span></h3>
    <p v-if="error" class="severity-critical">진단 실패: {{ error }}</p>
    <p v-else-if="isDiagnosing">진단 중...</p>
    <p v-else-if="!diagnosis">진단 대기 중...</p>
    <template v-else>
      <p v-if="diagnosis._aiFallbackReason" class="severity-warning">
        ⚠️ AI 진단 실패 — {{ diagnosis._aiFallbackReason }} (규칙 기반으로 대체됨)
      </p>
      <p class="diagnosis-summary">{{ diagnosis.summary }}</p>
      <IssueItem v-for="issue in diagnosis.issues" :key="issue.id" :issue="issue" @rescan="$emit('rescan')" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import IssueItem from './IssueItem.vue';

const props = defineProps({
  diagnosis: { type: Object, default: null },
  isDiagnosing: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
defineEmits(['rescan']);

const sourceLabel = computed(() => (props.diagnosis?.source === 'ai' ? '✨ AI 분석' : '📐 규칙 기반'));
</script>
