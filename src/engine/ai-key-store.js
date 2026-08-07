const nodeKeytar = require('keytar');

// 이 파일이 하는 일: Claude API 키 저장/조회만. electron-store(평문 JSON)가 아니라 keytar(OS
// 네이티브 보안 저장소)를 쓴다 — PAT 저장 때와 같은 이유(docs/04 §5-2). keytar에 값이 없으면
// 기존 .env 워크플로와 호환되도록 process.env.ANTHROPIC_API_KEY로 폴백한다.
const SERVICE = 'github-doctor-anthropic';
const ACCOUNT = 'default';

async function saveAiKey(key, { keytar = nodeKeytar } = {}) {
  await keytar.setPassword(SERVICE, ACCOUNT, key);
}

async function getAiKey({ keytar = nodeKeytar } = {}) {
  const stored = await keytar.getPassword(SERVICE, ACCOUNT);
  return stored || process.env.ANTHROPIC_API_KEY || null;
}

module.exports = { saveAiKey, getAiKey };
