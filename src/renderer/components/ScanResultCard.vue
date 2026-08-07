<template>
  <div class="card">
    <h3>🔄 자동 스캔 결과</h3>
    <ul v-if="items" class="scan-list">
      <li v-for="row in rows" :key="row.label" class="scan-row">
        <span :class="['dot', `dot-${row.severity}`]" />
        <span class="scan-label">
          {{ row.label }}
          <span v-if="row.hint" class="hint-icon" tabindex="0">
            ⓘ
            <span class="hint-tooltip">{{ row.hint }}</span>
          </span>
        </span>
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
      // 자동화하지 않고 가이드만 제공 (시니어 판단, TODO.md 참고): ~/.ssh/config를 앱이 직접
      // 고치면 사용자의 다른 Host 설정을 건드릴 위험이 있어, 자동 설정 대신 안내로 대체함.
      hint: 'SSH 키 암호를 매번 입력하지 않게 해주는 백그라운드 프로그램입니다. 꺼져 있어도 push는 막히지 않습니다 — SSH 키에 암호가 없거나 HTTPS로 인증한다면 무관합니다. 편의를 위해 켜고 싶다면 터미널에서:\nssh-add --apple-use-keychain ~/.ssh/id_ed25519',
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
