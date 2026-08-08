<template>
  <div :class="['issue-card', `issue-${issue.severity}`]">
    <div class="issue-title">
      {{ issue.title }}
      <span class="issue-tag">{{ severityLabel }}</span>
    </div>
    <div class="issue-desc">{{ issue.description }}</div>

    <div v-if="issue.action" class="issue-action">
      <button v-if="issue.action.type === 'openUrl'" @click="handleOpenUrl">
        {{ issue.action.label }}
      </button>
      <button v-else-if="issue.action.type === 'navigate'" @click="handleNavigate">
        {{ issue.action.label }}
      </button>
      <button v-else-if="issue.action.type === 'rescan'" @click="$emit('rescan')">
        {{ issue.action.label }}
      </button>
      <template v-else-if="issue.action.type === 'input'">
        <input v-model="inputValue" :placeholder="issue.action.placeholder" :disabled="busy || !!actionSuccess" />
        <button :disabled="!inputValue || busy || !!actionSuccess" @click="handleInputApply">
          {{ busy ? '처리 중...' : issue.action.label }}
        </button>
      </template>
      <template v-else-if="issue.action.type === 'choice'">
        <button
          v-for="opt in issue.action.options"
          :key="opt.value"
          :disabled="busy || !!actionSuccess"
          @click="handleChoice(opt.value)"
        >
          {{ busy ? '처리 중...' : opt.label }}
        </button>
      </template>
    </div>
    <!-- 클릭 즉시 실제로 실행되는데도 아무 피드백이 없어 "눌러도 아무 반응 없다"는 오해가
         생겼던 문제(2026-08-08, 사용자 리포트) — 재스캔으로 카드가 사라지기 전에 결과를 눈으로
         확인할 수 있게 성공 메시지를 보여준다. 자동으로 사라지게 하면 사용자가 다 읽기 전에
         지나갈 수 있어(2026-08-08 추가 요청), 사용자가 직접 닫을 때까지 유지하고 닫는 시점에
         재스캔한다. -->
    <div v-if="actionSuccess" class="action-success">
      <span class="severity-ok">✅ {{ actionSuccess }}</span>
      <button class="close-icon" aria-label="닫기" @click="dismissSuccess">✕</button>
    </div>
    <p v-if="actionError" class="severity-critical">{{ actionError }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { useRecoveryStore } from '../stores/recovery';

// 이 컴포넌트가 하는 일: 진단 이슈 하나 표시 + 그 이슈의 "다음 행동" 버튼/입력창 처리만.
// action.type별 처리는 docs 없이 여기 코드가 그대로 스펙이다 (v1.0, TODO.md 설계 참고):
//   openUrl / navigate / rescan / input / choice(v1.1, 여러 선택지 중 하나를 스텝 컨텍스트로 전달)
const props = defineProps({
  issue: { type: Object, required: true },
});
const emit = defineEmits(['rescan']);

const router = useRouter();
const scanStore = useScanStore();
const recoveryStore = useRecoveryStore();

const inputValue = ref('');
const busy = ref(false);
const actionError = ref('');
const actionSuccess = ref('');

const severityLabel = computed(
  () => ({ critical: 'Critical', warning: 'Warning', info: 'Info' })[props.issue.severity] ?? props.issue.severity
);

async function handleOpenUrl() {
  await window.electronAPI.openUrl(props.issue.action.url);
}

function handleNavigate() {
  router.push(props.issue.action.to);
}

// input/choice 둘 다 "값 하나를 스텝 컨텍스트로 넘겨 즉석 실행"이라 공통 로직을 공유한다.
async function applyStep(value) {
  actionError.value = '';
  actionSuccess.value = '';
  busy.value = true;
  try {
    const { step, contextKey } = props.issue.action;
    const result = await recoveryStore.runStep(step, {
      [contextKey]: value,
      projectPath: scanStore.projectPath,
    });
    // 재스캔하면 이 카드가 통째로 사라질 수 있어(문제가 해결되면 목록에서 빠짐), 사용자가
    // 직접 닫기 전까지는 재스캔하지 않고 결과를 그대로 유지한다(dismissSuccess 참고).
    // recoveryStore.runStep은 runRecovery()의 전체 결과({ok, results:[{stepId, message, ...}]})를
    // 그대로 반환하므로, 실행한 단일 스텝의 메시지는 results[0]에 들어있다.
    actionSuccess.value = result?.results?.[0]?.message || '적용했습니다.';
  } catch (e) {
    actionError.value = e.message;
  } finally {
    busy.value = false;
  }
}

function dismissSuccess() {
  actionSuccess.value = '';
  emit('rescan'); // 메시지를 다 확인했다는 뜻이므로 이 시점에 최신 상태로 재스캔한다
}

const handleInputApply = () => applyStep(inputValue.value);
const handleChoice = (value) => applyStep(value);
</script>
