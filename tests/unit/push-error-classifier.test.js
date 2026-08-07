import { describe, it, expect } from 'vitest';
import { classifyPushError } from '../../src/engine/recovery/push-error-classifier.js';

describe('classifyPushError (git push stderr → 원인 분류)', () => {
  // v1.0 (2026-08-07, 사용자가 실사용 중 발견): SSH push가 "다른 계정으로 인증됨"이라는 이유로
  // 거부되면 GitHub이 어느 계정으로 인증됐는지 메시지에 직접 알려준다 — 이 경우는 재스캔으로
  // 해결되지 않는 계정 불일치이므로 push_auth_failed와 분리해 SSH 키 관리로 안내해야 한다.
  it('GitHub의 "denied to <계정>" stderr를 push_account_mismatch로 분류하고 계정명을 메시지에 포함한다', () => {
    const issue = classifyPushError(
      'ERROR: Permission to gppc5096/US_Monthly_Dividend_ETF.git denied to jongchoon580325.\nfatal: Could not read from remote repository.'
    );
    expect(issue.id).toBe('push_account_mismatch');
    expect(issue.title).toContain('jongchoon580325');
    expect(issue.description).toContain('jongchoon580325');
    expect(issue.action).toEqual({ type: 'navigate', label: 'SSH 키 관리로 이동', to: '/ssh' });
  });

  it('인증 실패 stderr를 push_auth_failed로 분류하고 재스캔 액션을 붙인다', () => {
    const issue = classifyPushError('remote: Support for password authentication was removed\nfatal: Authentication failed for \'https://github.com/x/y.git/\'');
    expect(issue.id).toBe('push_auth_failed');
    expect(issue.action).toEqual({ type: 'rescan', label: '다시 스캔' });
  });

  it('publickey 거부 stderr도 push_auth_failed로 분류한다', () => {
    const issue = classifyPushError('git@github.com: Permission denied (publickey).');
    expect(issue.id).toBe('push_auth_failed');
  });

  it('네트워크 오류 stderr를 push_network_failed로 분류한다', () => {
    const issue = classifyPushError("fatal: unable to access 'https://github.com/x/y.git/': Could not resolve host: github.com");
    expect(issue.id).toBe('push_network_failed');
    expect(issue.action.type).toBe('rescan');
  });

  it('저장소 없음 stderr를 push_repo_not_found로 분류하고 액션은 없다(추측 불가)', () => {
    const issue = classifyPushError('remote: Repository not found.\nfatal: repository \'https://github.com/x/y.git/\' not found');
    expect(issue.id).toBe('push_repo_not_found');
    expect(issue.action).toBeUndefined();
  });

  it('non-fast-forward stderr를 push_diverged로 분류한다', () => {
    const issue = classifyPushError(
      '! [rejected]        main -> main (fetch first)\nhint: Updates were rejected because the tip of your current branch is behind'
    );
    expect(issue.id).toBe('push_diverged');
  });

  it('refspec 불일치 stderr를 push_no_commits로 분류한다', () => {
    const issue = classifyPushError("error: src refspec main does not match any");
    expect(issue.id).toBe('push_no_commits');
  });

  it('알 수 없는/빈 stderr는 push_unknown으로 분류하고 기존 범용 메시지를 유지한다', () => {
    const issue = classifyPushError('');
    expect(issue.id).toBe('push_unknown');
    expect(issue.description).toBe('git push 실패 (원격 저장소 권한 또는 네트워크를 확인하세요)');
  });
});
