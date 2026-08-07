import { describe, it, expect } from 'vitest';
import { storePatViaGitCredential } from '../../src/engine/pat-store.js';

// runWithStdin을 항상 fake로 주입한다 — 실제 git credential approve는 절대 실행하지 않는다.
describe('storePatViaGitCredential (git credential approve로 저장만, 실제 실행 금지)', () => {
  it('git credential approve를 호출하고 계정/토큰을 stdin으로만 전달한다', () => {
    let calledCmd, calledInput;
    const result = storePatViaGitCredential('gppc5096', 'ghp_FAKE1234567890', {
      runWithStdin: (cmd, input) => {
        calledCmd = cmd;
        calledInput = input;
        return { ok: true };
      },
    });

    expect(result.ok).toBe(true);
    expect(calledCmd).toBe('git credential approve');
    expect(calledInput).toContain('protocol=https');
    expect(calledInput).toContain('host=github.com');
    expect(calledInput).toContain('username=gppc5096');
    expect(calledInput).toContain('password=ghp_FAKE1234567890');
  });

  // 보안 회귀 방지: 토큰이 커맨드 문자열(인자) 쪽에는 절대 들어가면 안 된다 — stdin에만 있어야
  // 프로세스 목록(ps)이나 로그에 노출되지 않는다 (docs/03 §16-2).
  it('토큰이 커맨드 문자열에는 절대 포함되지 않는다', () => {
    let calledCmd;
    storePatViaGitCredential('gppc5096', 'ghp_SECRET_VALUE', {
      runWithStdin: (cmd) => {
        calledCmd = cmd;
        return { ok: true };
      },
    });
    expect(calledCmd).not.toContain('ghp_SECRET_VALUE');
  });

  it('runWithStdin이 실패를 반환하면 그대로 실패를 전달한다', () => {
    const result = storePatViaGitCredential('gppc5096', 'ghp_FAKE', {
      runWithStdin: () => ({ ok: false, stderr: 'fatal: unable to store credential' }),
    });
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('unable to store credential');
  });
});
