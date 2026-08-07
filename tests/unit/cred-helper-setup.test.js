import { describe, it, expect } from 'vitest';
import { setDefaultCredentialHelper } from '../../src/engine/cred-helper-setup.js';

// git을 항상 fake로 주입한다 — 실제 git config는 절대 건드리지 않는다.
describe('setDefaultCredentialHelper (플랫폼 기본값 설정만, 실제 git config 미접근)', () => {
  it('macOS면 osxkeychain으로 설정한다', () => {
    let calledCmd;
    const result = setDefaultCredentialHelper({ platform: 'darwin', git: (cmd) => { calledCmd = cmd; return ''; } });
    expect(result.value).toBe('osxkeychain');
    expect(calledCmd).toBe('config --global credential.helper osxkeychain');
  });

  it('Windows면 manager로 설정한다', () => {
    const result = setDefaultCredentialHelper({ platform: 'win32', git: () => '' });
    expect(result.value).toBe('manager');
  });

  it('지원하지 않는 OS면 명확히 실패한다', () => {
    expect(() => setDefaultCredentialHelper({ platform: 'linux', git: () => '' })).toThrow('지원하지 않는');
  });

  it('git config 명령이 실패(null)하면 명확히 실패한다', () => {
    expect(() => setDefaultCredentialHelper({ platform: 'darwin', git: () => null })).toThrow('설정 실패');
  });
});
