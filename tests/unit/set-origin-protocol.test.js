import { describe, it, expect } from 'vitest';
import { runRecovery } from '../../src/engine/recovery/index.js';

// set_origin_protocol 스텝을 recovery 파이프라인을 통해 검증한다 — 다른 스텝 테스트와 동일한
// 패턴(fake git 주입, 실제 git 명령 절대 미실행).
describe('set_origin_protocol (사용자가 고른 프로토콜로 origin 전환, 실제 git 미접근)', () => {
  it('SSH origin을 HTTPS로 전환한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push({ cmd, cwd });
      if (cmd === 'remote get-url origin') return 'git@github.com:gppc5096/repo.git';
      return '';
    };
    const plan = {
      steps: ['set_origin_protocol'],
      context: { desiredProtocol: 'https', projectPath: '/tmp/dummy-repo', git: fakeGit },
    };
    const result = await runRecovery(plan);

    expect(result.ok).toBe(true);
    expect(gitCalls).toContainEqual({
      cmd: 'remote set-url origin https://github.com/gppc5096/repo.git',
      cwd: '/tmp/dummy-repo',
    });
  });

  it('HTTPS origin을 SSH로 전환한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      if (cmd === 'remote get-url origin') return 'https://github.com/gppc5096/repo.git';
      return '';
    };
    const plan = {
      steps: ['set_origin_protocol'],
      context: { desiredProtocol: 'ssh', projectPath: '/tmp/dummy-repo', git: fakeGit },
    };
    const result = await runRecovery(plan);

    expect(result.ok).toBe(true);
    expect(gitCalls).toContain('remote set-url origin git@github.com:gppc5096/repo.git');
  });

  it('desiredProtocol이 ssh/https가 아니면 명확히 실패한다', async () => {
    const plan = {
      steps: ['set_origin_protocol'],
      context: { desiredProtocol: 'ftp', projectPath: '/tmp/dummy-repo', git: () => '' },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('desiredProtocol');
  });

  it('origin을 읽을 수 없으면 명확히 실패한다', async () => {
    const plan = {
      steps: ['set_origin_protocol'],
      context: { desiredProtocol: 'https', projectPath: '/tmp/dummy-repo', git: () => null },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('origin을 읽을 수 없');
  });

  it('github.com 형식이 아니면 자동 전환하지 않고 명확히 실패한다', async () => {
    const plan = {
      steps: ['set_origin_protocol'],
      context: {
        desiredProtocol: 'https',
        projectPath: '/tmp/dummy-repo',
        git: (cmd) => (cmd === 'remote get-url origin' ? 'git@example.com:owner/repo.git' : ''),
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('github.com');
  });
});
