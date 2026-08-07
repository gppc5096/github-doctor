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
    const result = await runDiagnose(okScanResult, { apiKey: undefined, createClient });
    expect(result.source).toBe('rule');
  });

  it('AI가 정상 JSON을 반환하면 그대로 파싱해서 반환한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{
            text: JSON.stringify({
              summary: 'AI 요약',
              issues: [{ id: 'wrong_cred', severity: 'critical', title: 'x', description: 'y', autoFixable: true, fixType: 'auto' }],
              recoveryPlan: ['wrong_cred'],
            }),
          }],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      apiKey: 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('AI 요약');
    expect(result.recoveryPlan).toEqual(['wrong_cred']);
    // AI 응답에 context가 없어도 scanResult로부터 만든 기본 _context가 채워진다
    expect(result._context.targetAccount).toBe('tester');
    expect(result._context.targetEmail).toBe('tester@example.com');
  });

  it('AI가 context(correctOrigin 등)를 함께 반환하면 기본값보다 우선 적용한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{
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
      apiKey: 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result._context.correctOrigin).toBe('https://github.com/jongchoon580325/housebook.git');
    // AI가 null을 준 필드는 기본(scanResult 기반) 값을 유지한다 (null로 덮어쓰지 않음)
    expect(result._context.targetEmail).toBe('tester@example.com');
  });

  it('AI 호출이 실패(예외)하면 규칙 기반으로 폴백한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => {
          throw new Error('네트워크 오류 (시뮬레이션)');
        },
      },
    };
    const result = await runDiagnose(okScanResult, {
      apiKey: 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('rule');
  });

  it('AI 응답이 JSON이 아니면 규칙 기반으로 폴백한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({ content: [{ text: '이건 JSON이 아닙니다' }] }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      apiKey: 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('rule');
  });

  it('마크다운 코드펜스로 감싼 JSON도 정상 파싱한다', async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ text: '```json\n{"summary":"ok","issues":[],"recoveryPlan":[]}\n```' }],
        }),
      },
    };
    const result = await runDiagnose(okScanResult, {
      apiKey: 'fake-key',
      createClient: () => fakeClient,
    });
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('ok');
  });
});
