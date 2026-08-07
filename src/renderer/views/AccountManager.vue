<template>
  <div class="dashboard">
    <TopBar title="계정 관리" />

    <p v-if="!scanStore.scanResult">
      먼저 대시보드에서 프로젝트를 스캔해야 현재 계정 정보를 볼 수 있습니다.
    </p>

    <template v-else>
      <div class="card">
        <h3>👤 현재 git 계정 정보</h3>
        <ul class="scan-list">
          <li class="scan-row">
            <span :class="['dot', `dot-${userName.severity}`]" />
            <span class="scan-label">user.name (이 프로젝트)</span>
            <span class="scan-value">{{ userName.local ?? '미설정 (전역값 사용: ' + (userName.global ?? '없음') + ')' }}</span>
          </li>
          <li class="scan-row">
            <span :class="['dot', `dot-${userEmail.severity}`]" />
            <span class="scan-label">user.email (이 프로젝트)</span>
            <span class="scan-value">{{ userEmail.local ?? '미설정 (전역값 사용: ' + (userEmail.global ?? '없음') + ')' }}</span>
          </li>
        </ul>
        <p class="hint">
          push할 때 GitHub이 커밋 작성자를 판단하는 기준은 인증수단(SSH/PAT)이 아니라 이 정보입니다 —
          여기가 실제로 쓰려는 GitHub 계정과 다르면 커밋이 다른 계정 이름으로 표시됩니다.
        </p>
      </div>

      <div class="card">
        <h3>🔀 이 프로젝트의 계정 전환</h3>
        <input v-model="name" placeholder="GitHub 계정명 (예: gppc5096)" style="margin-right: 8px" />
        <input v-model="email" placeholder="해당 계정에 등록된 이메일" style="margin-right: 8px" />
        <button :disabled="!canApply" @click="onApply">
          {{ isApplying ? '적용 중...' : '이 프로젝트에 적용' }}
        </button>
        <p v-if="applyError" class="severity-critical">{{ applyError }}</p>
        <p v-if="applied" class="severity-ok">✅ 적용됐습니다. 이후 커밋부터 반영됩니다 (이미 올라간 커밋은 바뀌지 않음).</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useScanStore } from '../stores/scan';
import { useRecoveryStore } from '../stores/recovery';
import TopBar from '../components/TopBar.vue';

// 이 컴포넌트가 하는 일: 화면 조립만 — 실제 git config 변경은 이미 구현·테스트된
// fix_config 복구 스텝(fix-user-config.js)을 그대로 재사용한다(신규 엔진 로직 없음).
// "자동으로 계정 불일치를 감지"하는 건 이번 스코프가 아니다 — 수동 전환만 제공한다.
const scanStore = useScanStore();
const recoveryStore = useRecoveryStore();

const name = ref('');
const email = ref('');
const applyError = ref('');
const applied = ref(false);
const isApplying = ref(false);

const userName = computed(() => scanStore.scanResult?.items?.userName ?? {});
const userEmail = computed(() => scanStore.scanResult?.items?.userEmail ?? {});
const canApply = computed(() => name.value && email.value && !isApplying.value);

async function onApply() {
  applyError.value = '';
  applied.value = false;
  isApplying.value = true;
  try {
    await recoveryStore.runStep('fix_config', {
      targetAccount: name.value,
      targetEmail: email.value,
      projectPath: scanStore.projectPath,
    });
    applied.value = true;
    await scanStore.runScan(scanStore.projectPath); // 최신 값 반영
  } catch (e) {
    applyError.value = e.message;
  } finally {
    isApplying.value = false;
  }
}
</script>
