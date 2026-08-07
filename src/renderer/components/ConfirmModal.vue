<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-card">
      <div class="modal-icon">⚠️</div>
      <p class="modal-message">{{ message }}</p>
      <div class="modal-actions">
        <button class="modal-cancel" @click="$emit('cancel')">취소</button>
        <button class="modal-confirm" @click="$emit('confirm')">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 이 컴포넌트가 하는 일: 확인/취소 2択 경고 모달 표시만 — 실제 동작은 호출자가 confirm/cancel
// 이벤트를 받아서 처리한다 (재사용 가능한 범용 컴포넌트, 특정 기능에 종속되지 않음).
defineProps({
  message: { type: String, required: true },
});
defineEmits(['confirm', 'cancel']);
</script>
