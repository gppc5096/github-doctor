// 복구 단계 ID와 실행 함수를 매핑 — switch 없이 확장 가능한 구조.
// 이 id들은 §5-2 규칙 엔진의 이슈 id, AI 진단의 recoveryPlan id와 정확히 일치해야 한다.
const registry = {
  wrong_cred: require('./steps/fix-wrong-cred'),
  fix_config: require('./steps/fix-user-config'),
  fix_origin: require('./steps/fix-origin'),
  add_origin: require('./steps/add-origin'),
  gen_ssh: require('./steps/gen-ssh-key'),
  push: require('./steps/run-push'),
};

function getStep(stepId) {
  const step = registry[stepId];
  if (!step) throw new Error(`알 수 없는 복구 단계: ${stepId}`);
  return step;
}

module.exports = { getStep };
