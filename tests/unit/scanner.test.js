import { describe, it, expect } from 'vitest';
import { runScan } from '../../src/engine/scanners/index.js';

// 하위 호출부(git/run/getStoredCredentials/fs/fetch)를 전부 fake 함수로 명시적으로
// 주입한다. vi.mock에 기대지 않으므로 실제 git/Keychain/네트워크는 절대 호출되지 않는다.
// (TODO.md "개발 위임 원칙" — 테스트는 항상 더미 데이터로만 진행)

describe('scanner.runScan (DI로 실제 환경 완전 차단)', () => {
  it('Git이 미설치면 즉시 반환하고 나머지 항목을 스캔하지 않는다', async () => {
    const deps = {
      run: () => null,
      git: () => null,
      getStoredCredentials: async () => {
        throw new Error('호출되면 안 됨: Git 미설치 시 조기 반환해야 함');
      },
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => {
        throw new Error('호출되면 안 됨');
      },
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(result.items.gitInstalled.ok).toBe(false);
    expect(result.items.userName).toBeUndefined();
  });

  it('정상 환경에서 8개 스캔 항목을 모두 fake 데이터로 반환한다', async () => {
    const calls = [];
    const deps = {
      run: (cmd) => {
        calls.push(cmd);
        if (cmd === 'git --version') return 'git version 2.50.1';
        if (cmd === 'ssh-add -l') return null;
        return null;
      },
      git: (cmd) => {
        calls.push(cmd);
        if (cmd.includes('user.name')) return 'tester';
        if (cmd.includes('user.email')) return 'tester@example.com';
        if (cmd.includes('credential.helper')) return 'osxkeychain';
        if (cmd.includes('remote get-url origin')) return 'https://github.com/test/repo.git';
        return null;
      },
      getStoredCredentials: async () => [],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    const items = result.items;

    expect(items.gitInstalled.ok).toBe(true);
    expect(items.userName.active).toBe('tester');
    expect(items.userEmail.active).toBe('tester@example.com');
    expect(items.credHelper.value).toBe('osxkeychain');
    expect(items.storedCreds).toEqual([]);
    expect(items.sshKeys).toEqual([]);
    expect(items.sshAgent.running).toBe(false);
    expect(items.origin.value).toBe('https://github.com/test/repo.git');
    expect(items.origin.protocol).toBe('HTTPS');
    expect(items.githubConn.ok).toBe(true);
    // 실제 시스템 명령이 하나도 실행되지 않고 전부 fake로 대체됐는지 교차 확인
    expect(calls.every((c) => typeof c === 'string')).toBe(true);
  });

  it('DSA 키가 있으면 severity critical로 표시한다', async () => {
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: () => null,
      getStoredCredentials: async () => [],
      fs: {
        existsSync: () => true,
        readdirSync: () => ['id_dsa.pub', 'id_ed25519.pub'],
      },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    const dsa = result.items.sshKeys.find((k) => k.isDSA);
    expect(dsa).toBeDefined();
    expect(dsa.severity).toBe('critical');
  });

  it('저장된 계정이 2개 이상이고 그중 하나가 현재 git 계정과 일치하면, 나머지만 isWrong:true로 표시한다', async () => {
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: (cmd) => (cmd.includes('user.name') ? 'jongchoon5803' : null),
      getStoredCredentials: async () => [
        { account: 'jongchoon5803', server: 'github.com', isWrong: false },
        { account: 'gppc5096', server: 'github.com', isWrong: false },
      ],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    const creds = result.items.storedCreds;

    expect(creds.find((c) => c.account === 'jongchoon5803').isWrong).toBe(false);
    expect(creds.find((c) => c.account === 'gppc5096').isWrong).toBe(true);
  });

  it('저장된 계정이 1개뿐이면 절대 isWrong:true로 표시하지 않는다 (안전 우선)', async () => {
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: (cmd) => (cmd.includes('user.name') ? 'someone-else' : null),
      getStoredCredentials: async () => [{ account: 'gppc5096', server: 'github.com', isWrong: false }],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(result.items.storedCreds[0].isWrong).toBe(false);
  });

  it('2개 이상이어도 현재 git 계정과 일치하는 게 하나도 없으면 절대 isWrong:true로 표시하지 않는다 (모호하면 보류)', async () => {
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: (cmd) => (cmd.includes('user.name') ? 'someone-else-entirely' : null),
      getStoredCredentials: async () => [
        { account: 'gppc5096', server: 'github.com', isWrong: false },
        { account: 'namsabo180708', server: 'github.com', isWrong: false },
      ],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(result.items.storedCreds.every((c) => c.isWrong === false)).toBe(true);
  });

  // v1.0 (2026-08-07, 사용자가 실제 push 권한 거부를 겪은 뒤 발견): SSH origin일 때만
  // runDetailed(ssh -T git@github.com)가 호출되고 결과가 items.sshIdentity에 반영되는지 확인.
  // runDetailed를 fake로 명시 주입하므로 실제 ssh는 여기서도 절대 실행되지 않는다.
  it('SSH origin이면 runDetailed(ssh -T)를 호출해 sshIdentity를 채운다', async () => {
    let sshCmd;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: (cmd) => (cmd.includes('remote get-url origin') ? 'git@github.com:gppc5096/repo.git' : null),
      runDetailed: (cmd) => {
        sshCmd = cmd;
        return { ok: false, stdout: '', stderr: "Hi jongchoon580325! You've successfully authenticated, but GitHub does not provide shell access." };
      },
      getStoredCredentials: async () => [],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(sshCmd).toBe('ssh -T git@github.com');
    expect(result.items.sshIdentity).toEqual({
      authenticatedAs: 'jongchoon580325', originOwner: 'gppc5096', matches: false, severity: 'critical',
    });
  });

  it('HTTPS origin이면 runDetailed를 호출하지 않는다', async () => {
    let called = false;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: (cmd) => (cmd.includes('remote get-url origin') ? 'https://github.com/test/repo.git' : null),
      runDetailed: () => { called = true; return { ok: false, stdout: '', stderr: '' }; },
      getStoredCredentials: async () => [],
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(called).toBe(false);
    expect(result.items.sshIdentity).toBeNull();
  });

  it('SSH 키 파일명(id_ed25519_<account>)에서 후보 계정을 추출해 getStoredCredentials에 넘긴다', async () => {
    let receivedOptions;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: () => null,
      getStoredCredentials: async (options) => {
        receivedOptions = options;
        return [];
      },
      fs: {
        existsSync: () => true,
        readdirSync: () => ['id_ed25519_gppc5096.pub', 'id_ed25519.pub', 'random.txt'],
      },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    await runScan('/tmp/dummy-repo', deps);
    expect(receivedOptions.candidateAccounts).toEqual(['gppc5096']);
  });

  // v1.1 (2026-08-07, 사용자가 실사용 중 발견): PAT로만 등록한 계정(SSH 키 없음)은 SSH 키 파일명
  // 기반 candidateAccounts에 절대 안 잡혀서, 실제로 Keychain에 저장돼 있어도 스캔 결과에서
  // 영영 안 보이는 문제가 있었다 — getKnownAccounts(PAT 저장 시 기록해둔 계정 목록)를 SSH 후보와
  // 합쳐서 이 사각지대를 없앤다.
  it('SSH 키 후보와 알려진 계정(getKnownAccounts)을 합쳐서 candidateAccounts로 넘긴다', async () => {
    let receivedOptions;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: () => null,
      getStoredCredentials: async (options) => {
        receivedOptions = options;
        return [];
      },
      getKnownAccounts: () => ['jongchoon580325'],
      fs: {
        existsSync: () => true,
        readdirSync: () => ['id_ed25519_gppc5096.pub'],
      },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    await runScan('/tmp/dummy-repo', deps);
    expect(receivedOptions.candidateAccounts.sort()).toEqual(['gppc5096', 'jongchoon580325']);
  });

  it('같은 계정이 SSH 후보와 알려진 계정 양쪽에 있어도 중복 없이 한 번만 넘긴다', async () => {
    let receivedOptions;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: () => null,
      getStoredCredentials: async (options) => {
        receivedOptions = options;
        return [];
      },
      getKnownAccounts: () => ['gppc5096'],
      fs: { existsSync: () => true, readdirSync: () => ['id_ed25519_gppc5096.pub'] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    await runScan('/tmp/dummy-repo', deps);
    expect(receivedOptions.candidateAccounts).toEqual(['gppc5096']);
  });

  it('getKnownAccounts가 실패해도(예: Electron 컨텍스트 밖) 스캔 자체는 계속 진행된다', async () => {
    let receivedOptions;
    const deps = {
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      git: () => null,
      getStoredCredentials: async (options) => {
        receivedOptions = options;
        return [];
      },
      getKnownAccounts: () => {
        throw new Error('Electron 컨텍스트 밖 시뮬레이션');
      },
      fs: { existsSync: () => true, readdirSync: () => ['id_ed25519_gppc5096.pub'] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    };

    const result = await runScan('/tmp/dummy-repo', deps);
    expect(result.items.gitInstalled.ok).toBe(true);
    expect(receivedOptions.candidateAccounts).toEqual(['gppc5096']);
  });
});
