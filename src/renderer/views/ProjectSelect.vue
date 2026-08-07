<template>
  <div class="dashboard">
    <TopBar title="프로젝트 선택" />

    <PathBar v-model="path" @confirm="onSelect" />

    <div class="card">
      <h3>🕓 최근 프로젝트</h3>
      <p v-if="!projectsStore.recentProjects.length">최근 스캔한 프로젝트가 없습니다.</p>
      <ul v-else class="scan-list">
        <li
          v-for="p in projectsStore.recentProjects"
          :key="p.path"
          class="scan-row"
          style="cursor: pointer"
          @click="onSelect(p.path)"
        >
          <span :class="['dot', `dot-${dotSeverity(p.worstSeverity)}`]" />
          <span class="scan-label">{{ projectName(p.path) }}</span>
          <span class="scan-value">{{ timeAgo(p.lastScanAt) }} · {{ statusLabel(p) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { useDiagnosisStore } from '../stores/diagnosis';
import { useProjectsStore } from '../stores/projects';
import TopBar from '../components/TopBar.vue';
import PathBar from '../components/PathBar.vue';

// 이 컴포넌트가 하는 일: 화면 조립 + 최근 프로젝트 클릭 시 스캔·진단 트리거만 (SCR-02, docs/04 §2).
const router = useRouter();
const scanStore = useScanStore();
const diagStore = useDiagnosisStore();
const projectsStore = useProjectsStore();

const path = ref('');

onMounted(() => projectsStore.load());

function projectName(p) {
  return p.split('/').filter(Boolean).pop();
}
function dotSeverity(worst) {
  return worst === 'critical' ? 'critical' : worst === 'warning' ? 'warning' : 'ok';
}
function statusLabel(p) {
  if (p.worstSeverity === 'critical') return `🔴 ${p.issueCount}건`;
  if (p.worstSeverity === 'warning') return `🟡 ${p.issueCount}건`;
  return '🟢 정상';
}
function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

async function onSelect(selectedPath) {
  await scanStore.runScan(selectedPath);
  if (scanStore.scanResult && !scanStore.scanResult.error) {
    await diagStore.runDiagnose(scanStore.scanResult);
  }
  router.push('/');
}
</script>
