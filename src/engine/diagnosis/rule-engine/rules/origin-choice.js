// 규칙 10 (v1.1, 2026-08-07, 사용자 요청): SSH 키와 HTTPS 인증정보(PAT)가 둘 다 있으면,
// origin-check.js의 자동 프로토콜 전환(§ fix_origin)은 "어느 쪽이 맞는지" 추측하지 않고
// 손을 뗀다(ctx.correctOrigin이 null로 남음) — 그 애매한 상태를 사용자가 직접 고르게 안내한다.
function checkOriginChoice(items, ctx) {
  if (!items.origin?.value) return null;
  if (ctx.correctOrigin) return null; // fix_origin이 이미 처리하는 케이스와 겹치지 않음

  const hasSshKey = (items.sshKeys || []).length > 0;
  const hasHttpsAuth = !!items.credHelper?.ok || (items.storedCreds || []).length > 0;
  if (!(hasSshKey && hasHttpsAuth)) return null;

  return {
    id: 'origin_choice', severity: 'info',
    title: 'SSH와 HTTPS 인증정보가 모두 있습니다',
    description: `현재 origin은 ${items.origin.protocol}입니다. 두 방식 모두 사용 가능한 상태라, 어느 쪽으로 push할지 직접 선택할 수 있습니다.`,
    autoFixable: false, fixType: 'guide',
    action: {
      type: 'choice', label: '방식 선택',
      options: [
        { label: 'SSH 사용', value: 'ssh' },
        { label: 'HTTPS 사용', value: 'https' },
      ],
      step: 'set_origin_protocol', contextKey: 'desiredProtocol',
    },
  };
}

module.exports = checkOriginChoice;
