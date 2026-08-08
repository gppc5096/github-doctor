<template>
  <div class="dashboard">
    <TopBar title="진단 대시보드" :badge-text="badgeText" :badge-type="badgeType">
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

// origin_choice처럼 severity:'info'인 항목은 "참고용 선택지"라 SSH/HTTPS 인증정보가 둘 다
// 있는 한 무엇을 고르든 항상 다시 나타난다(정상 동작) — 이걸 "문제"로 세면 아무리 선택해도
// 절대 "문제 없음"이 뜨지 않아 뱃지가 안 바뀌는 것처럼 보였다(2026-08-08 사용자 리포트).
// rule-engine의 problemCount 집계와 동일 기준으로 맞춘다.
const issueCount = computed(
  () => diagStore.diagnosis?.issues?.filter((i) => i.severity !== 'info').length ?? 0
);
// 진단 전엔 뱃지를 아예 숨기고, 진단 후 문제가 0건이면 "없음"을 명시적으로 보여준다 — 이전엔
// 0건일 때 뱃지를 통째로 숨겨서, 방금 해결됐는데도 아무 변화가 없어 보였다(2026-08-08 사용자 리포트).
const badgeText = computed(() => {
  if (!diagStore.diagnosis) return '';
  return issueCount.value > 0 ? `문제 ${issueCount.value}건 발견` : '발견된 문제 없음';
});
const badgeType = computed(() => (issueCount.value > 0 ? 'warning' : 'ok'));

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
