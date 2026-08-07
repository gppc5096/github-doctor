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
        <input v-model="inputValue" :placeholder="issue.action.placeholder" />
        <button :disabled="!inputValue || busy" @click="handleInputApply">
          {{ busy ? '처리 중...' : issue.action.label }}
        </button>
      </template>
      <template v-else-if="issue.action.type === 'choice'">
        <button v-for="opt in issue.action.options" :key="opt.value" :disabled="busy" @click="handleChoice(opt.value)">
          {{ busy ? '처리 중...' : opt.label }}
        </button>
      </template>
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
  busy.value = true;
  try {
    const { step, contextKey } = props.issue.action;
    await recoveryStore.runStep(step, {
      [contextKey]: value,
      projectPath: scanStore.projectPath,
    });
    emit('rescan'); // 상태가 바뀌었으니 다시 스캔해서 최신 결과를 보여준다
  } catch (e) {
    actionError.value = e.message;
  } finally {
    busy.value = false;
  }
}

const handleInputApply = () => applyStep(inputValue.value);
const handleChoice = (value) => applyStep(value);
</script>
