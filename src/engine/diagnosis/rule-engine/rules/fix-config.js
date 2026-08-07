// 규칙 7 (docs/03 §5-2 완전판 추가): user.name / user.email 미설정
// PRD Phase 3 기준 "완전 자동" 항목이지만, 실제로 자동 채울 수 있는 값이 있을 때만
// autoFixable로 표시한다 — email은 storedCreds/git config 외에는 알아낼 방법이 없어서,
// 둘 다 미설정인 "완전 초기 상태"에서는 자동으로 채울 근거 자체가 없다 (v1.0, _context 작업 중 발견).
function checkFixConfig(items, ctx) {
  const missingUserConfig = !items.userName?.active || !items.userEmail?.active;
  if (!missingUserConfig) return null;

  const resolvable = !!(ctx.targetAccount && ctx.targetEmail);
  return {
    id: 'fix_config', severity: 'warning',
    title: 'Git 사용자 정보(user.name / user.email)가 설정되지 않음',
    description: resolvable
      ? '커밋 작성자 정보를 현재 계정 기준으로 자동 설정합니다.'
      : '자동으로 채울 수 있는 계정 정보가 없습니다. GitHub 계정 이름/이메일을 직접 설정해야 합니다.',
    autoFixable: resolvable,
    fixType: resolvable ? 'auto' : 'guide',
  };
}

module.exports = checkFixConfig;
