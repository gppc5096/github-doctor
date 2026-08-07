import { describe, it, expect } from 'vitest';
import checkSshIdentity from '../../src/engine/scanners/ssh-identity.js';

// 이 테스트는 runDetailed를 항상 fake로 주입한다 — 실제 ssh -T git@github.com은
// 실제 네트워크/SSH 키를 건드리므로 자동화된 테스트에서 절대 실행하지 않는다.
describe('checkSshIdentity (ssh -T git@github.com 결과 → origin 소유자와 비교, 항상 fake로만 실행)', () => {
  it('origin이 HTTPS면 ssh -T를 아예 호출하지 않고 sshIdentity를 null로 둔다', async () => {
    let called = false;
    const ctx = { items: { origin: { value: 'https://github.com/x/y.git', protocol: 'HTTPS' } } };
    await checkSshIdentity(ctx, { runDetailed: () => { called = true; return { ok: false, stdout: '', stderr: '' }; } });
    expect(called).toBe(false);
    expect(ctx.items.sshIdentity).toBeNull();
  });

  it('origin이 없으면 ssh -T를 호출하지 않는다', async () => {
    let called = false;
    const ctx = { items: { origin: { value: null, protocol: null } } };
    await checkSshIdentity(ctx, { runDetailed: () => { called = true; return { ok: false, stdout: '', stderr: '' }; } });
    expect(called).toBe(false);
    expect(ctx.items.sshIdentity).toBeNull();
  });

  it('인증 계정과 origin 소유자가 같으면 matches:true, severity:ok', async () => {
    const ctx = { items: { origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' } } };
    await checkSshIdentity(ctx, {
      runDetailed: () => ({ ok: false, stdout: '', stderr: "Hi gppc5096! You've successfully authenticated, but GitHub does not provide shell access." }),
    });
    expect(ctx.items.sshIdentity).toEqual({
      authenticatedAs: 'gppc5096', originOwner: 'gppc5096', matches: true, severity: 'ok',
    });
  });

  it('인증 계정과 origin 소유자가 다르면 matches:false, severity:critical (사용자가 실제로 겪은 시나리오)', async () => {
    const ctx = { items: { origin: { value: 'git@github.com:gppc5096/US_Monthly_Dividend_ETF.git', protocol: 'SSH' } } };
    await checkSshIdentity(ctx, {
      runDetailed: () => ({ ok: false, stdout: '', stderr: "Hi jongchoon580325! You've successfully authenticated, but GitHub does not provide shell access." }),
    });
    expect(ctx.items.sshIdentity).toEqual({
      authenticatedAs: 'jongchoon580325', originOwner: 'gppc5096', matches: false, severity: 'critical',
    });
  });

  it('ssh -T가 "Hi <계정>!" 패턴을 전혀 못 주면(키 자체가 인식 안 됨) matches:null, severity:warning으로 애매함을 표시한다', async () => {
    const ctx = { items: { origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' } } };
    await checkSshIdentity(ctx, {
      runDetailed: () => ({ ok: false, stdout: '', stderr: 'git@github.com: Permission denied (publickey).' }),
    });
    expect(ctx.items.sshIdentity.authenticatedAs).toBeNull();
    expect(ctx.items.sshIdentity.matches).toBeNull();
    expect(ctx.items.sshIdentity.severity).toBe('warning');
  });
});
