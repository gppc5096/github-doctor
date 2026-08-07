const nodeFs = require('fs');
const { git: nodeGit, run: nodeRun, runDetailed: nodeRunDetailed } = require('../git-helper');
const defaultAdapter = require('../../adapters');

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
    fs = nodeFs,
    fetchFn = fetch,
  } = deps;

  const result = { projectPath, timestamp: new Date().toISOString(), items: {} };

  checkGitInstall(result, { run });
  if (!result.items.gitInstalled.ok) return result;

  checkUserConfig(result, { git });
  checkCredHelper(result, { git });
  const candidateAccounts = checkSshKeys(result, { fs });
  await checkStoredCreds(result, { getStoredCredentials, candidateAccounts });
  checkSshAgent(result, { run });
  checkOrigin(result, { git });
  await checkSshIdentity(result, { runDetailed });
  await checkGithubConn(result, { fetchFn });

  return result;
}

module.exports = { runScan };
