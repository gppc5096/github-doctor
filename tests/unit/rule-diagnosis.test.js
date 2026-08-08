import { describe, it, expect } from 'vitest';
import { ruleDiagnose } from '../../src/engine/diagnosis/rule-engine/index.js';

describe('규칙 기반 진단 엔진', () => {
  it('잘못된 인증정보를 Critical로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: 'gppc5096', isWrong: true }],
        sshKeys: [],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const crit = result.issues.find((i) => i.id === 'wrong_cred');
    expect(crit).toBeDefined();
    expect(crit.severity).toBe('critical');
    expect(crit.autoFixable).toBe(true);
  });

  it('문제 없으면 빈 issues 반환', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    expect(result.issues).toHaveLength(0);
  });

  it('규칙 7: userName만 없고 대체 계정(storedCreds)이 있으면 fix_config를 autoFixable로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: 'gppc5096', isWrong: false }],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: null },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'fix_config');
    expect(issue).toBeDefined();
    expect(issue.autoFixable).toBe(true);
    expect(issue.fixType).toBe('auto');
    expect(result.recoveryPlan).toContain('fix_config');
    expect(result._context.targetAccount).toBe('gppc5096');
    expect(result._context.targetEmail).toBe('tester@example.com');
  });

  it('규칙 7: 자동으로 채울 계정/이메일 정보가 전혀 없으면 fix_config를 guide(non-autoFixable)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: null },
        userEmail: { active: null },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'fix_config');
    expect(issue).toBeDefined();
    expect(issue.autoFixable).toBe(false);
    expect(issue.fixType).toBe('guide');
    expect(result.recoveryPlan).not.toContain('fix_config');
  });

  it('모든 진단 결과에 recovery 스텝 실행용 _context가 포함된다', () => {
    const scanResult = {
      projectPath: '/tmp/dummy-repo',
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    expect(result._context).toEqual({
      projectPath: '/tmp/dummy-repo',
      wrongCreds: [],
      targetAccount: 'tester',
      targetEmail: 'tester@example.com',
      correctOrigin: null,
      account: 'tester',
    });
  });

  it('규칙 8 (v1.0, 사용자 결정): origin 프로토콜 불일치를 fix_origin(autoFixable)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [],
        origin: { value: 'git@github.com:jongchoon580325/housebook.git', protocol: 'SSH' },
        credHelper: { ok: true },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'fix_origin');
    expect(issue).toBeDefined();
    expect(issue.autoFixable).toBe(true);
    expect(issue.fixType).toBe('auto');
    expect(result.recoveryPlan).toContain('fix_origin');
    expect(result._context.correctOrigin).toBe('https://github.com/jongchoon580325/housebook.git');
  });

  it('규칙 8: origin이 있고 프로토콜도 문제없으면 fix_origin을 진단하지 않는다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [],
        origin: { value: 'https://github.com/test/repo.git', protocol: 'HTTPS' },
        credHelper: { ok: true },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    expect(result.issues.find((i) => i.id === 'fix_origin')).toBeUndefined();
  });

  // v1.0 (2026-08-07, 사용자가 실제 push 권한 거부를 겪은 뒤 발견): sshIdentity는 scanner의
  // ssh-identity.js가 이미 계산해둔 값 — 규칙은 matches:false만 보고 판단한다.
  it('규칙 9: SSH 인증 계정이 origin 소유자와 다르면 wrong_ssh_account(guide, critical)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' },
        sshIdentity: { authenticatedAs: 'jongchoon580325', originOwner: 'gppc5096', matches: false, severity: 'critical' },
        credHelper: { ok: false },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'wrong_ssh_account');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('critical');
    expect(issue.autoFixable).toBe(false);
    expect(issue.fixType).toBe('guide');
    expect(issue.title).toContain('jongchoon580325');
    expect(issue.action).toEqual({ type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' });
    expect(result.recoveryPlan).not.toContain('wrong_ssh_account');
  });

  it('규칙 9: sshIdentity가 일치하거나 판단 불가(matches: true/null)면 진단하지 않는다', () => {
    const base = {
      gitInstalled: { ok: true },
      storedCreds: [],
      sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
      origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' },
      credHelper: { ok: false },
      githubConn: { ok: true },
      userName: { active: 'tester' },
      userEmail: { active: 'tester@example.com' },
    };
    const matched = ruleDiagnose({ items: { ...base, sshIdentity: { authenticatedAs: 'gppc5096', originOwner: 'gppc5096', matches: true, severity: 'ok' } } });
    expect(matched.issues.find((i) => i.id === 'wrong_ssh_account')).toBeUndefined();

    const unknown = ruleDiagnose({ items: { ...base, sshIdentity: { authenticatedAs: null, originOwner: 'gppc5096', matches: null, severity: 'warning' } } });
    expect(unknown.issues.find((i) => i.id === 'wrong_ssh_account')).toBeUndefined();
  });

  // v1.1 (2026-08-07, 사용자 요청): SSH 키와 HTTPS 인증정보가 둘 다 있으면 fix_origin이
  // 자동 판단을 포기하는데(ctx.correctOrigin===null), 그 애매한 상태를 사용자가 고르게 안내한다.
  it('규칙 10: SSH 키와 HTTPS 인증정보가 둘 다 있으면 origin_choice(guide, info)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: 'gppc5096', isWrong: false }],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' },
        credHelper: { ok: true },
        githubConn: { ok: true },
        userName: { active: 'gppc5096' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'origin_choice');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('info');
    expect(issue.autoFixable).toBe(false);
    expect(issue.action).toEqual({
      type: 'choice', label: '방식 선택',
      options: [
        { label: 'SSH 사용', value: 'ssh' },
        { label: 'HTTPS 사용', value: 'https' },
      ],
      step: 'set_origin_protocol', contextKey: 'desiredProtocol',
    });
    expect(result.recoveryPlan).not.toContain('origin_choice');
  });

  // 회귀 방지 (2026-08-08, 실사용 중 발견): origin_choice는 SSH/HTTPS 인증정보가 둘 다
  // 있는 한 어느 쪽을 고르든 항상 다시 뜬다(설계상 정상 동작) — 이걸 summary의 "문제 건수"에
  // 포함시키면 사용자가 아무리 선택해도 절대 "문제 없음"이 뜨지 않는 것처럼 보였다.
  it('규칙 10: origin_choice만 있으면(severity:info) summary는 "문제 없음"으로 취급한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: 'gppc5096', isWrong: false }],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' },
        credHelper: { ok: true },
        githubConn: { ok: true },
        userName: { active: 'gppc5096' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    // origin_choice 카드 자체는 여전히 보여준다(issues에는 포함) — 안내는 유효하므로.
    expect(result.issues.find((i) => i.id === 'origin_choice')).toBeDefined();
    // 하지만 "문제 건수"에는 안 세서, 골라도 절대 안 사라지는 것처럼 보이지 않게 한다.
    expect(result.summary).toBe('발견된 문제를 모두 해결했습니다. push를 진행하세요.');
  });

  it('규칙 10: 한쪽만 있으면(SSH만) origin_choice를 진단하지 않는다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'git@github.com:gppc5096/repo.git', protocol: 'SSH' },
        credHelper: { ok: false },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    expect(result.issues.find((i) => i.id === 'origin_choice')).toBeUndefined();
  });

  it('DSA 키를 감지하면 semi(non-autoFixable)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_dsa.pub', isDSA: true }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'dsa_key');
    expect(issue).toBeDefined();
    expect(issue.autoFixable).toBe(false);
    expect(result.recoveryPlan).not.toContain('dsa_key');
    // v1.0: semi 이슈는 SSH 키 관리 화면으로 이동하는 액션을 갖는다
    expect(issue.action).toEqual({ type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' });
  });

  it('Git 미설치를 규칙 1(no_git, guide)로 진단한다', () => {
    const scanResult = { items: { gitInstalled: { ok: false } } };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'no_git');
    expect(issue).toBeDefined();
    expect(issue.fixType).toBe('guide');
    expect(issue.autoFixable).toBe(false);
    // v1.0: guide 이슈도 "다음 행동"이 있어야 한다 — 여기서는 설치 페이지 열기
    expect(issue.action).toEqual({
      type: 'openUrl',
      label: 'Git 설치 페이지 열기',
      url: 'https://git-scm.com/downloads',
    });
  });

  it('SSH 키가 없으면 규칙 3(no_ssh, semi)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'no_ssh');
    expect(issue).toBeDefined();
    expect(issue.fixType).toBe('semi');
    expect(issue.action).toEqual({ type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' });
  });

  it('origin이 없으면 규칙 5(no_origin, guide)로 진단하고, 주소를 입력받는 input 액션을 갖는다 (v1.0)', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: null },
        githubConn: { ok: true },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'no_origin');
    expect(issue).toBeDefined();
    expect(issue.autoFixable).toBe(false);
    expect(result.recoveryPlan).not.toContain('no_origin');
    expect(issue.action).toEqual({
      type: 'input',
      label: '연결',
      placeholder: '예: https://github.com/owner/repo.git',
      step: 'add_origin',
      contextKey: 'originUrl',
    });
  });

  it('GitHub 연결 실패를 규칙 6(no_network, critical)로 진단한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: 'id_ed25519.pub', isDSA: false }],
        origin: { value: 'https://github.com/test/repo.git' },
        githubConn: { ok: false },
        userName: { active: 'tester' },
        userEmail: { active: 'tester@example.com' },
      },
    };
    const result = ruleDiagnose(scanResult);
    const issue = result.issues.find((i) => i.id === 'no_network');
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('critical');
    expect(issue.action).toEqual({ type: 'rescan', label: '다시 스캔' });
  });

  it('여러 문제가 겹치면 summary에 정확한 개수를 표시한다', () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: 'a', isWrong: true }],
        sshKeys: [{ file: 'id_dsa.pub', isDSA: true }],
        origin: { value: null },
        githubConn: { ok: false },
        userName: { active: null },
        userEmail: { active: null },
      },
    };
    const result = ruleDiagnose(scanResult);
    // wrong_cred, dsa_key, no_origin, no_network, fix_config = 5건
    expect(result.issues).toHaveLength(5);
    expect(result.summary).toBe('총 5가지 문제를 발견했습니다.');
  });
});
