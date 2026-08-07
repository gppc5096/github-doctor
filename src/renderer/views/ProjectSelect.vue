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
          <span class="scan-label" style="flex: 0 0 auto">{{ projectName(p.path) }}</span>
          <input
            v-model="memoDrafts[p.path]"
            class="memo-input"
            placeholder="메모 추가..."
            @click.stop
            @keyup.enter="saveMemo(p.path)"
            @blur="saveMemo(p.path)"
          />
          <span class="scan-value">
            {{ timeAgo(p.lastScanAt) }} · {{ statusLabel(p) }}
            <button @click.stop="requestDelete(p.path)">삭제</button>
          </span>
        </li>
      </ul>
    </div>

    <ConfirmModal
      v-if="pendingDelete"
      :message="`'${projectName(pendingDelete)}'를 최근 프로젝트 목록에서 삭제하시겠습니까?`"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { useDiagnosisStore } from '../stores/diagnosis';
import { useProjectsStore } from '../stores/projects';
import TopBar from '../components/TopBar.vue';
import PathBar from '../components/PathBar.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

// 이 컴포넌트가 하는 일: 화면 조립 + 최근 프로젝트 클릭 시 스캔·진단 트리거만 (SCR-02, docs/04 §2).
const router = useRouter();
const scanStore = useScanStore();
const diagStore = useDiagnosisStore();
const projectsStore = useProjectsStore();

const path = ref('');
const pendingDelete = ref(null); // 삭제 확인 대기 중인 프로젝트 경로 (null이면 모달 숨김)
const memoDrafts = reactive({}); // path → 입력 중인 메모 (저장된 값과 별개로 편집 중 상태 유지)

onMounted(async () => {
  await projectsStore.load();
  syncMemoDrafts();
});

// 이미 편집 중인(로컬에만 있는) 값은 덮어쓰지 않는다 — 목록이 갱신돼도 입력하던 내용이 안 사라지게.
function syncMemoDrafts() {
  for (const p of projectsStore.recentProjects) {
    if (!(p.path in memoDrafts)) memoDrafts[p.path] = p.memo ?? '';
  }
}
function saveMemo(projectPath) {
  projectsStore.updateMemo(projectPath, memoDrafts[projectPath] ?? '');
}

function requestDelete(projectPath) {
  pendingDelete.value = projectPath;
}
function confirmDelete() {
  projectsStore.remove(pendingDelete.value);
  pendingDelete.value = null;
}

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
