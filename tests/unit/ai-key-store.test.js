import { describe, it, expect, afterEach } from 'vitest';
import { saveAiKey, getAiKey, deleteAiKey } from '../../src/engine/ai-key-store.js';

// keytar를 항상 fake로 주입한다 — 실제 Keychain은 절대 건드리지 않는다.
describe('ai-key-store (Claude API 키 저장/조회, 실제 Keychain 미접근)', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('saveAiKey는 fake keytar로만 저장을 시도한다', async () => {
    const calls = [];
    const keytar = { setPassword: async (service, account, key) => calls.push({ service, account, key }) };
    await saveAiKey('sk-ant-fake', { keytar });
    expect(calls).toEqual([{ service: 'github-doctor-anthropic', account: 'default', key: 'sk-ant-fake' }]);
  });

  it('getAiKey는 keytar에 값이 있으면 그 값을 반환한다', async () => {
    const keytar = { getPassword: async () => 'sk-ant-from-keytar' };
    const result = await getAiKey({ keytar });
    expect(result).toBe('sk-ant-from-keytar');
  });

  it('getAiKey는 keytar에 값이 없으면 .env(ANTHROPIC_API_KEY)로 폴백한다', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-from-env';
    const keytar = { getPassword: async () => null };
    const result = await getAiKey({ keytar });
    expect(result).toBe('sk-ant-from-env');
  });

  it('keytar도 .env도 없으면 null을 반환한다', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const keytar = { getPassword: async () => null };
    const result = await getAiKey({ keytar });
    expect(result).toBeNull();
  });

  it('deleteAiKey는 fake keytar로만 삭제를 시도한다', async () => {
    const calls = [];
    const keytar = { deletePassword: async (service, account) => calls.push({ service, account }) };
    await deleteAiKey({ keytar });
    expect(calls).toEqual([{ service: 'github-doctor-anthropic', account: 'default' }]);
  });
});
