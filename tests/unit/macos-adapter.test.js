import { describe, it, expect } from 'vitest';
import * as adapter from '../../src/adapters/macos-adapter.js';

// 실제 macOS Keychain/파일시스템을 절대 건드리지 않기 위해 runFn/execSync/fs를
// 명시적으로 fake 함수로 주입한다 (vi.mock에 기대지 않음 — CJS require 체인을
// vi.mock이 놓치면 진짜 Keychain을 조회/삭제하거나 진짜 ssh-keygen이 실행될 수 있음).

describe('macos-adapter (DI로 실제 Keychain 완전 차단)', () => {
  it('테스트 전용 서비스명으로 조회하면 계정명을 파싱해 반환한다', async () => {
    const calls = [];
    const runFn = (cmd) => {
      calls.push(cmd);
      return '"acct"<blob>="gppc5096"\n"srvr"<blob>="github-doctor-test"';
    };

    const result = await adapter.getStoredCredentials({ service: 'github-doctor-test', runFn });

    expect(calls[0]).toContain('security find-internet-password -s github-doctor-test');
    expect(result).toEqual([{ account: 'gppc5096', server: 'github-doctor-test', isWrong: false }]);
  });

  it('Keychain에 항목이 없으면 빈 배열을 반환한다', async () => {
    const result = await adapter.getStoredCredentials({ service: 'github-doctor-test', runFn: () => null });
    expect(result).toEqual([]);
  });

  it('candidateAccounts 중 Keychain에 실제로 존재하는 계정만 추가로 찾아낸다 (다중 계정 감지)', async () => {
    const calls = [];
    const runFn = (cmd) => {
      calls.push(cmd);
      if (cmd.includes('-a "gppc5096"')) return '"acct"<blob>="gppc5096"';
      if (cmd.includes('-a "namsabo180708"')) return null; // 이 계정은 Keychain에 없음
      return null; // 계정 미지정 기본 조회는 아무것도 못 찾음(가정)
    };

    const result = await adapter.getStoredCredentials({
      service: 'github-doctor-test',
      runFn,
      candidateAccounts: ['gppc5096', 'namsabo180708'],
    });

    expect(result).toEqual([{ account: 'gppc5096', server: 'github-doctor-test', isWrong: false }]);
    // -g(비밀번호 요청) 없이 존재 여부만 확인했는지 확인
    expect(calls.some((c) => c.includes('-a "gppc5096"') && c.includes('-g'))).toBe(false);
  });

  it('기본 조회와 candidateAccounts 결과를 중복 없이 병합한다', async () => {
    const runFn = (cmd) => {
      if (cmd.includes('-a "gppc5096"')) return '"acct"<blob>="gppc5096"';
      if (!cmd.includes('-a')) return '"acct"<blob>="gppc5096"'; // 기본 조회도 같은 계정을 찾음
      return null;
    };
    const result = await adapter.getStoredCredentials({
      service: 'github-doctor-test',
      runFn,
      candidateAccounts: ['gppc5096'],
    });
    expect(result).toEqual([{ account: 'gppc5096', server: 'github-doctor-test', isWrong: false }]);
  });

  it('deleteCredential은 주어진 서비스명을 대상으로만 fake execSync를 호출한다', async () => {
    const calls = [];
    const execSync = (cmd) => {
      calls.push(cmd);
      return '';
    };

    const result = await adapter.deleteCredential('gppc5096', { service: 'github-doctor-test', execSync });
    expect(calls[0]).toContain('-s github-doctor-test');
    expect(result).toEqual({ ok: true });
  });

  it('deleteCredential 실패 시 ok:false를 반환한다', async () => {
    const execSync = () => {
      throw new Error('item not found');
    };
    const result = await adapter.deleteCredential('gppc5096', { service: 'github-doctor-test', execSync });
    expect(result.ok).toBe(false);
  });

  // 실사용 중 발견: find로는 존재가 확인됐는데 delete는 "찾을 수 없음"으로 실패하는 경우가 있었음
  // (직전에 이미 삭제됐거나 진단이 최신 상태를 못 따라간 경우) — 목표(그 계정이 Keychain에 없음)는
  // 이미 달성된 것이니 실패로 취급하지 않는다.
  it('deleteCredential은 이미 없는 항목(Keychain에서 못 찾음)이면 성공으로 처리한다', async () => {
    const execSync = () => {
      throw new Error(
        'Command failed: security delete-internet-password -a "jongchoon580325" -s github.com\n' +
        'security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain.'
      );
    };
    const result = await adapter.deleteCredential('jongchoon580325', { service: 'github-doctor-test', execSync });
    expect(result).toEqual({ ok: true });
  });

  it('saveCredential은 fake keytar로만 저장을 시도한다 (실제 Keychain 미접근)', async () => {
    const calls = [];
    const keytar = {
      setPassword: async (service, account, token) => calls.push({ service, account, token }),
    };
    const result = await adapter.saveCredential('gppc5096', 'fake-pat-token', {
      service: 'github-doctor-test',
      keytar,
    });
    expect(calls).toEqual([{ service: 'github-doctor-test', account: 'gppc5096', token: 'fake-pat-token' }]);
    expect(result).toEqual({ ok: true });
  });

  it('generateSshKey는 fixture 디렉터리에서만 fake execSync/fs로 동작한다', async () => {
    const execCalls = [];
    const execSync = (cmd) => {
      execCalls.push(cmd);
      return '';
    };
    const mkdirCalls = [];
    const fs = {
      mkdirSync: (dir) => mkdirCalls.push(dir),
      readFileSync: () => 'ssh-ed25519 AAAAFAKEKEY test-account\n',
    };

    const result = await adapter.generateSshKey('gppc5096', {
      sshDir: '/tmp/gh-doctor-fixture-ssh',
      execSync,
      fs,
    });

    expect(mkdirCalls).toEqual(['/tmp/gh-doctor-fixture-ssh']);
    expect(execCalls[0]).toContain('/tmp/gh-doctor-fixture-ssh/id_ed25519_gppc5096');
    expect(result.keyPath).toContain('/tmp/gh-doctor-fixture-ssh');
    expect(result.pubKey).toBe('ssh-ed25519 AAAAFAKEKEY test-account');
  });

  it('deleteSshKey는 존재하는 키/공개키 파일만 fake fs로 삭제한다', async () => {
    const unlinkCalls = [];
    const fs = {
      existsSync: () => true,
      unlinkSync: (p) => unlinkCalls.push(p),
    };
    const result = await adapter.deleteSshKey('/tmp/gh-doctor-fixture-ssh/id_ed25519_gppc5096', { fs });
    expect(unlinkCalls).toEqual([
      '/tmp/gh-doctor-fixture-ssh/id_ed25519_gppc5096',
      '/tmp/gh-doctor-fixture-ssh/id_ed25519_gppc5096.pub',
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('deleteSshKey는 파일이 없으면 unlink를 호출하지 않는다', async () => {
    const unlinkCalls = [];
    const fs = {
      existsSync: () => false,
      unlinkSync: (p) => unlinkCalls.push(p),
    };
    const result = await adapter.deleteSshKey('/tmp/gh-doctor-fixture-ssh/missing', { fs });
    expect(unlinkCalls).toEqual([]);
    expect(result).toEqual({ ok: true });
  });
});
