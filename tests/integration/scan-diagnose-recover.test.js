import { describe, it, expect } from 'vitest';
import { runScan } from '../../src/engine/scanners/index.js';
import { ruleDiagnose } from '../../src/engine/diagnosis/rule-engine/index.js';
import { runRecovery } from '../../src/engine/recovery/index.js';

// docs/03 §11-1 "통합 테스트: 스캔 → 진단 → 복구 플로우, 핵심 경로 100%".
// 전 구간 fake git/adapter/fetch만 사용 — 실제 Keychain/SSH/git/네트워크 미접근.
//
// isWrong은 이제 scanner.js의 다중 계정 충돌 감지 로직이 실제로 계산한다 (v1.0, 사용자 결정).
// 이 테스트는 그 로직을 우회하지 않고, adapter가 항상 isWrong:false로 돌려주는 계정 2개를
// 스캔에 흘려보내 scanner.js가 스스로 하나를 isWrong:true로 뒤집는지부터 검증한다.

describe('통합: 스캔 → 진단 → 복구 → push (전부 fake, 실제 환경 미접근)', () => {
  it('다중 계정 충돌이 실제로 감지되면 wrong_cred 발견 → 자동 복구 → push 성공까지 이어진다', async () => {
    const gitCalls = [];
    const fakeGit = (cmd, cwd) => {
      gitCalls.push(cmd);
      if (cmd === 'git --version') return 'git version 2.50.1';
      if (cmd.includes('user.name')) return 'jongchoon5803'; // 현재 프로젝트의 "맞는" 계정
      if (cmd.includes('user.email')) return 'najongchoon@gmail.com';
      if (cmd.includes('credential.helper')) return 'osxkeychain';
      if (cmd.includes('remote get-url origin')) return 'https://github.com/jongchoon580325/housebook.git';
      if (cmd === 'push -u origin main') return 'Everything up-to-date';
      return null;
    };
    const fakeRun = (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : cmd === 'ssh-add -l' ? null : null);

    const deleteCalls = [];
    const fakeAdapter = {
      // 어댑터 자신은 isWrong을 판단하지 않는다 — jongchoon5803(맞는 계정)과
      // gppc5096(예전 계정, 남아있음)을 둘 다 isWrong:false로 반환한다.
      // "누가 틀렸는가"는 scanner.js가 git 커밋 계정과 비교해서 스스로 판단해야 한다.
      getStoredCredentials: async () => [
        { account: 'jongchoon5803', server: 'github.com', isWrong: false },
        { account: 'gppc5096', server: 'github.com', isWrong: false },
      ],
      deleteCredential: async (account) => {
        deleteCalls.push(account);
        return { ok: true };
      },
    };

    // 1. 스캔 (isWrong 판단 포함)
    const scanResult = await runScan('/tmp/dummy-repo', {
      git: fakeGit,
      run: fakeRun,
      getStoredCredentials: fakeAdapter.getStoredCredentials,
      fs: { existsSync: () => false, readdirSync: () => [] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    });
    expect(scanResult.items.gitInstalled.ok).toBe(true);
    // scanner.js가 스스로 gppc5096만 isWrong:true로 뒤집었는지 확인 (다중 계정 충돌 감지)
    expect(scanResult.items.storedCreds.find((c) => c.account === 'jongchoon5803').isWrong).toBe(false);
    expect(scanResult.items.storedCreds.find((c) => c.account === 'gppc5096').isWrong).toBe(true);

    // 2. 진단 (규칙 기반 — AI 없이도 항상 동작해야 함, docs/03 §0-3 원칙)
    const diagnosis = ruleDiagnose(scanResult);
    const wrongCredIssue = diagnosis.issues.find((i) => i.id === 'wrong_cred');
    expect(wrongCredIssue).toBeDefined();
    expect(diagnosis.recoveryPlan).toContain('wrong_cred');
    // 진단이 스스로 만든 _context를 그대로 사용 (수동 재조립하지 않음 — v1.0 _context 작업으로
    // 더 이상 필요 없어진 부분. wrongCreds도 여기서 이미 채워져 있어야 한다)
    expect(diagnosis._context.wrongCreds).toEqual([{ account: 'gppc5096', server: 'github.com', isWrong: true }]);

    // 3. 복구 (진단이 만든 recoveryPlan + push를 명시적으로 추가)
    // adapter/git은 IPC로 직렬화되지 않는 실행부라 실제 앱에서는 main 프로세스 쪽 기본값을 쓰지만,
    // 이 테스트는 엔진 레이어를 직접 호출하므로 fake를 함께 넘긴다.
    const plan = {
      steps: [...diagnosis.recoveryPlan, 'push'],
      context: { ...diagnosis._context, adapter: fakeAdapter, git: fakeGit },
    };
    const recoveryResult = await runRecovery(plan);

    expect(recoveryResult.ok).toBe(true);
    expect(deleteCalls).toEqual(['gppc5096']);
    expect(gitCalls).toContain('push -u origin main');
  });

  it('문제가 없으면 진단 단계에서 빈 recoveryPlan을 반환하고 복구를 실행할 필요가 없다', async () => {
    // SSH 키만 있고 HTTPS 인증 수단(credential.helper)은 없는 시나리오로 고정한다 — 둘 다
    // 있으면 v1.1 origin_choice 규칙이 "선택 가능" 안내를 정당하게 띄우므로, 진짜 "문제 0건"을
    // 확인하려면 SSH만 쓰는 쪽으로 모호함 자체를 없애야 한다(origin도 SSH로 맞춤).
    const fakeGit = (cmd) => {
      if (cmd.includes('user.name')) return 'tester';
      if (cmd.includes('user.email')) return 'tester@example.com';
      if (cmd.includes('remote get-url origin')) return 'git@github.com:test/repo.git';
      return null; // credential.helper 미설정 — SSH만 쓰는 시나리오
    };
    const scanResult = await runScan('/tmp/dummy-repo', {
      git: fakeGit,
      run: (cmd) => (cmd === 'git --version' ? 'git version 2.50.1' : null),
      // origin이 SSH이므로 scanner가 ssh-identity 체크를 실행한다 — 실제 ssh 호출을 막기 위해
      // 항상 fake로 주입하고, origin 소유자(test)와 일치하는 응답을 줘서 wrong_ssh_account도 안 뜨게 한다.
      runDetailed: () => ({ ok: false, stdout: '', stderr: "Hi test! You've successfully authenticated, but GitHub does not provide shell access." }),
      getStoredCredentials: async () => [],
      fs: { existsSync: () => true, readdirSync: () => ['id_ed25519.pub'] },
      fetchFn: async () => ({ ok: true, status: 200 }),
    });

    const diagnosis = ruleDiagnose(scanResult);
    expect(diagnosis.recoveryPlan).toEqual([]);
    expect(diagnosis.summary).toBe('발견된 문제가 없습니다. push를 진행하세요.');
  });
});
