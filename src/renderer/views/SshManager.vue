<template>
  <div class="dashboard">
    <TopBar title="SSH 키 관리" />

    <p v-if="!scanStore.scanResult">
      먼저 대시보드에서 프로젝트를 스캔해야 SSH 키 목록을 볼 수 있습니다.
    </p>

    <div v-else class="card">
      <h3>🔑 로컬 SSH 키</h3>
      <p v-if="!sshKeys.length">감지된 SSH 키가 없습니다.</p>
      <ul v-else class="scan-list">
        <li v-for="key in sshKeys" :key="key.file" class="scan-row">
          <span :class="['dot', `dot-${key.severity}`]" />
          <span class="scan-label">{{ key.file }} ({{ key.type }})</span>
          <span class="scan-value">
            <button :disabled="sshStore.isBusy" @click="onCopy(key.keyPath)">공개키 복사</button>
            <button :disabled="sshStore.isBusy" @click="onDelete(key.keyPath)">삭제</button>
          </span>
        </li>
      </ul>
    </div>

    <div class="card">
      <h3>⚡ 새 SSH 키 생성</h3>
      <input v-model="accountInput" placeholder="계정 라벨 (예: gppc5096)" style="margin-right: 8px" />
      <button :disabled="sshStore.isGenerating || !accountInput" @click="onGenerate">
        {{ sshStore.isGenerating ? '생성 중...' : '키 생성' }}
      </button>
      <p v-if="sshStore.lastGenerated" class="severity-ok">생성됨: {{ sshStore.lastGenerated.keyPath }}</p>
      <p v-if="sshStore.error" class="severity-critical">{{ sshStore.error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useScanStore } from '../stores/scan';
import { useSshStore } from '../stores/ssh';
import TopBar from '../components/TopBar.vue';

const scanStore = useScanStore();
const sshStore = useSshStore();
const accountInput = ref('');

const sshKeys = computed(() => scanStore.scanResult?.items?.sshKeys ?? []);

async function onGenerate() {
  await sshStore.generate(accountInput.value);
  await scanStore.runScan(scanStore.projectPath); // 목록 갱신
}

async function onDelete(keyPath) {
  const ok = await sshStore.remove(keyPath);
  if (ok) await scanStore.runScan(scanStore.projectPath); // 목록 갱신
}

async function onCopy(keyPath) {
  await sshStore.copyPublicKey(keyPath);
}
</script>
