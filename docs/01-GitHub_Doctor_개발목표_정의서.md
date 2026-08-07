# GitHub Doctor — 개발 목표 정의서

> Version 1.0 | 세계 최고 GitHub 시니어 관점의 완전 재정의

---

## 1. 브랜드 & 철학

| 항목 | 내용 |
|---|---|
| **브랜드명** | GitHub Doctor |
| **슬로건** | "진단하고, 고치고, Push한다 — 자동으로." |
| **핵심 철학** | 사용자는 코드에만 집중한다. 인증·계정·환경 문제는 GitHub Doctor가 책임진다. |

---

## 2. 문제 정의 — 왜 GitHub Doctor가 필요한가

### 2-1. 실제 현장에서 발생하는 변수 전체 목록

시니어 관점에서 하나의 디바이스에서 발생 가능한 인증·계정 충돌 변수는 다음과 같다.

#### 🔴 인증 레이어 충돌 (가장 빈번)
| 변수 | 설명 |
|---|---|
| Keychain 오염 (macOS) | 이전 계정 PAT가 키체인에 잔존, 새 push 시 오계정으로 자동 인증 |
| Windows Credential Manager 충돌 | `git:https://github.com` 키가 단일 계정만 저장 — 다중 계정 사용 불가 |
| GCM(Git Credential Manager) 미설정 | credential helper 누락 또는 `wincred` / `osxkeychain` 혼용 |
| PAT 만료 | Personal Access Token 유효기간 초과 (GitHub는 만료 알림 제공, 앱은 자동 감지) |
| PAT 권한 부족 | repo scope 미포함 토큰으로 push 시도 |
| SSH 키 미등록 | SSH 방식인데 GitHub 계정에 공개키가 등록되지 않음 |
| SSH 키 충돌 | 여러 계정에 동일 SSH 키 사용 (GitHub는 키 1:1 계정 원칙) |
| SSH agent 미실행 | `ssh-agent`가 꺼져 있어 키를 못 찾음 |
| DSA 키 사용 | 2022년 3월 이후 GitHub에서 완전 폐기된 형식 |
| 1년 미사용 SSH 키 자동 삭제 | GitHub 보안 정책으로 비활성 키 자동 제거 |

#### 🟡 계정 레이어 충돌
| 변수 | 설명 |
|---|---|
| `user.name` / `user.email` 불일치 | 커밋 작성자 정보가 현재 저장소 계정과 다름 |
| global vs local 설정 충돌 | global 설정이 local 설정을 덮어쓰거나 반대 상황 |
| 다중 계정 credential namespace 미분리 | 계정별 namespace 설정 없이 HTTPS 다중 계정 사용 시 충돌 |
| Collaborator 미등록 | push 계정이 저장소 소유자도, Collaborator도 아닌 상태 |
| Fork된 저장소 원본 remote 혼동 | `origin` vs `upstream` 주소 혼용 |
| Organization 권한 미승인 | Org 소속 저장소인데 SSO 인증 미완료 |

#### 🟠 Remote 레이어 충돌
| 변수 | 설명 |
|---|---|
| `origin` 주소 오류 | HTTPS/SSH 주소 혼용, 오탈자 |
| `origin already exists` | 이미 등록된 remote를 중복 추가 시도 |
| HTTPS ↔ SSH 프로토콜 혼용 | 인증 방식과 URL 프로토콜 불일치 |
| 방화벽 / 프록시 차단 | 22번 포트(SSH) 차단 환경, HTTPS fallback 필요 |
| CA 루트 인증서 만료 | OS 인증서 갱신 누락으로 TLS 연결 실패 |

#### 🟢 배포 연동 레이어 충돌
| 변수 | 설명 |
|---|---|
| Firebase 계정 불일치 | GitHub 계정과 Firebase 연동 계정이 다름 |
| GitHub Actions 토큰 만료 | CI/CD 자동화에 사용된 토큰 만료 |
| 배포 서비스 OAuth 재인증 필요 | Vercel, Netlify 등 GitHub 앱 권한 만료 |

---

## 3. 개발 목표 — 핵심 정의

> **"macOS와 Windows에서 동작하는 Electron + AI 기반 크로스 플랫폼 앱으로,**
> **디바이스의 Git 환경 전체(인증·계정·Remote·배포 연동)를 자동 스캔·진단하고,**
> **문제 원인을 AI가 특정하여 Keychain 정리 / SSH 키 관리 / PAT 재발급 안내 / Git 설정 교체 / Remote 재연결까지**
> **사용자 개입을 최소화한 완전 자동 복구로 Push 성공을 보장하는 GitHub Doctor를 구현한다."**

---

## 4. 기술 스택 & 아키텍처

### 4-1. 패키지 & OS

| 항목 | 내용 |
|---|---|
| **형태** | Electron 데스크탑 앱 (GUI) + 내장 CLI 진단 엔진 |
| **타겟 OS** | macOS (Intel / Apple Silicon) + Windows 10/11 |
| **배포** | macOS `.dmg` / Windows `.exe` 인스톨러 |
| **AI 엔진** | Claude API (Sonnet) — 진단 분석 및 자연어 안내 |

### 4-2. 핵심 기술 구성

```
┌─────────────────────────────────────────────┐
│              GitHub Doctor (Electron GUI)    │
├─────────────┬───────────────────────────────┤
│  진단 엔진   │  AI 엔진 (Claude API)          │
│  (Node.js)  │  - 원인 분석                   │
│  - Git CLI  │  - 복구 경로 결정              │
│  - SSH 검사 │  - 자연어 안내 생성            │
│  - Keychain │                               │
│  - GCM      │                               │
├─────────────┴───────────────────────────────┤
│         macOS / Windows OS 레이어            │
│  Keychain Access / Windows Credential Mgr   │
│  ssh-agent / Git Credential Manager (GCM)   │
└─────────────────────────────────────────────┘
```

---

## 5. 기능 정의 — 자동화 범위

### Phase 1 : 자동 스캔 (사용자 개입 없음)
| 스캔 항목 | macOS | Windows |
|---|:---:|:---:|
| Git 설치 여부 및 버전 | ✅ | ✅ |
| `user.name` / `user.email` (global/local) | ✅ | ✅ |
| credential helper 종류 확인 | ✅ | ✅ |
| Keychain 저장된 GitHub 인증정보 | ✅ | — |
| Windows Credential Manager GitHub 항목 | — | ✅ |
| SSH 키 존재 여부 및 유형 (Ed25519/RSA/DSA) | ✅ | ✅ |
| ssh-agent 실행 상태 | ✅ | ✅ |
| `origin` remote 주소 및 프로토콜 | ✅ | ✅ |
| GitHub API 연결 상태 (네트워크/방화벽) | ✅ | ✅ |
| PAT 유효성 (GitHub API 호출로 검증) | ✅ | ✅ |

### Phase 2 : AI 진단 (원인 특정)
- 스캔 결과 전체를 AI에 전달
- 충돌 원인 우선순위 정렬 (Critical / Warning / Info)
- 최적 복구 경로 1개 결정 + 대안 경로 제시
- 초보자용 자연어 설명 생성

### Phase 3 : 자동 복구 (최소 개입)
| 복구 항목 | 자동 | 반자동(1클릭) | 안내만 |
|---|:---:|:---:|:---:|
| 잘못된 Keychain 인증정보 삭제 | ✅ | — | — |
| Windows Credential Manager 정리 | ✅ | — | — |
| `user.name` / `user.email` 교체 | ✅ | — | — |
| `origin` remote 주소 수정 | ✅ | — | — |
| SSH 키 생성 (Ed25519) | — | ✅ | — |
| SSH 공개키 클립보드 복사 + GitHub 등록 안내 | — | ✅ | — |
| PAT 재발급 (GitHub 설정 페이지 직접 오픈) | — | — | ✅ |
| PAT 저장 및 credential 적용 | ✅ | — | — |
| `git push` 최종 실행 및 결과 확인 | ✅ | — | — |
| Firebase / Vercel 재연동 안내 | — | — | ✅ |

> **자동 처리 원칙:** 토큰·SSH 키 등 보안 민감 항목은 생성·등록 후 즉시 암호화 저장, 평문 노출 금지.

---

## 6. 사용자 경험 (UX) 목표

```
앱 실행
  ↓
[1단계] 프로젝트 폴더 선택 (드래그&드롭 or 탐색기)
  ↓
[2단계] 자동 스캔 (10초 이내)
  ↓
[3단계] AI 진단 결과 표시
        "문제를 2가지 발견했습니다.
         ① Keychain에 다른 계정 토큰이 남아 있습니다.
         ② SSH 키가 GitHub에 등록되지 않았습니다."
  ↓
[4단계] [자동 복구 시작] 버튼 1회 클릭
  ↓
[5단계] 단계별 복구 진행 상황 표시
  ↓
[6단계] Push 성공 확인 화면
        "✅ Push 완료 — jongchoon580325/project main"
```

---

## 7. 개발 단계 (Roadmap)

| 단계 | 내용 | 목표 |
|---|---|---|
| **v0.1 MVP** | CLI 진단 엔진 + 스캔 결과 출력 | 핵심 변수 탐지 검증 |
| **v0.5 Beta** | Electron GUI + AI 진단 연동 | UX 검증 |
| **v1.0 정식** | 자동 복구 전체 + macOS/Windows 동시 배포 | 완전 자동화 |
| **v1.5** | Firebase / Vercel 배포 연동 진단 추가 | 배포 레이어 확장 |
| **v2.0** | 다중 계정 프로파일 관리 + 팀 공유 기능 | 중급자·팀 사용 |

---

## 8. 한 줄 개발 목표 (최종)

> **"초보자가 GitHub 인증·계정 문제에 막히는 순간,**
> **GitHub Doctor가 디바이스 전체를 스캔·진단·자동 복구하여**
> **사용자는 단 한 번의 클릭으로 Push 성공에 도달한다."**
