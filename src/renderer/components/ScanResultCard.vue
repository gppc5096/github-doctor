<template>
  <div class="card">
    <h3>🔄 자동 스캔 결과</h3>
    <ul v-if="items" class="scan-list">
      <li v-for="row in rows" :key="row.label" class="scan-row">
        <span :class="['dot', `dot-${row.severity}`]" />
        <span class="scan-label">{{ row.label }}</span>
        <span class="scan-value">{{ row.value }}</span>
      </li>
    </ul>
    <p v-else>스캔 결과 없음</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: { type: Object, default: null },
});

// scanner.js(§4-2)의 실제 필드에 맞춘 표시 — PRD 와이어프레임의 "PAT 유효성" 항목은
// 아직 구현되지 않아 제외 (TODO.md "SSH 키 GitHub 등록 여부"와 같은 종류의 공백).
const rows = computed(() => {
  const it = props.items;
  if (!it) return [];
  const wrongCount = (it.storedCreds || []).filter((c) => c.isWrong).length;
  const dsaCount = (it.sshKeys || []).filter((k) => k.isDSA).length;
  const identity = it.sshIdentity;
  const identityRow = identity && [
    {
      label: 'SSH 인증 계정',
      value:
        identity.matches === false
          ? `${identity.authenticatedAs} (저장소 소유자 "${identity.originOwner}"와 불일치 ⚠️)`
          : (identity.authenticatedAs ?? '확인 불가'),
      severity: identity.severity,
    },
  ];
  return [
    { label: 'Git 설치', value: it.gitInstalled?.value ?? '-', severity: it.gitInstalled?.severity ?? 'ok' },
    { label: 'user.name', value: it.userName?.active ?? '미설정', severity: it.userName?.severity ?? 'ok' },
    { label: 'user.email', value: it.userEmail?.active ?? '미설정', severity: it.userEmail?.severity ?? 'ok' },
    { label: 'Credential Helper', value: it.credHelper?.value ?? '미설정', severity: it.credHelper?.severity ?? 'ok' },
    {
      label: '저장된 인증정보',
      value: wrongCount > 0 ? `${it.storedCreds.length}개 (오계정 ${wrongCount}건)` : `${(it.storedCreds || []).length}개`,
      severity: wrongCount > 0 ? 'critical' : 'ok',
    },
    {
      label: 'SSH 키',
      value: dsaCount > 0 ? `${it.sshKeys.length}개 (DSA ${dsaCount}건)` : `${(it.sshKeys || []).length}개`,
      severity: dsaCount > 0 ? 'critical' : (it.sshKeys || []).length ? 'ok' : 'warning',
    },
    {
      label: 'ssh-agent',
      value: it.sshAgent?.running ? `실행 중 (${it.sshAgent.keyCount}개)` : '미실행',
      severity: it.sshAgent?.severity ?? 'warning',
    },
    { label: 'origin remote', value: it.origin?.value ?? '미연결', severity: it.origin?.severity ?? 'warning' },
    ...(identityRow || []),
    {
      label: 'GitHub 연결',
      value: it.githubConn?.ok ? '정상' : '연결 안 됨',
      severity: it.githubConn?.severity ?? 'critical',
    },
  ];
});
</script>
