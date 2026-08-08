const { buildRecoveryContext } = require('../../recovery-context');
const checkNoGit = require('./rules/no-git');
const checkWrongCred = require('./rules/wrong-cred');
const checkNoSsh = require('./rules/no-ssh');
const checkDsaKey = require('./rules/dsa-key');
const checkOrigin = require('./rules/origin-check');
const checkOriginChoice = require('./rules/origin-choice');
const checkWrongSshAccount = require('./rules/wrong-ssh-account');
const checkNoNetwork = require('./rules/no-network');
const checkFixConfig = require('./rules/fix-config');

// AI API 실패·오프라인·응답 지연 시 이 규칙 엔진이 동일한 인터페이스로 진단 결과를 반환한다.
// 이 파일이 하는 일: 규칙 실행 순서와 결과 취합만 담당한다 (각 규칙의 판단 로직은 rules/*.js에 있음).
//
// issue.action (v1.0 추가, TODO.md 참고): "다음 행동" 메타데이터. 함수는 IPC로 못 넘기므로
// type + 순수 데이터만 담고, 렌더러(IssueItem.vue)가 type을 해석해서 버튼/입력창을 그린다.
//   - openUrl:  { type:'openUrl', label, url }              → 외부 브라우저로 열기
//   - navigate: { type:'navigate', label, to }               → 앱 내 다른 화면으로 이동
//   - input:    { type:'input', label, placeholder, step }   → 값을 입력받아 해당 스텝 실행
//   - rescan:   { type:'rescan', label }                     → 재스캔 트리거
const rules = [
  checkNoGit, checkWrongCred, checkNoSsh, checkDsaKey, checkOrigin, checkOriginChoice,
  checkWrongSshAccount, checkNoNetwork, checkFixConfig,
];

function ruleDiagnose(scanResult) {
  const items = scanResult.items;
  // 규칙 전체가 이 컨텍스트 하나를 공유한다 — "무엇을 자동으로 고칠 수 있는지" 판단과
  // "고치는 데 필요한 값"이 항상 같은 계산에서 나오도록 하기 위함 (v1.0, _context 작업).
  const ctx = buildRecoveryContext(scanResult);
  const issues = rules.map((rule) => rule(items, ctx)).filter(Boolean);
  // origin_choice(v1.1)처럼 severity:'info'인 항목은 "고장난 것"이 아니라 "참고용 선택지"다 —
  // SSH/HTTPS 인증정보가 둘 다 있는 한 어느 쪽을 고르든 이 안내는 항상 다시 나타나므로(정상
  // 동작), "문제 건수"에 포함시키면 사용자가 아무리 골라도 "문제 해결됨"이 절대 뜨지 않는
  // 것처럼 보였다(2026-08-08, 사용자 리포트). 카드 자체는 계속 보여주되(issues에는 그대로
  // 포함), 건수 집계에서는 제외한다.
  const problemCount = issues.filter((i) => i.severity !== 'info').length;

  const summary =
    problemCount === 0
      ? '발견된 문제를 모두 해결했습니다. push를 진행하세요.'
      : `총 ${problemCount}가지 문제를 발견했습니다.`;

  return {
    source: 'rule',
    summary,
    issues,
    recoveryPlan: issues.filter((i) => i.autoFixable).map((i) => i.id),
    _context: ctx,
  };
}

module.exports = { ruleDiagnose };
