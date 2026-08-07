<template>
  <div class="card">
    <h3>📋 자동 복구 진행 단계</h3>
    <p v-if="!steps.length">아직 복구를 시작하지 않았습니다.</p>
    <ol v-else class="recovery-timeline">
      <li v-for="(step, i) in steps" :key="step.id" :class="['timeline-item', `timeline-${step.status}`]">
        <span class="timeline-marker">{{ step.status === 'done' ? '✓' : i + 1 }}</span>
        <div>
          <div class="timeline-label">
            {{ stepLabel(step.id) }}
            <span v-if="step.status === 'running'" class="badge badge-warning">진행 중</span>
          </div>
          <div class="timeline-message">{{ step.message || stepDescription(step.id) }}</div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
defineProps({
  steps: { type: Array, default: () => [] },
});

// 스텝 id는 §15-3 step-registry.js와 정확히 일치해야 한다 (recovery/index.js 참고).
const LABELS = {
  wrong_cred: 'Keychain 인증정보 자동 삭제',
  fix_config: 'Git 사용자 정보 업데이트',
  fix_origin: '원격 저장소 주소 수정',
  gen_ssh: 'SSH 키 생성 및 GitHub 등록 안내',
  push: 'Push 자동 실행',
};
const DESCRIPTIONS = {
  wrong_cred: '이전 계정 인증정보를 삭제합니다',
  fix_config: 'user.name / user.email을 현재 계정으로 맞춥니다',
  fix_origin: 'origin 주소를 올바른 값으로 수정합니다',
  gen_ssh: 'Ed25519 키 생성 → 공개키 복사 → GitHub 등록',
  push: 'git push -u origin main 실행 및 결과 확인',
};
function stepLabel(id) {
  return LABELS[id] ?? id;
}
function stepDescription(id) {
  return DESCRIPTIONS[id] ?? '';
}
</script>
