import { defineStore } from 'pinia';
import { toIpcSafe } from '../utils/ipc-safe';

// docs/02 §5-2 "자동 복구 진행 단계 카드" 데이터 소스.
// window.electronAPI.recover(plan) → src/engine/recovery/index.js (§8, §15-3)로 이어진다.
export const useRecoveryStore = defineStore('recovery', {
  state: () => ({
    steps: [], // [{ id, status: 'pending'|'running'|'done'|'error', message }]
    status: 'idle', // idle | running | done | error
    error: null,
    errorGuidance: null, // v1.0: push 실패 등 원인 분류 + 다음 행동 (issue와 같은 shape, 없으면 null)
  }),
  actions: {
    // 진행 상황 수신 등록 (앱 시작 시 한 번만 호출)
    listen() {
      window.electronAPI.onProgress((progress) => {
        const step = this.steps.find((s) => s.id === progress.stepId);
        if (step) {
          step.status = progress.status;
          if (progress.message) step.message = progress.message;
        }
      });
    },
    async start(diagnosis) {
      if (!diagnosis || diagnosis.recoveryPlan.length === 0) return;
      this.status = 'running';
      this.error = null;
      this.errorGuidance = null;
      // push는 사용자가 명시적으로 원할 때만 자동 포함한다 (docs/03 §15-3 설계 결정 —
      // SCR-04의 단일 반자동 동작이 실수로 push까지 이어지는 걸 막기 위함).
      const stepIds = [...diagnosis.recoveryPlan, 'push'];
      this.steps = stepIds.map((id) => ({ id, status: 'pending', message: '' }));

      try {
        // diagnosis는 Pinia reactive 객체라 그대로 IPC로 보내면 구조화 복제 실패
        // ("An object could not be cloned") — toIpcSafe로 plain 객체로 바꾼다 (v1.0).
        const plan = toIpcSafe({ steps: stepIds, context: diagnosis._context ?? {} });
        const result = await window.electronAPI.recover(plan);
        this.status = result.ok ? 'done' : 'error';
        if (!result.ok) {
          this.error = result.error;
          this.errorGuidance = result.guidance ?? null;
        }
        return result;
      } catch (e) {
        this.status = 'error';
        this.error = e.message;
        return { ok: false, error: e.message };
      }
    },
    abort() {
      this.status = 'idle';
      this.steps = [];
    },
    // 진단 카드의 개별 이슈 액션(v1.0, IssueItem.vue의 "input" 타입)에서 스텝 하나만
    // 즉석에서 실행할 때 쓴다 — 큰 자동 복구 흐름(start)과 달리 진행 타임라인은 건드리지 않고,
    // 성공/실패만 반환한다. 실패 시 에러를 던지므로 호출자가 화면에 바로 보여줄 수 있다.
    async runStep(stepId, extraContext = {}) {
      const plan = toIpcSafe({ steps: [stepId], context: extraContext });
      const result = await window.electronAPI.recover(plan);
      if (!result.ok) throw new Error(result.error || `${stepId} 실행 실패`);
      return result;
    },
  },
});
