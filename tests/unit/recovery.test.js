import { describe, it, expect } from 'vitest';
import { runRecovery } from '../../src/engine/recovery/index.js';

// 모든 스텝은 ctx로 adapter/git을 fake로 주입받는다 — 실제 Keychain/SSH/git은
// 이 테스트에서 절대 실행되지 않는다 (git push도 fake git 함수로만 시뮬레이션).

function fakeAdapter(overrides = {}) {
  return {
    deleteCredential: async () => ({ ok: true }),
    generateSshKey: async () => ({ keyPath: '/tmp/fake/id_ed25519', pubKey: 'ssh-ed25519 FAKE' }),
    ...overrides,
  };
}

describe('recovery.runRecovery (DI로 실제 Keychain/git 완전 차단)', () => {
  it('wrong_cred → fix_config → push 순서로 전부 성공하면 ok:true를 반환한다 (v0.6 완료 기준)', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push({ cmd, cwd });
      if (cmd.startsWith('push')) return 'Everything up-to-date';
      // git()은 실패해야만 null을 반환한다 — 성공한 config 명령은 보통 빈 문자열을 반환하므로
      // '' 로 시뮬레이션한다 (v1.0, null을 반환하면 이제 fix_config가 실패로 해석함).
      return '';
    };
    const deleteCalls = [];
    const adapter = fakeAdapter({
      deleteCredential: async (account) => {
        deleteCalls.push(account);
        return { ok: true };
      },
    });

    const progress = [];
    const plan = {
      steps: ['wrong_cred', 'fix_config', 'push'],
      context: {
        wrongCreds: [{ account: 'gppc5096' }],
        targetAccount: 'jongchoon5803',
        targetEmail: 'najongchoon@gmail.com',
        projectPath: '/tmp/dummy-repo',
        adapter,
        git: fakeGit,
      },
    };

    const result = await runRecovery(plan, (p) => progress.push(p));

    expect(result.ok).toBe(true);
    expect(deleteCalls).toEqual(['gppc5096']);
    expect(gitCalls.some((c) => c.cmd.includes('user.name "jongchoon5803"'))).toBe(true);
    expect(gitCalls.some((c) => c.cmd.includes('user.email "najongchoon@gmail.com"'))).toBe(true);
    expect(gitCalls.some((c) => c.cmd === 'push -u origin main')).toBe(true);
    expect(progress.filter((p) => p.status === 'done')).toHaveLength(3);
  });

  it('중간 단계가 실패하면 즉시 중단하고 이후 단계는 실행하지 않는다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      return null; // push 실패 시뮬레이션 (null 반환 → run-push.js가 throw)
    };
    const adapter = fakeAdapter();

    const plan = {
      steps: ['wrong_cred', 'push', 'fix_origin'],
      context: {
        wrongCreds: [{ account: 'gppc5096' }],
        projectPath: '/tmp/dummy-repo',
        adapter,
        git: fakeGit,
      },
    };

    const result = await runRecovery(plan);

    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('push');
    // fix_origin은 push 실패 이후 단계이므로 git 명령이 push까지만 호출됨
    expect(gitCalls).toEqual(['push -u origin main']);
  });

  it('알 수 없는 스텝 id는 즉시 에러로 처리한다', async () => {
    const plan = { steps: ['no_such_step'], context: {} };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('알 수 없는 복구 단계');
  });

  it('push를 steps에 포함하지 않으면 실행되지 않는다 (SCR-04 단일 반자동 동작 보호)', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      return null;
    };
    const genSshCalls = [];
    const adapter = fakeAdapter({
      generateSshKey: async (account) => {
        genSshCalls.push(account);
        return { keyPath: '/tmp/fake/id_ed25519', pubKey: 'ssh-ed25519 FAKE' };
      },
    });

    const plan = {
      steps: ['gen_ssh'],
      context: { account: 'gppc5096', adapter, git: fakeGit },
    };

    const result = await runRecovery(plan);
    expect(result.ok).toBe(true);
    expect(genSshCalls).toEqual(['gppc5096']);
    expect(gitCalls).toEqual([]); // push는 호출되지 않음
  });

  it('fix_config는 targetAccount/targetEmail이 없으면 git config를 건드리지 않고 명확히 실패한다 (v1.0, "undefined" 기록 방지)', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      return null;
    };
    const plan = {
      steps: ['fix_config'],
      context: { projectPath: '/tmp/dummy-repo', git: fakeGit }, // targetAccount/targetEmail 없음
    };

    const result = await runRecovery(plan);

    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('fix_config');
    expect(result.error).toContain('targetAccount/targetEmail');
    expect(gitCalls).toEqual([]); // git config가 전혀 호출되지 않았는지 확인
  });

  it('fix_origin은 correctOrigin이 없으면 git remote를 건드리지 않고 명확히 실패한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      return null;
    };
    const plan = {
      steps: ['fix_origin'],
      context: { projectPath: '/tmp/dummy-repo', git: fakeGit }, // correctOrigin 없음
    };

    const result = await runRecovery(plan);

    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('fix_origin');
    expect(result.error).toContain('correctOrigin');
    expect(gitCalls).toEqual([]);
  });

  it('add_origin은 사용자가 입력한 originUrl로 git remote add를 실행한다 (v1.0, no_origin의 input 액션)', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push({ cmd, cwd });
      return '';
    };
    const plan = {
      steps: ['add_origin'],
      context: {
        originUrl: 'https://github.com/jongchoon580325/housebook.git',
        projectPath: '/tmp/dummy-repo',
        git: fakeGit,
      },
    };

    const result = await runRecovery(plan);

    expect(result.ok).toBe(true);
    expect(gitCalls).toEqual([
      { cmd: 'remote add origin https://github.com/jongchoon580325/housebook.git', cwd: '/tmp/dummy-repo' },
    ]);
  });

  it('add_origin은 originUrl이 없으면 git remote를 건드리지 않고 명확히 실패한다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd) => {
      gitCalls.push(cmd);
      return null;
    };
    const plan = {
      steps: ['add_origin'],
      context: { projectPath: '/tmp/dummy-repo', git: fakeGit }, // originUrl 없음
    };

    const result = await runRecovery(plan);

    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('add_origin');
    expect(result.error).toContain('originUrl');
    expect(gitCalls).toEqual([]);
  });

  // v1.0: git 명령이 실제로 실패(null 반환)했는데도 "성공했습니다"로 보고하던 버그 수정 검증
  // (사용자가 "진짜 실행되는지" 질문하며 발견 — 예: projectPath가 git 저장소가 아닌 경우).
  it('add_origin은 git 명령이 실패(null)하면 성공을 보고하지 않고 명확히 실패한다', async () => {
    const plan = {
      steps: ['add_origin'],
      context: {
        originUrl: 'https://github.com/test/repo.git',
        projectPath: '/tmp/not-a-git-repo',
        git: () => null, // "not a git repository" 등 git 명령 실패 시뮬레이션
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('add_origin');
    expect(result.error).toContain('실패');
  });

  it('fix_origin은 git 명령이 실패(null)하면 성공을 보고하지 않고 명확히 실패한다', async () => {
    const plan = {
      steps: ['fix_origin'],
      context: {
        correctOrigin: 'https://github.com/test/repo.git',
        projectPath: '/tmp/not-a-git-repo',
        git: () => null,
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('fix_origin');
  });

  it('fix_config는 git 명령이 실패(null)하면 성공을 보고하지 않고 명확히 실패한다', async () => {
    const plan = {
      steps: ['fix_config'],
      context: {
        targetAccount: 'tester',
        targetEmail: 'tester@example.com',
        projectPath: '/tmp/not-a-git-repo',
        git: () => null,
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('fix_config');
  });

  // v1.0: push 실패 시 뭉뚱그린 메시지만 뜨던 문제 — ctx.gitDetailed(stderr 포함)를 fake로
  // 주입해, 실행 경로(ctx.git 미주입)에서 원인이 분류되어 결과에 guidance로 실리는지 확인.
  // (ctx.git을 fake로 주는 다른 테스트들은 stderr가 없어 push_unknown으로만 떨어지며 그대로 통과함 —
  // 이는 위 테스트들이 여전히 통과한다는 사실 자체로 이미 검증됨.)
  it('push는 gitDetailed의 stderr를 원인별로 분류해 guidance로 실어 보낸다', async () => {
    const plan = {
      steps: ['push'],
      context: {
        projectPath: '/tmp/dummy-repo',
        gitDetailed: () => ({ ok: false, stdout: '', stderr: 'fatal: Authentication failed for ...' }),
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('push');
    expect(result.guidance.id).toBe('push_auth_failed');
    expect(result.guidance.action).toEqual({ type: 'rescan', label: '다시 스캔' });
  });

  it('push가 gitDetailed로 성공하면 stdout을 pushResult로 반환한다', async () => {
    const plan = {
      steps: ['push'],
      context: {
        projectPath: '/tmp/dummy-repo',
        gitDetailed: () => ({ ok: true, stdout: 'Everything up-to-date', stderr: '' }),
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(true);
    expect(result.results[0].pushResult).toBe('Everything up-to-date');
  });

  it('wrong_cred는 인증정보 삭제가 실패하면 성공을 보고하지 않고 어떤 계정이 실패했는지 알려준다', async () => {
    const plan = {
      steps: ['wrong_cred'],
      context: {
        wrongCreds: [{ account: 'gppc5096' }],
        adapter: {
          deleteCredential: async () => ({ ok: false, error: 'item not found' }),
        },
      },
    };
    const result = await runRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe('wrong_cred');
    expect(result.error).toContain('gppc5096');
    expect(result.error).toContain('item not found');
  });
});
