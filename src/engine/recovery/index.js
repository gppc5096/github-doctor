const { getStep } = require('./step-registry');

// plan = { steps: ['wrong_cred', 'fix_config', ...], context: {...} }
// 'push'를 자동으로 덧붙이지 않는다 — 호출자가 명시적으로 steps에 포함해야 실행된다.
// (SCR-04의 "SSH 키만 생성" 같은 단일 반자동 동작이 실수로 push까지 이어지는 것을 방지)
async function runRecovery(plan, progressCb = () => {}) {
  const steps = plan.steps || [];
  const ctx = plan.context || {};
  const results = [];

  for (const stepId of steps) {
    progressCb({ stepId, status: 'running' });
    try {
      const stepFn = getStep(stepId);
      const result = await stepFn(ctx);
      results.push({ stepId, ok: true, ...result });
      progressCb({ stepId, status: 'done', message: result.message });
    } catch (e) {
      results.push({ stepId, ok: false, error: e.message });
      progressCb({ stepId, status: 'error', message: e.message });
      // guidance: run-push.js 등 일부 스텝만 채우는 선택적 필드(원인 분류 + 다음 행동,
      // IssueItem.vue가 그리는 issue와 같은 shape). 없으면 undefined — 기존 스텝은 영향 없음.
      return { ok: false, failedStep: stepId, error: e.message, guidance: e.guidance, results };
    }
  }

  return { ok: true, results };
}

module.exports = { runRecovery };
