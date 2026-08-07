import { describe, it, expect } from 'vitest';
import { runRecovery } from '../../src/engine/recovery/index.js';

describe('set_origin_url (사용자가 입력한 임의 주소로 origin 등록/교체, 실제 git 미접근)', () => {
  it('origin이 이미 있으면 remote set-url을 호출한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push({ cmd, cwd });
      if (cmd === 'remote get-url origin') return 'https://github.com/old/repo.git';
      return '';
    };
    const plan = {
      steps: ['set_origin_url'],
      context: { originUrl: 'https://github.com/new/repo.git', projectPath: '/tmp/dummy-repo', git: fakeGit },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(true);
    expect(gitCalls).toContainEqual({
      cmd: 'remote set-url origin https://github.com/new/repo.git',
      cwd: '/tmp/dummy-repo',
    });
  });

  it('origin이 없으면 remote add를 호출한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push({ cmd, cwd });
      if (cmd === 'remote get-url origin') return null;
      return '';
    };
    const plan = {
      steps: ['set_origin_url'],
      context: { originUrl: 'https://github.com/new/repo.git', projectPath: '/tmp/dummy-repo', git: fakeGit },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(true);
    expect(gitCalls).toContainEqual({
      cmd: 'remote add origin https://github.com/new/repo.git',
      cwd: '/tmp/dummy-repo',
    });
  });

  it('originUrl이 없으면 명확히 실패한다', async () => {
    const plan = {
      steps: ['set_origin_url'],
      context: { projectPath: '/tmp/dummy-repo', git: () => '' },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('originUrl');
  });

  it('git 명령이 실패(null)하면 성공을 보고하지 않고 명확히 실패한다', async () => {
    const plan = {
      steps: ['set_origin_url'],
      context: {
        originUrl: 'https://github.com/new/repo.git',
        projectPath: '/tmp/not-a-git-repo',
        git: () => null,
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('set_origin_url');
  });
});
