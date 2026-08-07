<template>
  <div class="dashboard">
    <TopBar title="인증정보 관리" />

    <p v-if="!scanStore.scanResult">
      먼저 대시보드에서 프로젝트를 스캔해야 저장된 인증정보를 볼 수 있습니다.
    </p>

    <template v-else>
      <div class="card">
        <h3>🔑 저장된 인증정보</h3>
        <p v-if="!storedCreds.length">저장된 인증정보가 없습니다.</p>
        <ul v-else class="scan-list">
          <li v-for="cred in storedCreds" :key="cred.account" class="scan-row">
            <span class="dot dot-ok" />
            <span class="scan-label">{{ cred.account }} ({{ cred.server }})</span>
            <button @click="pendingDelete = cred.account">삭제</button>
          </li>
        </ul>
      </div>

      <ConfirmModal
        v-if="pendingDelete"
        :message="`'${pendingDelete}' 인증정보를 삭제하시겠습니까? push 시 이 계정을 더 이상 쓸 수 없게 됩니다.`"
        @confirm="onConfirmDelete"
        @cancel="pendingDelete = null"
      />

      <div v-if="!credHelperOk" class="card">
        <h3>⚠️ credential.helper 미설정</h3>
        <p>토큰을 저장하려면 먼저 credential.helper가 설정돼 있어야 합니다.</p>
        <button :disabled="credStore.isSettingHelper" @click="onSetHelper">
          {{ credStore.isSettingHelper ? '설정 중...' : '플랫폼 기본값으로 설정' }}
        </button>
      </div>

      <div class="card">
        <h3>➕ 새 토큰 등록</h3>
        <input v-model="account" placeholder="계정 라벨 (예: gppc5096)" style="margin-right: 8px" />
        <input v-model="token" type="password" placeholder="PAT 값 (ghp_... 또는 github_pat_...)" style="margin-right: 8px" />
        <button :disabled="!canSave" @click="onSave">
          {{ credStore.isSaving ? '검증 중...' : '검증 후 저장' }}
        </button>

        <p v-if="statusText" :class="statusSeverity">{{ statusText }}</p>
        <p v-if="credStore.error" class="severity-critical">{{ credStore.error }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useScanStore } from '../stores/scan';
import { useCredentialsStore } from '../stores/credentials';
import TopBar from '../components/TopBar.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

// 이 컴포넌트가 하는 일: SCR-03 화면 조립만 — 검증/저장 로직은 store에, 실제 실행은
// main 프로세스(pat-validator.js/pat-store.js)에 있다 (docs/03 §16).
const scanStore = useScanStore();
const credStore = useCredentialsStore();

const account = ref('');
const token = ref('');
const lastStatus = ref(null); // { ok, hasRepoScope } — 화면에 결과만 잠깐 보여주기 위함(토큰 아님)
const pendingDelete = ref(null); // 삭제 확인 대기 중인 계정명 (null이면 모달 숨김)

const storedCreds = computed(() => scanStore.scanResult?.items?.storedCreds ?? []);
const credHelperOk = computed(() => !!scanStore.scanResult?.items?.credHelper?.ok);
const canSave = computed(() => account.value && token.value && credHelperOk.value && !credStore.isSaving);

const statusText = computed(() => {
  if (!lastStatus.value) return '';
  if (!lastStatus.value.ok) return '';
  if (lastStatus.value.hasRepoScope === true) return '✅ repo 스코프 확인됨';
  if (lastStatus.value.hasRepoScope === false) return '⚠️ repo 스코프가 없습니다 — push 권한이 없을 수 있습니다.';
  return '✅ 저장됨 (fine-grained 토큰은 스코프를 자동 확인할 수 없습니다)';
});
const statusSeverity = computed(() => (lastStatus.value?.hasRepoScope === false ? 'severity-warning' : 'severity-ok'));

async function onSetHelper() {
  const ok = await credStore.setDefaultHelper();
  if (ok) await scanStore.runScan(scanStore.projectPath);
}

async function onSave() {
  // 보안 원칙(docs/03 §16-2): 저장 시도 직후에는 성공/실패와 무관하게 로컬 토큰 값을 즉시 비운다.
  const result = await credStore.saveToken(account.value, token.value);
  account.value = '';
  token.value = '';
  lastStatus.value = result;
  if (result?.ok) await scanStore.runScan(scanStore.projectPath); // 저장된 인증정보 목록 갱신
}

async function onConfirmDelete() {
  const account = pendingDelete.value;
  pendingDelete.value = null;
  const ok = await credStore.deleteCredential(account);
  if (ok) await scanStore.runScan(scanStore.projectPath); // 저장된 인증정보 목록 갱신
}
</script>
