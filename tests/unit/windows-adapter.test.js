import { describe, it, expect } from 'vitest';
import * as adapter from '../../src/adapters/windows-adapter.js';

// macOS 개발 환경에서도 안전하게 실행되도록 execSync/fs를 전부 fake로 주입한다.
// (실제로는 platform이 win32일 때만 이 어댑터가 로드되지만, 로직 자체는 DI 덕분에
// 어떤 OS에서든 부작용 없이 단위 테스트할 수 있다.)

describe('windows-adapter (DI로 실제 Credential Manager 완전 차단)', () => {
  it('버그 수정 확인: UserName만 조회하고 Password는 절대 요청하지 않는다', async () => {
    const calls = [];
    const execSync = (cmd) => {
      calls.push(cmd);
      return 'jongchoon5803';
    };

    const result = await adapter.getStoredCredentials({ execSync });

    expect(calls[0]).toContain('.UserName');
    expect(calls[0]).not.toContain('.Password');
    expect(result).toEqual([{ account: 'jongchoon5803', server: 'github.com', isWrong: false }]);
  });

  it('저장된 자격증명이 없으면 빈 배열을 반환한다', async () => {
    const result = await adapter.getStoredCredentials({ execSync: () => '' });
    expect(result).toEqual([]);
  });

  it('candidateAccounts로 namespaced target(git:https://<account>@github.com)도 함께 확인한다', async () => {
    const calls = [];
    const execSync = (cmd) => {
      calls.push(cmd);
      if (cmd.includes("git:https://gppc5096@github.com")) return 'gppc5096';
      if (cmd.includes("'git:https://github.com'")) return ''; // 기본 target은 비어있음
      return '';
    };

    const result = await adapter.getStoredCredentials({ execSync, candidateAccounts: ['gppc5096', 'namsabo180708'] });

    expect(result).toEqual([{ account: 'gppc5096', server: 'github.com', isWrong: false }]);
    expect(calls.some((c) => c.includes('git:https://gppc5096@github.com'))).toBe(true);
    expect(calls.some((c) => c.includes('git:https://namsabo180708@github.com'))).toBe(true);
  });

  it('deleteCredential은 지정한 target으로만 cmdkey를 호출한다', async () => {
    const calls = [];
    const execSync = (cmd) => {
      calls.push(cmd);
      return '';
    };
    const result = await adapter.deleteCredential('acct', { target: 'git:https://github-doctor-test', execSync });
    expect(calls[0]).toBe('cmdkey /delete:git:https://github-doctor-test');
    expect(result).toEqual({ ok: true });
  });

  // macos-adapter.js와 같은 이유(실사용 중 발견) — 이미 없는 항목을 지우려는 시도는 목표가 이미
  // 달성된 것이니 실패로 취급하지 않는다.
  it('deleteCredential은 이미 없는 항목(cmdkey가 못 찾음)이면 성공으로 처리한다', async () => {
    const execSync = () => {
      throw new Error('CMDKEY: The specified target credential could not be found.');
    };
    const result = await adapter.deleteCredential('acct', { target: 'git:https://github-doctor-test', execSync });
    expect(result).toEqual({ ok: true });
  });

  it('saveCredential은 fake keytar로만 저장을 시도한다 (실제 Credential Manager 미접근)', async () => {
    const calls = [];
    const keytar = {
      setPassword: async (target, account, token) => calls.push({ target, account, token }),
    };
    const result = await adapter.saveCredential('acct', 'fake-pat-token', {
      target: 'git:https://github-doctor-test',
      keytar,
    });
    expect(calls).toEqual([{ target: 'git:https://github-doctor-test', account: 'acct', token: 'fake-pat-token' }]);
    expect(result).toEqual({ ok: true });
  });

  it('generateSshKey는 fixture 디렉터리에서만 fake execSync/fs로 동작한다', async () => {
    const execCalls = [];
    const fs = {
      mkdirSync: () => {},
      readFileSync: () => 'ssh-ed25519 AAAAFAKEKEY test-account\n',
    };
    const result = await adapter.generateSshKey('acct', {
      sshDir: '/tmp/gh-doctor-fixture-ssh-win',
      execSync: (cmd) => {
        execCalls.push(cmd);
        return '';
      },
      fs,
    });
    expect(execCalls[0]).toContain('/tmp/gh-doctor-fixture-ssh-win/id_ed25519_acct');
    expect(result.pubKey).toBe('ssh-ed25519 AAAAFAKEKEY test-account');
  });

  it('deleteSshKey는 존재하는 키/공개키 파일만 fake fs로 삭제한다', async () => {
    const unlinkCalls = [];
    const fs = {
      existsSync: () => true,
      unlinkSync: (p) => unlinkCalls.push(p),
    };
    const result = await adapter.deleteSshKey('/tmp/gh-doctor-fixture-ssh-win/id_ed25519_acct', { fs });
    expect(unlinkCalls).toEqual([
      '/tmp/gh-doctor-fixture-ssh-win/id_ed25519_acct',
      '/tmp/gh-doctor-fixture-ssh-win/id_ed25519_acct.pub',
    ]);
    expect(result).toEqual({ ok: true });
  });
});
