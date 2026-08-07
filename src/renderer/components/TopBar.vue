<template>
  <div class="top-bar">
    <div class="top-bar-title">
      <span>{{ title }}</span>
      <span v-if="badgeText" :class="['badge', `badge-${badgeType}`]">{{ badgeText }}</span>
    </div>
    <div class="top-bar-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  badgeText: { type: String, default: '' },
  badgeType: { type: String, default: 'ok' }, // ok | warning | critical
});
</script>
