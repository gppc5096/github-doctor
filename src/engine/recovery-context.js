// scanResult로부터 복구 스텝(§15-3 steps/*.js)이 필요로 하는 실행 컨텍스트를 만든다.
// diagnosis/rule-engine과 ai-diagnosis.js가 공유해서 사용한다 — 진단 방식(규칙/AI)과
// 무관하게 "무엇을 고칠지"와 "고치는 데 필요한 값"은 같은 방식으로 도출되어야 한다.
function buildRecoveryContext(scanResult) {
  const items = scanResult?.items || {};
  const storedCreds = items.storedCreds || [];
  const wrongCreds = storedCreds.filter((c) => c.isWrong);
  // "올바른" 계정: 다중 계정 충돌이 감지됐다면(§ isWrong 로직) isWrong이 아닌 계정을 사용하고,
  // 그렇지 않다면 현재 git 설정값을 그대로 유지 대상으로 삼는다.
  const correctCred = storedCreds.find((c) => !c.isWrong);
  const targetAccount = items.userName?.active || correctCred?.account || null;

  return {
    projectPath: scanResult?.projectPath ?? null,
    wrongCreds,
    targetAccount,
    targetEmail: items.userEmail?.active || null,
    correctOrigin: detectCorrectOrigin(items),
    account: targetAccount, // gen_ssh 등 "이 계정으로 작업"이 필요한 스텝에서 사용
  };
}

// origin이 "존재는 하는데" 사용 가능한 인증 수단과 프로토콜이 맞지 않는 경우만 감지한다
// (v1.0, 사용자 결정: 프로토콜 불일치만 완전자동). owner/repo는 그대로 두고 프로토콜만
// 기계적으로 바꾸는 것이므로 "어느 저장소가 맞는지" 추측이 필요 없어 안전하다.
//
// origin이 아예 없는 경우는 여기서 다루지 않는다 — 로컬 정보만으로는 목표 저장소를
// 전혀 알 수 없으므로 rule-engine의 no_origin 규칙(guide)이 계속 담당한다.
// 완전히 다른 저장소를 가리키는 경우도 마찬가지로 감지하지 않는다(알 방법이 없음).
function detectCorrectOrigin(items) {
  const origin = items.origin;
  if (!origin?.value || !origin.protocol) return null;

  const hasSshKey = (items.sshKeys || []).length > 0;
  const hasHttpsAuth = !!items.credHelper?.ok || (items.storedCreds || []).length > 0;

  if (origin.protocol === 'SSH' && !hasSshKey && hasHttpsAuth) {
    return convertOriginProtocol(origin.value, 'https');
  }
  if (origin.protocol === 'HTTPS' && hasSshKey && !hasHttpsAuth) {
    return convertOriginProtocol(origin.value, 'ssh');
  }
  return null;
}

// github.com origin 주소를 owner/repo로 분해한다. github.com 형식이 아니면(Enterprise 등)
// 안전하게 null을 반환한다 — convertOriginProtocol()과 parseGithubOwner() 둘 다 이 파싱을 공유한다.
function parseGithubOwnerRepo(url) {
  if (!url) return null;
  const httpsMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
  const match = httpsMatch || sshMatch;
  return match ? { owner: match[1], repo: match[2] } : null;
}

// github.com origin 주소의 프로토콜만 바꾼다 (owner/repo 경로는 그대로 유지).
function convertOriginProtocol(url, targetProtocol) {
  const parsed = parseGithubOwnerRepo(url);
  if (!parsed) return null;

  const { owner, repo } = parsed;
  return targetProtocol === 'ssh'
    ? `git@github.com:${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
}

// SSH 인증 계정과 비교할 origin 소유자만 필요한 호출부(scanners/ssh-identity.js)를 위한 편의 함수.
function parseGithubOwner(url) {
  return parseGithubOwnerRepo(url)?.owner ?? null;
}

module.exports = { buildRecoveryContext, convertOriginProtocol, parseGithubOwner };
