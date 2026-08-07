<template>
  <div class="dashboard">
    <TopBar
      title="진단 대시보드"
      :badge-text="issueCount ? `문제 ${issueCount}건 발견` : ''"
      badge-type="warning"
    >
      <template #actions>
        <button :disabled="scanStore.isScanning || !scanStore.projectPath" @click="rescan">🔄 재스캔</button>
        <button disabled title="아직 구현되지 않음">📄 리포트</button>
      </template>
    </TopBar>

    <PathBar v-model="scanStore.projectPath" @confirm="startScan" />

    <p v-if="scanStore.scanError" class="severity-critical">스캔 오류: {{ scanStore.scanError }}</p>

    <template v-if="scanStore.isScanning">
      <p>환경 스캔 중... (최대 10초)</p>
    </template>
    <template v-else-if="scanStore.scanResult && !scanStore.scanResult.error">
      <div class="grid">
        <ScanResultCard :items="scanStore.scanResult.items" />
        <DiagnosisCard
          :diagnosis="diagStore.diagnosis"
          :is-diagnosing="diagStore.isDiagnosing"
          :error="diagStore.diagnosisError"
          @rescan="rescan"
        />
      </div>
      <RecoverySteps :steps="recoveryStore.steps" />
      <ActionBar
        :status="recoveryStore.status"
        :can-start="!!diagStore.diagnosis?.recoveryPlan?.length"
        :error="recoveryStore.error"
        :error-issue="recoveryStore.errorGuidance"
        @start="startRecovery"
        @abort="recoveryStore.abort"
        @rescan="rescan"
      />
    </template>
    <p v-else>프로젝트 경로를 입력하고 스캔을 시작하세요.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScanStore } from '../stores/scan';
import { useDiagnosisStore } from '../stores/diagnosis';
import { useRecoveryStore } from '../stores/recovery';
import TopBar from '../components/TopBar.vue';
import PathBar from '../components/PathBar.vue';
import ScanResultCard from '../components/ScanResultCard.vue';
import DiagnosisCard from '../components/DiagnosisCard.vue';
import RecoverySteps from '../components/RecoverySteps.vue';
import ActionBar from '../components/ActionBar.vue';

const scanStore = useScanStore();
const diagStore = useDiagnosisStore();
const recoveryStore = useRecoveryStore();

const issueCount = computed(() => diagStore.diagnosis?.issues?.length ?? 0);

async function startScan(path) {
  await scanStore.runScan(path);
  if (scanStore.scanResult && !scanStore.scanResult.error) {
    await diagStore.runDiagnose(scanStore.scanResult);
  }
}
async function rescan() {
  if (scanStore.projectPath) await startScan(scanStore.projectPath);
}
async function startRecovery() {
  await recoveryStore.start(diagStore.diagnosis);
}
</script>
