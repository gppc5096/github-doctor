const os = require('os');
const path = require('path');
const nodeFs = require('fs');

// 이 파일이 하는 일: SSH 키 목록 확인 + (부산물로) GitHub Doctor가 생성한 키의
// 후보 계정명 추출. candidateAccounts는 stored-creds.js가 다중 계정 충돌을
// 확인할 때 쓰므로 여기서 return으로 넘겨준다.
function checkSshKeys(ctx, { fs = nodeFs } = {}) {
  const sshDir = path.join(os.homedir(), '.ssh');
  const sshFiles = fs.existsSync(sshDir)
    ? fs.readdirSync(sshDir).filter((f) => f.endsWith('.pub'))
    : [];

  ctx.items.sshKeys = sshFiles.map((f) => {
    const type = f.includes('ed25519')
      ? 'Ed25519'
      : f.includes('rsa')
        ? 'RSA'
        : f.includes('dsa')
          ? 'DSA (폐기됨 ⚠️)'
          : 'Unknown';
    return {
      file: f,
      keyPath: path.join(sshDir, f).replace(/\.pub$/, ''),
      type,
      isDSA: f.includes('dsa'),
      severity: f.includes('dsa') ? 'critical' : 'ok',
    };
  });

  return sshFiles.map((f) => f.match(/^id_(?:ed25519|rsa)_(.+)\.pub$/)?.[1]).filter(Boolean);
}

module.exports = checkSshKeys;
