import { describe, it, expect } from 'vitest';
import { buildRecoveryContext, convertOriginProtocol, parseGithubOwner } from '../../src/engine/recovery-context.js';

describe('buildRecoveryContext', () => {
  it('다중 계정 충돌이 감지된 경우, isWrong이 아닌 계정을 targetAccount 후보로 사용한다', () => {
    const scanResult = {
      projectPath: '/tmp/dummy-repo',
      items: {
        userName: { active: 'jongchoon5803' },
        userEmail: { active: 'najongchoon@gmail.com' },
        storedCreds: [
          { account: 'jongchoon5803', isWrong: false },
          { account: 'gppc5096', isWrong: true },
        ],
      },
    };
    const ctx = buildRecoveryContext(scanResult);
    expect(ctx.projectPath).toBe('/tmp/dummy-repo');
    expect(ctx.wrongCreds).toEqual([{ account: 'gppc5096', isWrong: true }]);
    expect(ctx.targetAccount).toBe('jongchoon5803');
    expect(ctx.targetEmail).toBe('najongchoon@gmail.com');
    expect(ctx.account).toBe('jongchoon5803');
  });

  it('userName.active가 없으면 isWrong이 아닌 storedCred 계정으로 대체한다', () => {
    const scanResult = {
      projectPath: '/tmp/dummy-repo',
      items: {
        userName: { active: null },
        userEmail: { active: null },
        storedCreds: [{ account: 'gppc5096', isWrong: false }],
      },
    };
    const ctx = buildRecoveryContext(scanResult);
    expect(ctx.targetAccount).toBe('gppc5096');
    expect(ctx.targetEmail).toBeNull(); // 이메일은 storedCreds로 알 수 없음
  });

  it('아무 정보도 없으면 전부 null/빈 배열을 반환한다 (자동 채울 근거 없음)', () => {
    const ctx = buildRecoveryContext({ projectPath: '/tmp/x', items: {} });
    expect(ctx.wrongCreds).toEqual([]);
    expect(ctx.targetAccount).toBeNull();
    expect(ctx.targetEmail).toBeNull();
    expect(ctx.correctOrigin).toBeNull();
  });

  it('scanResult.items가 없어도 예외 없이 안전한 기본값을 반환한다', () => {
    const ctx = buildRecoveryContext({ projectPath: '/tmp/x' });
    expect(ctx.wrongCreds).toEqual([]);
    expect(ctx.targetAccount).toBeNull();
  });

  describe('correctOrigin (v1.0, 사용자 결정: "프로토콜 불일치만 완전자동")', () => {
    it('origin이 SSH인데 SSH 키가 없고 HTTPS 인증 수단은 있으면 HTTPS로 전환할 주소를 계산한다', () => {
      const ctx = buildRecoveryContext({
        items: {
          origin: { value: 'git@github.com:jongchoon580325/housebook.git', protocol: 'SSH' },
          sshKeys: [],
          credHelper: { ok: true },
          storedCreds: [],
        },
      });
      expect(ctx.correctOrigin).toBe('https://github.com/jongchoon580325/housebook.git');
    });

    it('origin이 HTTPS인데 HTTPS 인증 수단이 없고 SSH 키는 있으면 SSH로 전환할 주소를 계산한다', () => {
      const ctx = buildRecoveryContext({
        items: {
          origin: { value: 'https://github.com/jongchoon580325/housebook.git', protocol: 'HTTPS' },
          sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
          credHelper: { ok: false },
          storedCreds: [],
        },
      });
      expect(ctx.correctOrigin).toBe('git@github.com:jongchoon580325/housebook.git');
    });

    it('사용 가능한 인증 수단이 현재 프로토콜과 이미 맞으면 correctOrigin은 null이다', () => {
      const ctx = buildRecoveryContext({
        items: {
          origin: { value: 'https://github.com/test/repo.git', protocol: 'HTTPS' },
          sshKeys: [],
          credHelper: { ok: true },
          storedCreds: [],
        },
      });
      expect(ctx.correctOrigin).toBeNull();
    });

    it('origin 자체가 없으면 correctOrigin은 null이다 (no_origin 규칙이 계속 담당)', () => {
      const ctx = buildRecoveryContext({
        items: { origin: { value: null, protocol: null }, sshKeys: [], storedCreds: [] },
      });
      expect(ctx.correctOrigin).toBeNull();
    });
  });

  describe('convertOriginProtocol', () => {
    it('HTTPS → SSH 변환 시 owner/repo를 그대로 유지한다', () => {
      expect(convertOriginProtocol('https://github.com/owner/repo.git', 'ssh')).toBe(
        'git@github.com:owner/repo.git'
      );
      expect(convertOriginProtocol('https://github.com/owner/repo', 'ssh')).toBe(
        'git@github.com:owner/repo.git'
      );
    });

    it('SSH → HTTPS 변환 시 owner/repo를 그대로 유지한다', () => {
      expect(convertOriginProtocol('git@github.com:owner/repo.git', 'https')).toBe(
        'https://github.com/owner/repo.git'
      );
    });

    it('github.com 형식이 아니면 null을 반환하고 건드리지 않는다 (Enterprise 등 안전 우선)', () => {
      expect(convertOriginProtocol('https://github.example.com/owner/repo.git', 'ssh')).toBeNull();
    });
  });

  // v1.0 (2026-08-07): ssh-identity.js가 SSH 인증 계정과 비교할 때 재사용한다.
  describe('parseGithubOwner', () => {
    it('SSH/HTTPS 형식 둘 다에서 owner만 뽑아낸다', () => {
      expect(parseGithubOwner('git@github.com:gppc5096/US_Monthly_Dividend_ETF.git')).toBe('gppc5096');
      expect(parseGithubOwner('https://github.com/gppc5096/US_Monthly_Dividend_ETF.git')).toBe('gppc5096');
    });

    it('github.com 형식이 아니거나 값이 없으면 null을 반환한다', () => {
      expect(parseGithubOwner('https://github.example.com/owner/repo.git')).toBeNull();
      expect(parseGithubOwner(null)).toBeNull();
    });
  });
});
