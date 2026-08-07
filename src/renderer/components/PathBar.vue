<template>
  <div class="card path-bar">
    <div class="path-bar-label">프로젝트 경로</div>
    <template v-if="editing">
      <input
        v-model="draft"
        class="path-input"
        placeholder="예: ~/projects/housebook-app"
        @keyup.enter="confirm"
      />
      <button @click="browseFolder">📁 폴더 선택</button>
      <button @click="confirm">확인</button>
    </template>
    <template v-else>
      <span class="path-value">{{ modelValue || '경로가 선택되지 않았습니다' }}</span>
      <button @click="browseFolder">📁 폴더 선택</button>
      <button @click="startEdit">변경</button>
    </template>
    <p v-if="browseError" class="severity-critical">{{ browseError }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'confirm']);

const editing = ref(!props.modelValue);
const draft = ref(props.modelValue);
const browseError = ref('');

function startEdit() {
  draft.value = props.modelValue;
  editing.value = true;
}
function confirm() {
  if (!draft.value) return;
  emit('update:modelValue', draft.value);
  emit('confirm', draft.value);
  editing.value = false;
}

// 네이티브 Finder/탐색기 다이얼로그 (SCR-02, v1.0 추가). 사용자가 직접 폴더를 골랐으므로
// 다시 "확인"을 누르게 하지 않고 바로 확정한다 — 수동 타이핑만 Enter/확인이 필요하다.
// window.electronAPI가 없으면(일반 브라우저 탭 등) uncaught exception 대신 안내 문구를 띄운다
// (v1.0, 실제 사용 중 발견 — TODO.md 참고. App.vue의 전역 배너로도 같은 원인을 안내함).
async function browseFolder() {
  browseError.value = '';
  if (!window.electronAPI) {
    browseError.value = 'Electron API를 찾을 수 없습니다 (일반 브라우저 탭에서는 폴더 선택을 쓸 수 없습니다).';
    return;
  }
  try {
    const result = await window.electronAPI.selectFolder();
    if (result.canceled || !result.path) return;
    draft.value = result.path;
    emit('update:modelValue', result.path);
    emit('confirm', result.path);
    editing.value = false;
  } catch (e) {
    browseError.value = `폴더 선택 실패: ${e.message}`;
  }
}
</script>
