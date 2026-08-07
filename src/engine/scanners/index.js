const nodeFs = require('fs');
const { git: nodeGit, run: nodeRun, runDetailed: nodeRunDetailed } = require('../git-helper');
const defaultAdapter = require('../../adapters');
const appStore = require('../app-store');

const checkGitInstall = require('./git-install');
const checkUserConfig = require('./user-config');
const checkCredHelper = require('./cred-helper');
const checkSshKeys = require('./ssh-keys');
const checkStoredCreds = require('./stored-creds');
const checkSshAgent = require('./ssh-agent');
const checkOrigin = require('./origin-remote');
const checkSshIdentity = require('./ssh-identity');
const checkGithubConn = require('./github-conn');

// 이 파일이 하는 일: 스캔 항목 실행 순서만 담당한다 (각 항목의 판단 로직은 개별 파일에 있음).
// 순서 제약: git-install이 없으면 즉시 반환 / ssh-keys가 stored-creds보다 먼저 실행돼야
// candidateAccounts를 넘길 수 있음 / ssh-identity는 origin 다음(원격 소유자와 비교해야 함) /
// github-conn·ssh-identity는 네트워크 호출이라 마지막 쪽.
async function runScan(projectPath, deps = {}) {
  const {
    git = nodeGit,
    run = nodeRun,
    runDetailed = nodeRunDetailed,
    getStoredCredentials = defaultAdapter.getStoredCredentials,
    getKnownAccounts = appStore.getKnownAccounts,
    fs = nodeFs,
    fetchFn = fetch,
  } = deps;

  const result = { projectPath, timestamp: new Date().toISOString(), items: {} };

  checkGitInstall(result, { run });
  if (!result.items.gitInstalled.ok) return result;

  checkUserConfig(result, { git });
  checkCredHelper(result, { git });
  const sshCandidateAccounts = checkSshKeys(result, { fs });
  // SSH 키 파일명만으로는 PAT로만 등록한 계정을 알 수 없다 — 저장된 "알려진 계정" 목록과 합쳐서
  // candidateAccounts를 넓힌다 (실사용 중 발견, docs/04 연장선). 조회 실패(예: 이 함수가 Electron
  // 앱 컨텍스트 밖에서 호출된 경우)는 스캔 전체를 막으면 안 되므로 빈 배열로 대체한다.
  const knownAccounts = safeGetKnownAccounts(getKnownAccounts);
  const candidateAccounts = [...new Set([...sshCandidateAccounts, ...knownAccounts])];
  await checkStoredCreds(result, { getStoredCredentials, candidateAccounts });
  checkSshAgent(result, { run });
  checkOrigin(result, { git });
  await checkSshIdentity(result, { runDetailed });
  await checkGithubConn(result, { fetchFn });

  return result;
}

function safeGetKnownAccounts(getKnownAccounts) {
  try {
    return getKnownAccounts();
  } catch (e) {
    console.warn('알려진 계정 목록 조회 실패:', e.message);
    return [];
  }
}

module.exports = { runScan };
