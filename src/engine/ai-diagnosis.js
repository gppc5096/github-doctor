const Anthropic = require('@anthropic-ai/sdk');
const { ruleDiagnose } = require('./diagnosis/rule-engine');
const { buildRecoveryContext } = require('./recovery-context');
const { getAiKey: defaultGetAiKey } = require('./ai-key-store');

const DEFAULT_MODEL = 'claude-sonnet-5'; // ⚠️ 구현 시점에 Anthropic 공식 문서에서 최신 모델 ID 재확인 (docs/03 §5-1)

// deps로 API 키 조회 함수/클라이언트 생성 함수/모델명을 주입받을 수 있다.
// 기본값은 실제 keytar 조회(.env 폴백 포함, docs/04 §5-2)와 실제 Anthropic SDK이며, 테스트는
// 반드시 fake getAiKey/createClient를 주입해서 호출한다 (실제 API 호출은 비용이 들고
// 네트워크·키가 필요하며, 실제 keytar 조회도 마찬가지로 자동화 테스트에서 절대 실행하지 않는다).
async function runDiagnose(scanResult, deps = {}) {
  const {
    getAiKey = defaultGetAiKey,
    createClient = (key) => new Anthropic({ apiKey: key }),
    model = DEFAULT_MODEL,
  } = deps;
  const apiKey = await getAiKey();

  // 1. API 키 자체가 없으면 AI 호출을 시도하지 않고 바로 규칙 기반으로 전환
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY 미설정, 규칙 기반으로 전환');
    return ruleDiagnose(scanResult);
  }

  // 2. AI 진단 시도
  try {
    const client = createClient(apiKey);
    const prompt = buildPrompt(scanResult);
    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content[0].text;
    return parseAIResponse(raw, scanResult);
  } catch (e) {
    // 3. API 실패 시 규칙 기반 폴백 (docs/03 §0-3 원칙: AI 응답 의존 최소화)
    console.warn('AI 진단 실패, 규칙 기반으로 전환:', e.message);
    return ruleDiagnose(scanResult);
  }
}

function buildPrompt(scanResult) {
  return `당신은 GitHub 인증 문제 전문가입니다.
아래 스캔 결과를 분석하여 문제를 진단하고 복구 계획을 JSON으로 반환하세요.

스캔 결과:
${JSON.stringify(scanResult.items, null, 2)}

반환 형식 (JSON만 반환, 설명 없이):
{
  "summary": "한 문장 요약",
  "issues": [
    {
      "id": "unique_id",
      "severity": "critical|warning|info",
      "title": "제목",
      "description": "초보자도 이해할 수 있는 설명",
      "autoFixable": true|false,
      "fixType": "auto|semi|guide"
    }
  ],
  "recoveryPlan": ["step1_id", "step2_id"],
  "context": {
    "correctOrigin": "복구에 origin 주소 수정이 필요하면 올바른 https://github.com/... 주소, 아니면 null",
    "targetAccount": "복구에 계정명이 필요하면 올바른 GitHub 계정명, 아니면 null",
    "targetEmail": "복구에 이메일이 필요하면 올바른 이메일, 아니면 null"
  }
}`;
}

// AI 응답 JSON 파싱 실패 시에도 규칙 기반으로 폴백한다 (parse 실패 = AI 진단 실패의 한 형태).
function parseAIResponse(raw, scanResult) {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const { context: aiContext, ...rest } = parsed;
    // AI가 값을 제시하면(null이 아니면) 그 값을 우선하고, 나머지는 규칙 기반과 동일한
    // 방식(buildRecoveryContext)으로 scanResult에서 채운다 — 두 진단 경로가 같은 모양의
    // _context를 만들어야 recovery 엔진이 소스에 상관없이 동작한다.
    const baseContext = buildRecoveryContext(scanResult);
    const mergedContext = { ...baseContext };
    for (const [key, value] of Object.entries(aiContext || {})) {
      if (value !== null && value !== undefined) mergedContext[key] = value;
    }
    return { source: 'ai', ...rest, _context: mergedContext };
  } catch (e) {
    console.warn('AI 응답 JSON 파싱 실패, 규칙 기반으로 전환:', e.message);
    return ruleDiagnose(scanResult);
  }
}

module.exports = { runDiagnose, buildPrompt, parseAIResponse };
