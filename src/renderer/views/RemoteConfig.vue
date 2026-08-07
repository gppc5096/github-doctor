<template>
  <div class="dashboard">
    <TopBar title="Remote 설정" />

    <p v-if="!scanStore.scanResult">
      먼저 대시보드에서 프로젝트를 스캔해야 origin 정보를 볼 수 있습니다.
    </p>

    <template v-else>
      <div class="card">
        <h3>🔀 현재 origin</h3>
        <p>{{ origin.value ?? '연결되지 않음' }} <span v-if="origin.protocol">({{ origin.protocol }})</span></p>
      </div>

      <div class="card">
        <h3>✏️ 새 주소로 변경</h3>
        <input v-model="newUrl" placeholder="예: https://github.com/owner/repo.git" style="margin-right: 8px" />
        <button :disabled="!newUrl || busy" @click="onSetUrl">{{ busy ? '적용 중...' : '적용' }}</button>
        <p class="hint">⚠️ 주소가 정확한지 확인하세요 — 되돌리려면 이 화면에서 다시 바꿔야 합니다.</p>
      </div>

      <div class="card">
        <h3>🔁 프로토콜만 전환</h3>
        <button :disabled="busy" @click="onSetProtocol('ssh')">SSH 사용</button>
        <button :disabled="busy" @click="onSetProtocol('https')">HTTPS 사용</button>
      </div>

      <p v-if="error" class="severity-critical">{{ error }}</p>
      <p v-if="success" class="severity-ok">✅ {{ success }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useScanStore } from '../stores/scan';
import { useRecoveryStore } from '../stores/recovery';
import TopBar from '../components/TopBar.vue';

// 이 컴포넌트가 하는 일: origin 관리 화면 조립만 — 실제 변경은 기존/신규 복구 스텝을 재사용한다
// (set_origin_url은 신규, set_origin_protocol은 origin_choice 이슈 카드와 동일 스텝 재사용).
const scanStore = useScanStore();
const recoveryStore = useRecoveryStore();

const newUrl = ref('');
const busy = ref(false);
const error = ref('');
const success = ref('');

const origin = computed(() => scanStore.scanResult?.items?.origin ?? {});

async function runAndRescan(stepId, extraContext) {
  error.value = '';
  success.value = '';
  busy.value = true;
  try {
    const result = await recoveryStore.runStep(stepId, { ...extraContext, projectPath: scanStore.projectPath });
    success.value = result.results?.[0]?.message ?? '적용됐습니다.';
    await scanStore.runScan(scanStore.projectPath);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function onSetUrl() {
  return runAndRescan('set_origin_url', { originUrl: newUrl.value }).then(() => { newUrl.value = ''; });
}
function onSetProtocol(desiredProtocol) {
  return runAndRescan('set_origin_protocol', { desiredProtocol });
}
</script>
