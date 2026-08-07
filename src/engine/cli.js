#!/usr/bin/env node
// 터미널 진입점 — scanner + AI 진단(ANTHROPIC_API_KEY 없으면 규칙 기반 자동 폴백) 결과를 JSON으로 출력한다.
const path = require('path');
const { runScan } = require('./scanners');
const { runDiagnose } = require('./ai-diagnosis');

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const scanResult = await runScan(path.resolve(projectPath));
  const diagnosis = await runDiagnose(scanResult);

  console.log(JSON.stringify({ scan: scanResult, diagnosis }, null, 2));
}

main();
