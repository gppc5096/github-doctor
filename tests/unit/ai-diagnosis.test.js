import { describe, it, expect } from 'vitest';
import { runDiagnose } from '../../src/engine/ai-diagnosis.js';

// 실제 Anthropic API를 절대 호출하지 않기 위해 createClient를 fake 함수로 주입한다.
// (비용 발생 + 네트워크 필요 + 실제 API 키가 없음 — 자동화 테스트에서는 항상 fake client 사용)

const okScanResult = {
  items: {
    gitInstalled: { ok: true },
    storedCreds: [],
    sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
    origin: { value: 'https://github.com/test/repo.git' },
    githubConn: { ok: true },
    userName: { active: 'tester' },
    userEmail: { active: 'tester@example.com' },
  },
};

describe('ai-diagnosis.runDiagnose (DI로 실제 Anthropic API 완전 차단)', () => {
  it('API 키가 없으면 AI를 호출하지 않고 바로 규칙 기반으로 전환한다', async () => {
    const createClient = () => {
      throw new Error('호출되면 안 됨: API 키 없이는 client를 만들지 않아야 함');
    };
    const result = await runDiagnose(okScanResult, { getAiKey: async () => undefined, createClient });
    expect(result.source).toBe('rule');
  });

  it('AI가 정상 JSON을 반환하면 그대로 파싱해서 반환한다', async () => {
    let receivedParams;
    const fakeClient = {
      messages: {
        create: async (params) => {
          receivedParams = params;
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                summary: 'AI 요약',
                issues: [{ id: 'wrong_cred', severity: 'critical', title: 'x', description: 'y', autoFixable: true, fixType: 'auto' }],
                recoveryPlan: ['wrong_cred'],
              }),
            }],
          };
        },
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('AI 요약');
    expect(result.recoveryPlan).toEqual(['wrong_cred']);
    // AI 응답에 context가 없어도 scanResult로부터 만든 기본 _context가 채워진다
    expect(result._context.targetAccount).toBe('tester');
    expect(result._context.targetEmail).toBe('tester@example.com');
    // 회귀 방지: thinking이 켜져 있으면 그 토큰도 max_tokens 예산에서 차감돼 응답이 잘리는
    // 실제 사고가 있었음 — 명시적으로 꺼서 보내는지 확인.
    expect(receivedParams.thinking).toEqual({ type: 'disabled' });
    expect(receivedParams.max_tokens).toBe(2048);
  });

  it('AI가 context(correctOrigin 등)를 함께 반환하면 기본값보다 우선 적용한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: 'origin 오류 감지',
              issues: [],
              recoveryPlan: ['fix_origin'],
              context: { correctOrigin: 'https://github.com/jongchoon580325/housebook.git', targetEmail: null },
            }),
          }],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result._context.correctOrigin).toBe('https://github.com/jongchoon580325/housebook.git');
    // AI가 null을 준 필드는 기본(scanResult 기반) 값을 유지한다 (null로 덮어쓰지 않음)
    expect(result._context.targetEmail).toBe('tester@example.com');
  });

  it('AI 호출이 실패(예외)하면 규칙 기반으로 폴백하고, 실패 사유를 화면에 보여줄 수 있게 실어 보낸다', async () => {
    const fakeClient = {
      messages: {
        create: async () => {
          throw new Error('네트워크 오류 (시뮬레이션)');
        },
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('rule');
    // 실사용 중 발견: 실패 사유가 메인 프로세스 콘솔에만 남으면 사용자는 원인을 알 방법이 없었음.
    expect(result._aiFallbackReason).toBe('네트워크 오류 (시뮬레이션)');
  });

  it('AI 응답이 JSON이 아니면 규칙 기반으로 폴백하고, 파싱 실패 사유를 실어 보낸다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({ content: [{ type: 'text', text: '이건 JSON이 아닙니다' }] }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('rule');
    expect(result._aiFallbackReason).toContain('AI 응답 파싱 실패');
  });

  // 실사용 중 발견한 회귀 버그: 확장 사고(extended thinking)가 켜지면 content[0]이
  // type:'thinking' 블록이고 실제 텍스트는 그 뒤에 온다. content[0]을 무조건 텍스트로 가정하면
  // "Cannot read properties of undefined (reading 'replace')"로 조용히 깨진다 — 공식 SDK
  // 문서(ContentBlock 유니온 타입)로 확인한 실제 응답 형태를 그대로 재현해서 검증한다.
  it('content[0]이 thinking 블록이어도 뒤에 오는 text 블록을 찾아서 정상 파싱한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [
            { type: 'thinking', thinking: '스캔 결과를 분석 중...', signature: 'sig==' },
            { type: 'text', text: JSON.stringify({ summary: 'ok', issues: [], recoveryPlan: [] }) },
          ],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('ok');
  });

  it('텍스트 블록이 아예 없으면 명확한 사유와 함께 규칙 기반으로 폴백한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: 'thinking', thinking: '...', signature: 'sig==' }],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('rule');
    expect(result._aiFallbackReason).toContain('텍스트 블록이 없습니다');
  });

  it('마크다운 코드펜스로 감싼 JSON도 정상 파싱한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: 'text', text: '```json\n{"summary":"ok","issues":[],"recoveryPlan":[]}\n```' }],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      getAiKey: async () => 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('ok');
  });
});
