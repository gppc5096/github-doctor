# GitHub Doctor

> "진단하고, 고치고, Push한다 — 자동으로."

AI 기반 GitHub 인증·계정 자동 진단 및 복구 앱 (Electron + Vue 3 + Claude API). 핵심 로직(v0.1~v1.0 통합 테스트)까지 완료했고, 남은 건 실계정 QA·패키징·배포입니다.

## 문서

- [`docs/01-GitHub_Doctor_개발목표_정의서.md`](docs/01-GitHub_Doctor_개발목표_정의서.md) — 문제 정의 및 개발 목표
- [`docs/02-GitHub_Doctor_Design_PRD_v1.md`](docs/02-GitHub_Doctor_Design_PRD_v1.md) — PRD (화면 설계, 자동화 기준, 로드맵)
- [`docs/03-GitHub_Doctor_실전개발계획서_v1.1_완전판.md`](docs/03-GitHub_Doctor_실전개발계획서_v1.1_완전판.md) — 실전 개발 계획서 (코드 골격, 판단 기준, 코드 분리 원칙) — **구현 시 최우선 참고 문서**
- [`TODO.md`](TODO.md) — 현재 진행 상태 및 개발 위임 원칙

## 빠른 시작

```bash
npm install

# CLI로 진단만 실행 (현재 디렉터리 기준)
npm run scan

# 다른 프로젝트 경로 지정
node src/engine/cli.js /path/to/project

# Electron GUI 개발 서버 (SCR-01 대시보드) — 반드시 터미널 2개를 "따로" 띄워야 함
npm run dev                              # 터미널 1: Vite dev server
NODE_ENV=development npm start           # 터미널 2: 실제 Electron 창

# 프로덕션 빌드 검증 (electron-builder 패키징 없이 vite build만)
npx vite build

# 테스트 (전부 fake 데이터로만 동작, 실제 Keychain/SSH/네트워크/Claude API 미접근)
npm test
```

> ⚠️ 진짜 Electron 창(타이틀바 등)은 스크린샷할 도구가 없어 직접 확인이 어렵습니다. 다만 `npm run dev`로 띄운 Vite dev server는 일반 브라우저 탭으로 열어 레이아웃·스타일을 확인할 수 있습니다 — 이 방법으로 검증 완료했습니다. 단, 일반 브라우저 탭에는 Electron의 `window.electronAPI`가 없어 앱이 이를 감지하면 상단에 경고 배너가 뜹니다(v1.0에 추가한 방어 코드 — 예전에는 여기서 uncaught exception이 났었음). 스캔→진단→복구 카드 전체 레이아웃은 브라우저에 `window.electronAPI`를 임시로 가짜 주입해 확인했습니다.
>
> **`npm start`로 창을 띄웠는데도 폴더 선택이 안 되거나 상단에 경고 배너가 보인다면** preload.js가 제대로 로드되지 않은 것이니, 터미널 2(Electron)의 에러 로그를 확인하세요.

### AI 진단 (선택)

`.env.example`을 `.env`로 복사하고 `ANTHROPIC_API_KEY`를 채우면 `runDiagnose()`가 Claude API로 진단을 시도합니다. 키가 없거나 API 호출이 실패하거나 응답이 JSON이 아니면 자동으로 규칙 기반(`diagnosis/rule-engine/`)으로 폴백합니다. 키를 설정하지 않으면 기본값으로 항상 규칙 기반 경로만 사용됩니다.

### `GH_DOCTOR_MOCK_ADAPTER` 환경변수

`GH_DOCTOR_MOCK_ADAPTER=1`을 설정하면 OS 자격증명 저장소(Keychain / Windows Credential Manager)를 전혀 조회하지 않고 빈 목록을 반환합니다. CLI를 수동으로 점검할 때, 실제 계정 정보를 건드리지 않고 나머지 스캔 흐름만 확인하고 싶을 때 사용하세요.

```bash
GH_DOCTOR_MOCK_ADAPTER=1 node src/engine/cli.js tests/fixtures/dummy-repo
```

## 프로젝트 구조

```
src/
├── main/            # Electron 메인 프로세스
│   ├── index.js         # 앱 진입점 (BrowserWindow 생성)
│   ├── preload.js          # contextBridge 보안 브릿지
│   └── ipc-handlers.js       # IPC 채널 핸들러 (scan/diagnose/ssh/credential/openUrl/dialog)
├── renderer/        # Vue 3 UI — App.vue가 Sidebar+본문 셸을 구성
│   ├── router/, stores/(scan·diagnosis·recovery·ssh·credentials)
│   ├── components/
│   │   ├── Sidebar.vue, TopBar.vue, PathBar.vue     # 공통 셸 컴포넌트 (PathBar: 네이티브 폴더 선택 다이얼로그 포함)
│   │   ├── ScanResultCard.vue, DiagnosisCard.vue      # 스캔/진단 결과 카드
│   │   ├── IssueItem.vue                                # 이슈 1건 + "다음 행동" 버튼/입력창 (openUrl/navigate/input/rescan)
│   │   └── RecoverySteps.vue, ActionBar.vue             # 복구 타임라인 + 액션 바
│   └── views/
│       ├── Dashboard.vue    # SCR-01 (docs/02 §5-2 와이어프레임 그대로 구현)
│       ├── SshManager.vue     # SCR-04 (SSH 키 목록·생성·삭제·공개키 복사)
│       └── CredentialManager.vue  # SCR-03 (PAT 등록 — 마스킹 입력, docs/03 §16)
├── engine/          # 진단·복구 엔진 (Node.js)
│   ├── git-helper.js     # git/시스템 명령 실행 유틸
│   ├── scanners/           # Phase 1: 9개 항목 자동 스캔 (항목별 파일 분리)
│   │   └── index.js          # 오케스트레이터 (git-install/user-config/cred-helper/ssh-keys/stored-creds/ssh-agent/origin-remote/ssh-identity/github-conn)
│   ├── ai-diagnosis.js       # Phase 2: Claude AI 진단 (실패 시 자동 폴백)
│   ├── diagnosis/               # Phase 2 폴백: 규칙 기반 진단
│   │   └── rule-engine/           # index.js(오케스트레이터) + rules/ 8개 파일 (규칙별 분리)
│   ├── recovery-context.js       # scanResult → 복구 스텝 실행 컨텍스트 (_context)
│   ├── recovery/                   # Phase 3: 자동 복구 (스텝별 파일 분리)
│   │   ├── index.js                 # 오케스트레이터 (push는 steps에 명시된 경우만 실행)
│   │   ├── step-registry.js           # 스텝 id → 실행 함수 매핑
│   │   ├── push-error-classifier.js     # push 실패 stderr → 원인 분류(6종) + 다음 행동
│   │   └── steps/                       # fix-wrong-cred / fix-user-config / fix-origin / add-origin / gen-ssh-key / run-push
│   ├── pat-validator.js          # PAT 유효성 + repo 스코프 확인 (docs/03 §16)
│   ├── pat-store.js                 # git credential approve로 PAT 저장 (stdin 전달, 로그 노출 없음)
│   ├── cred-helper-setup.js            # credential.helper 플랫폼 기본값 설정
│   └── cli.js                    # 터미널 진입점
├── adapters/        # OS별 인증 어댑터 (macOS Keychain / Windows Credential Manager, SSH 키 생성·삭제 포함)
└── shared/          # Main·Renderer 공용 IPC 채널 상수

tests/
├── unit/            # 단위 테스트 (전부 DI로 fake 데이터 주입, 실제 OS 미접근)
├── integration/
└── fixtures/        # 테스트 전용 더미 데이터 (dummy-repo, ssh 등)
```

## 개발 원칙 (요약)

자세한 내용은 `TODO.md`와 `docs/03` §0-3·§15를 참고하세요.

- 파일/함수는 하나의 일만 한다 (파일 100줄, 함수 20줄 목표)
- OS별 코드는 어댑터로 분리, 절대 한 파일에 섞지 않는다
- 테스트는 항상 fake 데이터로만 진행한다 — 실제 Keychain/SSH/계정은 절대 건드리지 않는다
- AI 진단 실패 시 규칙 기반 폴백이 반드시 동작해야 한다
- **git 커밋·push·실계정 통합 테스트는 프로젝트 완성 후 사용자 지시가 있을 때만 진행한다**

## 현재 상태

- [x] v0.1 MVP — 스캐폴딩, `scanner.js`(8개 항목), OS 어댑터, CLI, README
- [x] v0.2 — 규칙 기반 진단 엔진 (`rule-diagnosis.js`, 규칙 7개, 테스트 10개)
- [x] v0.3 — macOS/Windows 어댑터 완성 (조회·삭제·저장·SSH생성, DI 테스트 12개)
- [x] v0.4 — Claude AI 진단 연동 + 3가지 폴백 경로(키 없음/API 실패/파싱 실패) 테스트 5개
- [x] v0.5 Beta — Electron 메인/프리로드/IPC + Vue 렌더러 + SCR-01 대시보드 (PRD 와이어프레임대로 재구현 완료 — 처음엔 최소 골격만 만들고 "완료"로 잘못 표기했던 것을 사용자 스크린샷 비교로 발견 후 수정)
- [x] v0.6 — 자동 복구 엔진 (`recovery/`, 스텝 5개), wrong_cred→fix_config→push 흐름을 fake로 검증 + IPC 연결
- [x] v0.7 — Windows 완전 지원 (macOS와 동시 구현됨, UserName 버그 수정 포함 5개 테스트로 확인)
- [x] v0.8 — SSH 키 관리 화면 (SCR-04, `deleteSshKey`/`readSshPublicKey` IPC 신규 추가)
- [x] v1.0 착수 — 통합 테스트(스캔→진단→복구→push 전체 흐름) + `isWrong`(오계정 감지) 로직 구현
  - 다중 계정 충돌 감지 방식(2개 이상 저장 + 그중 하나가 현재 git 계정과 일치할 때만 나머지를 wrong으로 표시)은 사용자 결정 사항. 자세한 배경은 `TODO.md` 참고
- [x] v1.0 착수 — `diagnosis._context` 구현 (`recovery-context.js`, 신규): 복구 스텝이 필요로 하는 `wrongCreds`/`targetAccount`/`targetEmail`/`correctOrigin`을 규칙·AI 진단 결과에 공통으로 채움. 채울 값이 실제로 없으면 `fix_config`를 `guide`로 낮추고, 복구 스텝도 값 없이는 git config/remote를 건드리지 않고 명확히 실패하도록 가드 추가
- [x] v1.0 착수 — `fix_origin` 자동/반자동 분류 결정 (사용자 결정: "프로토콜 불일치만 완전자동"): origin이 있는데 HTTPS/SSH 프로토콜과 사용 가능한 인증 수단이 안 맞는 경우만 owner/repo를 유지한 채 기계적으로 변환해 완전자동 처리. origin이 아예 없거나 완전히 다른 저장소인 경우는 여전히 `guide`
- [x] v1.0 착수 — SCR-02 네이티브 폴더 선택 다이얼로그 (`dialog:selectFolder` IPC 신규, 사용자 요청): PRD가 원래 명시했던 "탐색기로 폴더 선택" 기능을 `PathBar.vue`에 추가. 수동 경로 입력도 그대로 유지
- [x] v1.0 착수 — `window.electronAPI` 없을 때 방어 코드 (사용자가 실사용 중 발견한 uncaught exception 수정): `App.vue`에 경고 배너, `PathBar.vue`에 인라인 에러 처리 추가
- [x] v1.0 착수 — "An object could not be cloned" 수정 (사용자가 실사용 중 발견, API 키와 무관): Pinia reactive 객체를 IPC로 그대로 넘기면 구조화 복제가 실패함 — `utils/ipc-safe.js`의 `toIpcSafe()`로 plain 객체 변환 후 전달하도록 `stores/diagnosis.js`/`stores/recovery.js` 수정, `ActionBar.vue`에 복구 에러 메시지 표시 추가. **실사용 확인 완료** — 스캔→규칙 기반 진단(문제 1건, no_origin)까지 실제로 정상 작동
- [x] v1.0 착수 — 사이드바 로고가 macOS 신호등 버튼과 겹쳐 보이던 문제 수정 (`.sidebar` 상단 패딩 40px로 확대)
- [x] v1.0 착수 — 신호등 근처 드래그로 창 이동이 안 되던 문제 수정 (`.sidebar-logo`에 `-webkit-app-region: drag` 추가, 1차 수정은 패딩과 드래그 속성이 다른 요소에 있어 불완전했음 — 같은 요소로 통합). Electron 전용 동작이라 브라우저로는 검증 불가 — 실 Electron 창에서 확인 필요
- [x] v1.0 착수 — 상단 드래그 영역을 전체 폭으로 확장 (사용자 요청): `.sidebar-logo`와 각 화면 `.top-bar`를 같은 상단 오프셋(40px)으로 정렬하고 둘 다 드래그 가능하게 만들어 하나로 이어진 상단 바처럼 보이게 함. 버튼 영역(`.top-bar-actions`)은 `no-drag`로 클릭 유지. 공유 헤더 컴포넌트로 완전히 합치는 대신 CSS 정렬만으로 처리(구현 리스크 낮음)
- [x] v1.0 착수 — 진단 이슈에 "다음 행동" 추가 (사용자가 실사용 중 발견한 UX 공백, 시니어가 구체안 설계): guide/semi 이슈가 텍스트만 보여주고 사용자를 방치하던 문제. `openUrl`/`navigate`/`input`/`rescan` 4가지 액션 타입 추가, `add_origin` 복구 스텝 신규(`no_origin` 이슈에 주소 입력→즉시 연결). 브라우저에서 `input`(연결→재스캔→문제 해소)과 `navigate`(SSH 키 관리 이동) 전체 흐름 실제 클릭까지 확인
- [x] v1.0 착수 — 복구 스텝들이 git 명령 실패를 확인 안 하고 항상 "성공" 반환하던 버그 수정 (사용자가 "진짜 실행되는지" 질문하며 발견): `add-origin`/`fix-origin`/`fix-user-config`/`fix-wrong-cred` 전부 결과 확인 후 실패 시 명확히 throw하도록 통일
- [ ] v1.0 잔여 — 실제 QA(실계정) · 코드 서명 · 패키징 · 배포 (사용자 지시 필요)

테스트 총 104개 통과 (`npm test`). 이후 로드맵과 알려진 한계는 `TODO.md`를 참고하세요.
