# GitHub Doctor — TODO

> 이 문서는 진행 상태만 보여주는 **얇은 뷰**입니다. 세부 스펙·코드 골격·판단 기준은
> `docs/03-GitHub_Doctor_실전개발계획서_v1.1_완전판.md`의 §12(로드맵)·§12-1(v0.1 MVP 4주 계획)이
> 유일한 원본(source of truth)입니다. 내용이 바뀌면 03번 문서를 먼저 고치고, 여기는 체크 상태만 갱신하세요.

## 개발 위임 원칙 (승인 체크포인트는 딱 1곳)

- **테스트는 항상 더미 데이터로만 진행한다.** 실제 `~/.ssh`, 실제 macOS Keychain / Windows
  Credential Manager의 `github.com` 항목, 실제 GitHub 계정/PAT는 개발 중 절대 건드리지 않는다.
  - SSH 키 테스트 → `tests/fixtures/ssh/` 등 임시 디렉터리에서만 생성·삭제
  - Keychain/Credential Manager 테스트 → `github-doctor-test` 같은 테스트 전용 서비스명 사용
  - origin/remote·커밋 관련 로직 테스트 → `tests/fixtures/dummy-repo/` 같은 로컬 스크래치 저장소 사용
- 위 원칙을 지키는 한, 코드 작성·리팩터링·패키지 설치·단위/통합 테스트·문서 갱신은 **모두 사전 확인 없이 진행**한다.
- **git 커밋·git push·실계정을 사용하는 통합 테스트는 프로젝트 완성 후 딱 한 번, 사용자가 직접 지시할 때만 진행한다.**
  그 전까지는 실행하지 않는다. (§12 로드맵의 v1.0 QA 단계와 자연스럽게 겹치는 지점)

## ✅ 해결된 핵심 기능 공백

- [x] **`storedCreds[].isWrong`이 실제로는 절대 계산되지 않던 문제 (v1.0 통합 테스트 작성 중 발견, 사용자 결정으로 해결).**
  `wrong_cred` 규칙(제품 문제 정의서의 첫 번째 사례)이 발동하지 않던 원인이었음. **사용자가 "다중 계정
  충돌만 감지" 방식을 선택** — Keychain/Credential Manager에 계정이 2개 이상 저장돼 있고 그중 하나가
  현재 git 커밋 계정(`userName.active`)과 일치할 때만, 일치하지 않는 나머지를 `isWrong:true`로 표시.
  계정이 1개뿐이거나 일치하는 게 하나도 없으면(모호함) 절대 건드리지 않음 — 오탐으로 유효한
  자격증명을 지우는 사고를 막기 위한 안전 우선 원칙. `scanner.js`에 구현, `SshManager`가 생성한
  `id_ed25519_<account>` 키 파일명에서 후보 계정을 추출해 `getStoredCredentials`에 넘기고, 어댑터가
  그 계정들의 존재 여부만 추가로 확인(macOS: `-a <account>` 존재 확인만, 비밀번호 요청 없음 / Windows:
  `git:https://<account>@github.com` namespaced target 확인). 단위 테스트 7개 + 통합 테스트로 우회 없이
  검증 완료.
  > ⚠️ **알려진 한계 (실제 다중 계정 기기로 검증되지 않음)**: 후보 계정은 이 앱이 SSH 키를 만들어준
  > 계정만 알 수 있어, GitHub Doctor로 생성하지 않은 SSH 키를 쓰는 계정이 Keychain에 남아있으면
  > 여전히 놓칠 수 있음. macOS의 "전체 계정 나열"은 Keychain 전체 덤프가 필요해 침습적이라 의도적으로
  > 구현하지 않음. 실제 다중 계정 기기에서의 검증은 v1.0 QA(실계정) 단계에서 사용자가 직접 확인 필요.

- [x] 1주차 — 개발 환경 구축 + 스캐폴딩 + package.json 완성 (§1, §2)
- [x] 2주차 — git-helper.js + scanner.js 8개 항목 구현 (§4)
- [x] 3주차 — macOS/Windows 어댑터 + 단위 테스트 16개 (§7-2, §7-3)
- [x] 4주차 — 터미널 실행 확인 + JSON 출력 검증 + README 작성

완료 기준(§12): `scanner.js` 실행 시 8개 항목 JSON 출력 → `GH_DOCTOR_MOCK_ADAPTER=1 node src/engine/cli.js tests/fixtures/dummy-repo`로 확인 완료

> ⚠️ **3주차 중 발견한 사고 + 조치**: 처음엔 `vi.mock`으로 어댑터를 목(mock) 처리했는데, CJS `require` 체인을 vi.mock이 놓쳐서 테스트가 실제 `ssh-keygen`을 실행(`/tmp`에 더미 키 생성, 즉시 삭제 조치함)하고 실제 macOS Keychain의 `github.com` 항목을 조회(다행히 항목이 없어 아무것도 읽히지 않음)하는 일이 있었음. 이후 `vi.mock` 의존을 전부 제거하고, `scanner.js`·`macos-adapter.js`·`windows-adapter.js`를 **의존성 주입(DI)** 구조로 리팩터링해 테스트가 fake 함수만 호출하도록 구조적으로 강제함. 재발 방지를 위한 안전장치로 `GH_DOCTOR_MOCK_ADAPTER=1` 환경변수도 추가(README 참고).

> ⚠️ **v0.5 빌드 중 발견한 이슈 3건 (docs/03 §6-1에는 없던 내용, §14 트러블슈팅에도 추가함)**:
> 1. `vite-plugin-electron`의 `entry`는 vite `root`(src/renderer) 기준이 아니라 프로젝트 루트 기준 절대경로여야 함 → `vite.config.mjs`에서 절대경로로 수정
> 2. 메인 프로세스 빌드가 `keytar` 네이티브(.node) 모듈까지 번들링하려다 실패 → `rollupOptions.external`로 node_modules 전체를 번들 제외 처리
> 3. `vite.config.mjs`의 `root: 'src/renderer'`를 Vitest가 그대로 물려받아 `tests/unit`을 못 찾음 → `vitest.config.mjs`를 별도로 분리
>
> **여전히 확인 못 한 것**: 진짜 Electron 창(타이틀바, 네이티브 메뉴 등)은 스크린샷할 도구가 없음. 다만
> `npm run dev`(Vite dev server)는 일반 Chrome 탭으로 열어 브라우저 자동화 도구로 직접 확인 가능 —
> Vue 렌더러 자체의 레이아웃·스타일·상호작용은 이 방법으로 검증했음(아래 참고). `window.electronAPI`는
> Electron의 preload.js가 주입하는 것이라 일반 브라우저 탭에는 없어 스캔 버튼을 누르면
> "Cannot read properties of undefined (reading 'scan')" 에러가 뜨는데, 이건 버그가 아니라 정상.

> ⚠️ **v0.5 당시 SCR-01을 PRD 와이어프레임(docs/02 §5-2)대로 만들지 않고 최소 골격(경로 입력창 +
> 버튼 2개)만 만들어놓은 채 "완료"로 표기했던 문제 (사용자가 스크린샷 비교로 발견, 수정 완료)**.
> 사이드바(9개 메뉴, 미구현 화면은 비활성 표시)·상단바(제목+문제 뱃지+재스캔/리포트)·복구 진행
> 타임라인(`RecoverySteps.vue`, 신규)·액션 바(`ActionBar.vue`, 신규)가 전부 빠져 있었음. `App.vue`를
> 셸(사이드바+본문)로 재구성하고 `stores/recovery.js`(Pinia, 신규)로 IPC `recover`/`onProgress`를
> 연결해 다시 만듦. Vite dev server를 브라우저로 열고 `window.electronAPI`를 임시로 fake 주입해
> 스캔→진단→복구 카드 전체가 실제로 렌더링되는 것까지 스크린샷으로 확인.
> **교훈**: "완료"라고 표기하기 전에 PRD 와이어프레임과 실제 구현을 나란히 놓고 비교했어야 함 — 코드가
> 동작한다고 해서 디자인 스펙을 만족한다는 뜻은 아님.
>
> 이 과정에서 발견한 별도 공백(→ 아래 항목으로 바로 해결함): `rule-diagnosis.js`/`ai-diagnosis.js`가
> 반환하는 진단 결과에는 `recoveryPlan`(스텝 id 배열)만 있고 컨텍스트가 없어서 `stores/recovery.js`가
> 빈 `{}`로 복구를 호출하고 있었음.

- [x] **`diagnosis._context` 채우기 (위에서 발견한 공백, 바로 이어서 해결함)**. 신규
  `src/engine/recovery-context.js`의 `buildRecoveryContext(scanResult)`가 `wrongCreds`/`targetAccount`/
  `targetEmail`/`correctOrigin`/`projectPath`를 scanResult로부터 도출한다. `targetAccount`는
  `userName.active` 우선, 없으면 `isWrong`이 아닌 storedCred 계정으로 대체. **`targetEmail`은
  Keychain/git config 외에 알아낼 방법이 없어서, 진짜로 알 수 있을 때만 값이 채워진다.**
  `rule-diagnosis.js`와 `ai-diagnosis.js` 둘 다 `_context`를 반환에 포함(AI는 프롬프트에 `context`
  필드도 요청하고, AI가 값을 제시하면 기본값보다 우선 적용). 부수적으로 규칙 7(`fix_config`)도
  손봄 — 자동으로 채울 계정/이메일 정보가 실제로 있을 때만 `autoFixable:true`로 표시하고, 없으면
  `guide`로 낮춤 (이전엔 무조건 `auto`라고 주장했는데, email을 알아낼 방법이 없는 "완전 초기 상태"에서는
  거짓 약속이었음). `fix-user-config.js`/`fix-origin.js`에도 필수값이 비어 있으면 git config/remote에
  문자열 `"undefined"`를 쓰지 않고 명확히 실패하는 가드를 추가(방어적 이중 안전장치). 단위 테스트
  9개(recovery-context 4 + rule-diagnosis 2 + ai-diagnosis 1 + recovery 가드 2) + 통합 테스트 갱신으로
  검증 완료 (`GH_DOCTOR_MOCK_ADAPTER=1 node src/engine/cli.js` 실행 결과에서 `_context` 확인 완료).

- [x] **`fix_origin` 자동/반자동 분류 결정 (사용자 결정: "프로토콜 불일치만 완전자동").**
  origin이 아예 없는 경우(`no_origin`)는 로컬 정보만으로 목표 저장소를 알 수 없어 여전히 `guide`.
  새로 추가한 **규칙 8**: origin은 있는데 사용 가능한 인증 수단과 프로토콜(HTTPS/SSH)이 맞지 않는
  경우만 감지 — owner/repo 경로는 그대로 두고 프로토콜만 기계적으로 바꾸는 것이라 "어느 저장소가
  맞는지" 추측할 필요가 없어 안전하게 완전자동(`autoFixable:true`)으로 처리. `recovery-context.js`에
  `detectCorrectOrigin()`/`convertOriginProtocol()` 추가(github.com 형식이 아니면 안전하게 null 반환,
  Enterprise 등은 건드리지 않음). 완전히 다른 저장소를 가리키는 경우는 여전히 감지하지 않음(알 방법
  없음). 단위 테스트 9개(recovery-context 6 + rule-diagnosis 2 + 기존 1개 정정) 추가. 이 작업 중 기존
  통합 테스트의 "문제 없음" 픽스처가 실제로는 (SSH 키 있음 + HTTPS credential helper 없음) 프로토콜
  불일치 조건을 만족해 새 규칙이 정상적으로 걸려 넘어지는 걸 발견 — 픽스처에 credential helper를
  추가해 진짜 "문제 없음" 시나리오로 수정함 (새 규칙이 실제로 동작한다는 증거이기도 함).

> ℹ️ **v0.6 설계 결정**: docs/03 §8(v0.1 시절 예시)의 flat `recovery.js`는 모든 스텝 성공 시 `push`를 오케스트레이터가 자동으로 덧붙였다. 이렇게 하면 SCR-04에서 "SSH 키만 생성"처럼 단일 반자동 동작을 실행해도 의도치 않게 push까지 이어질 위험이 있어, §8이 아니라 **§15-3의 최종 분리 구조를 그대로 따라** `push`를 자동으로 덧붙이지 않고 호출자가 `plan.steps`에 명시적으로 포함해야만 실행되게 구현함 (§15-3 예시 코드와 실제 구현이 일치).

> ℹ️ **v0.8 중 발견한 문서 공백 2건**: (1) 원본 docs/02 SCR-04 와이어프레임에 SSH 키 "[삭제]" 버튼이 있었지만, 정작 어댑터 코드(§7-2/7-3)에는 `deleteSshKey` 함수가 없었음 — macOS/Windows 어댑터에 새로 추가(DI 테스트 포함). (2) docs/01·02의 Phase 1 스캔 표는 "SSH 키 GitHub 등록 여부"를 스캔 항목으로 명시하지만 `scanner.js`(§4-2) 코드에는 실제 구현이 없음(로컬 키 존재 여부만 확인) — GitHub API로 실제 등록 여부를 확인하려면 PAT 인증이 필요해 범위가 커지므로, v1.0 QA 단계 이전에 별도로 다룰지 결정 필요.

> ℹ️ **v1.0 추가: 네이티브 폴더 선택 다이얼로그 (SCR-02, 사용자 요청)**. `PathBar.vue`가 수동 텍스트
> 입력만 지원하던 것을, docs/02 §5-3 SCR-02 와이어프레임이 원래 명시했던 "드래그&드롭 or 탐색기"
> 중 탐색기(네이티브 다이얼로그) 부분을 추가로 구현함. `dialog:selectFolder` IPC 채널 신규
> (`ipc-handlers.js`가 `electron`의 `dialog.showOpenDialog({properties:['openDirectory']})` 사용).
> 사용자가 다이얼로그로 직접 고른 경로는 별도 "확인" 클릭 없이 즉시 확정·스캔까지 이어지고, 수동
> 타이핑은 기존대로 Enter/확인이 필요함. Electron 전용 API라 브라우저에서는 재현 불가 — Vite dev
> server에 `window.electronAPI.selectFolder`를 가짜로 주입해 클릭→경로 채움→자동 스캔 트리거까지
> 스크린샷으로 확인함(README 방식과 동일).

> ⚠️ **v1.0: "폴더 선택 눌러도 파인더가 안 뜸" (사용자가 실제 사용 중 발견, 콘솔 로그로 원인 확인)**.
> `recovery.js:14`/`PathBar.vue:45`에서 "Cannot read properties of undefined (reading
> 'onProgress'/'selectFolder')" — `window.electronAPI` 자체가 `undefined`였음. `favicon.ico 404`,
> Vue devtools 로그 등 정황상 **일반 Chrome 탭으로 `localhost:5173`을 직접 연 것**으로 보임(Vite dev
> server만 실행하고 `npm start`는 별도로 안 띄웠을 가능성). `window.electronAPI`는 Electron의
> preload.js가 주입하는 것이라 일반 브라우저 탭엔 원래 없음 — 실제 앱을 쓰려면 `npm run dev`와
> `NODE_ENV=development npm start`를 **별도 터미널 두 개**로 띄워야 함.
> 원인과 별개로, 이 상황에서 uncaught exception만 뜨는 건 앱 자체의 결함이라 방어 코드 추가:
> `App.vue`가 마운트 시 `window.electronAPI` 존재 여부를 확인해 없으면 상단에 경고 배너를 띄우고
> (`stores/recovery.js`의 `listen()` 호출도 스킵), `PathBar.vue`의 `browseFolder()`도 electronAPI
> 없으면 uncaught 대신 인라인 에러 문구를 표시하도록 수정. 브라우저에서 electronAPI를 주입하지 않은
> 상태로 다시 열어 배너·인라인 에러 둘 다 정상 표시되는 것을 스크린샷으로 확인함.

> ⚠️ **v1.0: "진단 실패: An object could not be cloned." (사용자가 실제 폴더 선택 성공 후 발견 —
> API 키 미설정 때문이라고 짐작했으나 실제로는 무관함).**
> `scanStore.scanResult`는 Pinia(Vue reactivity)가 감싼 **Proxy 객체**인데, 이걸 그대로
> `window.electronAPI.diagnose(scanResult)`로 넘기면 `ipcRenderer.invoke`가 렌더러→메인 전송을 위해
> 구조화 복제(structured clone)를 시도하다가 Proxy를 처리하지 못해 실패한다. **AI 경로든 규칙 기반
> 경로든 상관없이 메인 프로세스(진단 로직)에 도달하기도 전에** 발생하는 에러라, API 키 설정 여부와는
> 무관했음. 같은 패턴이 `recoveryStore.start(diagnosis)`(→`diagnosis._context`도 reactive)에도
> 잠재해 있어서 함께 고침.
> **조치**: `src/renderer/utils/ipc-safe.js`에 `toIpcSafe()`(JSON round-trip으로 순수 plain 객체
> 생성) 신규 추가, `stores/diagnosis.js`의 `runDiagnose()`와 `stores/recovery.js`의 `start()`에서
> IPC 호출 직전 적용. `recovery.js`의 `start()`는 원래 try/catch가 아예 없어서 IPC 자체가 실패하면
> uncaught rejection이었던 것도 함께 고쳐 `recoveryStore.error`에 담기게 하고, `ActionBar.vue`가
> 그 메시지를 실제로 화면에 보여주도록 수정(전에는 "복구 중 오류 발생 ⚠️"만 뜨고 원인은 안 보였음).
> `ssh.js` 스토어는 문자열(primitive)만 넘겨서 이 문제와 무관 — Vue reactive()는 객체/배열만 Proxy로
> 감싸고 원시값은 그대로라 안전함. 단위 테스트 3개(`toIpcSafe`) 추가.
> **참고**: 수정 후에도 Electron 창에서 같은 에러가 계속 보였는데, Vite HMR이 Electron 렌더러까지
> 안정적으로 전파되지 않아서였음 — Electron 창에서 수동 새로고침(Cmd+R) 후 정상 확인됨. 코드 수정
> 후에도 Electron 창에 예전 에러가 남아있으면 먼저 Cmd+R부터 시도할 것.

> ⚠️ **v1.0: 사이드바 로고가 macOS 신호등 버튼과 겹쳐 보임 (사용자 스크린샷으로 발견)**.
> `titleBarStyle: 'hiddenInset'`(macOS 전용, `src/main/index.js`)이라 신호등 버튼이 콘텐츠 위에
> 떠 있는 구조인데 사이드바 상단 패딩(16px)이 그보다 좁았음. `.sidebar` 상단 패딩을 40px로 늘림
> (Windows는 기본 타이틀바라 영향 없음, 여백만 조금 더 생기는 정도).

> ⚠️ **v1.0: 신호등 버튼 근처를 클릭 드래그해도 창이 안 움직임 (사용자가 실사용 중 발견)**.
> `titleBarStyle: 'hiddenInset'`는 신호등만 남기고 나머지 웹 콘텐츠 영역은 기본적으로 창 이동이
> 안 된다 — 어딘가에 `-webkit-app-region: drag`를 명시해야 하는데 어디에도 안 넣어놨었음.
> 버튼이 없는 `.sidebar-logo`(로고 영역)에 추가함. 이 속성은 일반 브라우저 탭에서는 아무 효과가
> 없어(Electron/프레임리스 창 전용 동작) 제가 직접 검증할 수 없음 — 실제 Electron 창에서 확인 필요.
> 앞으로 로고 영역 안에 버튼 등 클릭 가능한 요소가 생기면 그 요소에는 반드시
> `-webkit-app-region: no-drag`를 추가해야 클릭이 다시 먹는다(안 그러면 드래그 영역에 클릭이 막힘).
>
> **1차 수정이 불완전했음 (사용자가 서버 재시작·강제 새로고침 후에도 재현해서 발견)**: 바로 위
> 항목에서 신호등과 안 겹치게 상단 패딩 40px를 `.sidebar`에 줬는데, `-webkit-app-region: drag`는
> `.sidebar-logo`에만 걸려있었다. 즉 **여백(패딩)과 드래그 속성이 서로 다른 요소에 있어서**, 사용자가
> 실제로 클릭하는 "신호등 근처"(그 40px 여백 부분)는 정작 드래그 영역 밖이었음. 패딩을 `.sidebar`에서
> `.sidebar-logo` 쪽으로 옮겨 여백과 드래그 속성이 같은 요소(같은 박스) 안에 있도록 수정.
> **교훈**: 패딩/여백으로 시각적 위치를 옮기는 요소와 `-webkit-app-region`을 건 요소가 다르면, 눈에
> 보이는 위치와 실제 동작 영역이 어긋날 수 있다 — 항상 같은 요소에 함께 둘 것.

> ℹ️ **v1.0: 상단 드래그 영역을 전체 폭으로 확장 (사용자 요청 + 시니어 판단)**.
> 로고 옆 공간은 드래그가 됐지만 각 화면의 `TopBar`("진단 대시보드" 등) 쪽은 안 됐음 — 사용자가
> "로고와 페이지 타이틀을 같은 줄에 놓고 그 줄 전체를 드래그 가능하게" 하자고 제안.
> **택한 방식(가벼운 쪽)**: 사이드바와 본문을 하나의 헤더 컴포넌트로 합치는 큰 구조 변경 대신,
> `.sidebar-logo`와 각 화면의 `.top-bar`에 **동일한 상단 오프셋(40px)**을 줘서 같은 줄에 정렬시키고,
> 둘 다 `-webkit-app-region: drag`를 걸어 시각적으로 하나로 이어진 드래그 가능한 상단 바처럼 보이게
> 함. `.dashboard`(각 화면의 공통 래퍼)의 상단 패딩은 제거하고 그 역할을 `.top-bar`가 직접 담당하도록
> 옮김. `.top-bar-actions`(재스캔/리포트 버튼 등)에는 `-webkit-app-region: no-drag`를 걸어 클릭이
> 막히지 않게 함. 두 요소를 진짜 하나로 합치는 리팩터링(공유 헤더 컴포넌트 + teleport 등)보다 구현
> 위험이 훨씬 낮고 결과는 사용자 입장에서 동일함 — 굳이 더 큰 구조 변경을 하지 않기로 판단.
> 로고↔타이틀 줄 정렬은 브라우저로 확인함(electronAPI 배너가 없는 실제 앱에서는 더 위쪽에 위치).
> 드래그 자체는 여전히 Electron 전용이라 실제 창에서 확인 필요.

- [x] **"진단은 하는데 처방이 없다" — guide/semi 이슈에 다음 행동이 없던 문제 (사용자가 실사용 중 발견,
  시니어가 구체안 설계 후 구현).** `자동 복구 계속` 버튼은 `autoFixable`한 이슈에만 반응해서, guide/semi
  이슈(원격 저장소 없음 등)는 텍스트만 보여주고 사용자를 그대로 방치했음.
  **설계**: 이슈에 `action` 메타데이터(타입+순수 데이터, 함수는 IPC로 못 넘겨서 타입을 렌더러가 해석)를
  붙임 — `openUrl`(no_git: Git 설치 페이지), `navigate`(no_ssh/dsa_key: SSH 키 관리 화면으로 이동),
  `input`(no_origin: 주소 입력받아 `git remote add` 실행), `rescan`(no_network: 재확인).
  **신규**: `src/engine/recovery/steps/add-origin.js`(`add_origin` 스텝, `fix-origin.js`와 달리
  origin이 아예 없을 때 사용자가 준 주소로 새로 등록), `IssueItem.vue`(액션 타입별 버튼/입력창 렌더링),
  `stores/recovery.js`의 `runStep(stepId, extraContext)`(큰 자동 복구 흐름과 별개로 스텝 하나만 즉석
  실행, 진행 타임라인은 안 건드림). `input` 액션 성공 시 자동으로 재스캔까지 이어짐(`rescan` 이벤트).
  단위 테스트 4개(add-origin 성공/실패 2개, rule-diagnosis의 action 필드 검증 반영) 추가.
  브라우저에 fake `window.electronAPI` 주입해서 **`input`(origin 연결→재스캔→문제 해소)**과
  **`navigate`(SSH 키 관리 이동)** 전체 흐름을 실제로 클릭해서 확인함. `openUrl`/`rescan`은 코드
  패턴이 동일해 별도 브라우저 검증은 생략.

- [x] **복구 스텝들이 git 명령 실패를 확인 안 하고 항상 "성공했습니다"를 반환하던 버그 (사용자가
  "add_origin이 진짜 실행되는지" 질문하며 발견).** `git-helper.js`의 `git()`은 실패 시 `null`,
  성공 시 (빈 문자열일 수도 있는) 문자열을 반환하는데, `run-push.js`만 이 반환값을 확인했고
  `add-origin.js`/`fix-origin.js`/`fix-user-config.js`는 확인 없이 항상 성공 메시지를 반환했음.
  `fix-wrong-cred.js`도 마찬가지로 `deleteCredential()`의 `{ok, error}`를 확인 안 했음. 넷 다
  `=== null`(또는 `!result.ok`) 체크 후 명확히 실패하도록 통일. **테스트하시던 GitHub-Doctor
  폴더는 아직 `git init`을 안 해서, 수정 전에는 "연결했습니다"라고 뜨고도 실제로는 아무 일도
  일어나지 않았을 것** — 이제는 "git 저장소가 아닙니다" 같은 명확한 실패 메시지가 뜬다. 단위
  테스트 4개 추가(4개 스텝 각각의 null/실패 케이스), 기존 성공 테스트의 fake git 반환값도
  `null`→`''`로 수정(성공을 실제로 성공처럼 시뮬레이션하도록).

> ℹ️ **v1.0: scanner.js/rule-diagnosis.js 리팩터링 (2026-08-07, 사용자 요청 — "리팩토링 없이 깨끗한 코드
> 만들기").** 반복된 기능 추가로 두 파일이 프로젝트 자체 기준(§15, 파일당 ~100줄)을 넘어서던 상태를
> docs/03 §15-2/§15-5에 이미 설계돼 있던 분리 구조로 실제 구현함(뒤늦게 실행에 옮긴 것뿐, 새 설계 아님).
> **동작은 100% 동일** — 기존 71개 테스트 전부 무수정으로 통과, import 경로만 갱신.
> - `scanner.js`(130줄) → `src/engine/scanners/`: `index.js`(오케스트레이터, 실행 순서만 담당) +
>   항목별 8개 파일(`git-install`/`user-config`/`cred-helper`/`ssh-keys`/`stored-creds`/`ssh-agent`/
>   `origin-remote`/`github-conn`). 순서 제약(설치 확인 우선 short-circuit, ssh-keys가 stored-creds보다
>   먼저 실행돼 candidateAccounts 전달) 그대로 보존.
> - `rule-diagnosis.js`(136줄) → `src/engine/diagnosis/rule-engine/`: `index.js`(규칙 실행 순서+결과
>   취합) + `rules/` 7개 파일(각 파일이 이슈 하나만 판단해 반환, `null`이면 문제없음). `no_origin`/
>   `fix_origin`은 같은 조건 트리에서 나오는 상호 배타적 결과라 `origin-check.js` 한 파일에 유지.
> 가장 큰 파일도 42줄(오케스트레이터 2개)로, 이제 전부 §15 기준 안쪽. 두 파일 모두 삭제하고 모든
> 호출부(`ipc-handlers.js`, `cli.js`, `ai-diagnosis.js`, 테스트 4개)의 import 경로 갱신 완료.

- [x] **push 실패 시 "권한 또는 네트워크를 확인하세요"라는 뭉뚱그린 메시지만 뜨던 문제 (2026-08-07,
  사용자가 스크린샷으로 발견 — origin 미연결 때와 같은 "다음 행동 없음" 패턴, 1줄평 요청 후 바로 구현).**
  `git-helper.js`가 실패 시 `null`만 반환하고 stderr를 버리던 것이 근본 원인 — 원인을 구분할 정보 자체가
  없었음. **신규** `gitDetailed(cmd, cwd)`(`{ok, stdout, stderr}` 반환, 기존 `git()`/`run()`의
  string|null 계약은 다른 모든 호출부가 의존하고 있어 손대지 않고 별도 추가)와
  `src/engine/recovery/push-error-classifier.js`(`classifyPushError(stderr)`, stderr 패턴으로
  `push_auth_failed`/`push_network_failed`/`push_repo_not_found`/`push_diverged`/`push_no_commits`/
  `push_unknown` 6가지로 분류, 진단 이슈와 동일한 shape이라 `IssueItem.vue`를 그대로 재사용). `run-push.js`는
  `ctx.git`(기존 테스트용 fake, string|null)이 주어지면 그대로 감싸 예전과 동일하게 동작하고(stderr 없어
  `push_unknown` = 기존 범용 메시지로 자연스럽게 폴백), 실제 실행 경로(주입 없음)에서만 `gitDetailed`로
  stderr까지 받아 분류함 — 기존 DI 테스트 계약을 전혀 깨지 않으면서 실제 실행 경로만 개선. `recovery/index.js`
  → `recoveryStore.errorGuidance` → `ActionBar.vue`(신규 `errorIssue` prop, `IssueItem` 재사용해
  뭉뚱그린 문구 대신 원인별 카드+액션 표시)까지 연결. 단위 테스트 9개(classifier 7 + run-push 상세경로 2)
  추가, 브라우저에 fake `window.electronAPI.recover`(push 인증 실패 시나리오) 주입해 자동 복구 → 실패 →
  "push 인증 실패" 카드 + "다시 스캔" 버튼까지 실제 클릭으로 확인함.

- [x] **push가 "권한 없음"으로 거부되는데 스캔에서는 "문제 없음"으로 나오던 문제 (2026-08-07,
  사용자가 실제로 `US_Monthly_Dividend_ETF` 저장소에 push하다가 발견 — `ERROR: Permission to
  gppc5096/US_Monthly_Dividend_ETF.git denied to jongchoon580325.` 실제 에러 메시지 제공).**
  origin은 SSH(`git@github.com:gppc5096/...`)인데, 로컬에서 활성화된 SSH 키가 GitHub 계정
  "jongchoon580325"로 인증되고 있었음 — 저장소 소유자(`gppc5096`)와 다른 계정. 기존 스캐너는
  "SSH 키가 존재하는지"만 확인하고 "그 키가 실제로 어느 GitHub 계정인지"는 전혀 몰랐던 게 근본
  원인. 사용자가 "충돌하는 문제를 해결해 주는 게 이 프로젝트의 사명"이라고 명확히 요청해 스캔
  단계에서 미리 잡도록 구현(위 push 실패 분류기와는 별개 — 그건 실패 *이후* 안내, 이건 실패
  *이전* 예방).
  **구현**: `ssh -T git@github.com`(GitHub 공식 신원 확인 방법 — 셸 접근을 주지 않아 성공해도
  항상 종료 코드 1이지만, 성공 시 stderr에 `Hi <계정>!`이 포함됨. 아무것도 만들거나 지우지
  않는 완전 읽기 전용 호출)로 실제 인증 계정을 얻어 origin 소유자와 비교. **신규**
  `git-helper.js`의 `runDetailed()`(gitDetailed와 같은 이유 — exit code와 무관하게 stdout/stderr
  확보), `scanners/ssh-identity.js`(origin이 SSH일 때만 실행, HTTPS면 호출 자체를 안 함),
  `recovery-context.js`의 `parseGithubOwner()`(기존 `convertOriginProtocol`의 owner/repo 파싱
  로직을 공유 함수로 추출), 규칙 9 `wrong-ssh-account.js`(항상 guide — "맞는" 계정이 무엇인지는
  저장소 소유자의 권한 설정에 달려 있어 GitHub Doctor가 대신 결정할 수 없음). 스캔 결과 리스트에
  "SSH 인증 계정" 행 신규 추가(사용자가 명시적으로 요청한 가시성). 단위 테스트 11개
  (ssh-identity 5 + wrong-ssh-account 규칙 2 + parseGithubOwner 2 + scanner 통합 2) 추가. 브라우저에
  사용자가 실제로 겪은 것과 동일한 시나리오(jongchoon580325 vs gppc5096)를 fake로 주입해 스캔
  리스트 표시 + 진단 카드 + "SSH 키 관리로 이동" 클릭까지 실제로 확인함.
  > ⚠️ **알려진 한계**: origin 소유자가 "실제로" gppc5096 계정 개인 저장소일 때만 정확하다 —
  > 조직(org) 소유 저장소면 소유자명이 GitHub 계정명과 다를 수 있어 오탐 가능성이 있음(다만 이
  > 경우도 `matches:false`가 "반드시 틀림"을 의미하진 않으므로 여전히 guide로만 안내하고 절대
  > 자동으로 아무것도 바꾸지 않음 — 안전 우선 원칙 유지).

- [x] **PAT(Personal Access Token) 입력 로직 구현 (2026-08-07, docs/03 §16 설계안 → §16-9 열린 질문
  3가지 자체 판단으로 결정 후 구현).**
  1. 기존 keytar 기반 `adapters/*.saveCredential`은 유지하되 이번 기능엔 사용하지 않음(§16-1 사유,
     삭제는 보류) — 대신 `git credential approve`(stdin 전달) 방식으로 새로 구현.
  2. fine-grained 토큰처럼 `x-oauth-scopes` 헤더가 없는 경우 `hasRepoScope:null`(판단 불가)로 관대하게
     저장을 허용.
  3. `credential.helper` 미설정 시 자동으로 조용히 바꾸지 않고, 화면에 경고 카드 + 명시적 버튼
     ("플랫폼 기본값으로 설정")을 눌러야만 설정되게 함(인증 방식 자체를 바꾸는 설정은 항상 명시적으로).
  **신규**: `src/engine/pat-validator.js`(GitHub API로 토큰 유효성+repo 스코프 확인), `pat-store.js`
  (`git credential approve`를 stdin으로만 호출 — 커맨드 인자/로그에 토큰 노출 없음),
  `cred-helper-setup.js`(플랫폼 기본값 설정), `git-helper.js`에 `runWithStdin()` 추가,
  `CredentialManager.vue`(SCR-03, 사이드바 "인증정보 관리" 활성화), `stores/credentials.js`(토큰 값은
  store state에 절대 담지 않고 로컬 ref만 사용 후 즉시 폐기). IPC 채널 2개(`credential:save`,
  `credential:setHelper`) 신규, `preload.js`에 노출. 단위 테스트 13개(pat-validator 5 + pat-store 3 +
  cred-helper-setup 4, 보안 회귀 방지용 "토큰이 커맨드 문자열에 없어야 함" 어서션 포함) 추가 — 전부
  fake `fetchFn`/`runWithStdin`/`git`만 사용, 실제 GitHub API·git credential·git config 절대 미접근.
  브라우저에서 credential.helper 미설정→설정 버튼→토큰 저장 성공(repo 스코프 확인됨 표시)→잘못된
  토큰 실패("토큰이 유효하지 않습니다") 전체 흐름을 마스킹 입력 확인과 함께 실제로 클릭해서 검증함.

> ℹ️ **v1.1: 첫 실계정 push 성공 (2026-08-07) — 실사용 중 발견한 부작용 1건.** 사용자가 실제로
> `US_Monthly_Dividend_ETF` 저장소에 PAT 저장 → 자동 복구(origin 자동 전환 + push)까지 실행해
> 실제 push에 성공함(SSH 계정 불일치 문제의 최종 해결 확인). 이 프로젝트(github-doctor) 자체도
> `docs/00-Github-Info.txt` 참고해 `git init` + 첫 커밋 + `gppc5096` 계정으로 실제 push 완료.
> **부작용**: push 권한(PAT 인증)과 커밋 작성자 정보(`user.name`/`user.email`)는 완전히 별개라서,
> 이 프로젝트의 로컬 git 설정이 예전 개인 계정(Najongchoon/najongchoon@gmail.com) 값 그대로였던
> 탓에 GitHub 화면에는 커밋이 gppc5096이 아니라 그 계정으로 표시됨. 이미 올라간 첫 커밋은 그대로
> 두기로 하고(히스토리 재작성/force-push는 하지 않음), 이 프로젝트의 `user.name`/`user.email`만
> `--local`로 gppc5096/실제 이메일로 정정해 이후 커밋부터 정확히 표시되게 함.

- [x] **"계정 관리" 화면 — git 계정 수동 전환 (2026-08-07, 위 부작용을 겪은 뒤 사용자 요청).**
  바로 위 문제(로컬 git 정체성이 실제 쓰려는 GitHub 계정과 다른 걸 몰랐던 것)를 다시 안 겪도록,
  사이드바에 이미 자리만 있던 "계정 관리"(비활성)를 구현. 현재 프로젝트의 `user.name`/`user.email`
  (local/global)을 보여주고, 사용자가 직접 입력해 `--local` 값을 바꿀 수 있음. **신규 엔진 로직
  없음** — 이미 구현·테스트된 `fix_config` 복구 스텝(`fix-user-config.js`)을
  `recoveryStore.runStep()`으로 그대로 재사용(코드 재사용으로 새 버그 표면적을 늘리지 않음).
  스코프는 "수동 전환"까지만 — "이 이메일이 어느 GitHub 계정 것인지 자동으로 판별해서 경고"하는
  기능은 GitHub API 인증이 추가로 필요해 범위가 커져 다음 버전으로 미룸(사용자 확인, Yes).
  신규 `AccountManager.vue`(라우터 `/account`), 사이드바 활성화. 새 엔진 코드가 없어 별도 단위
  테스트는 추가하지 않음(기존 `fix_config` 테스트가 이미 이 로직을 커버).

- [x] **"SSH+HTTPS 둘 다 있을 때 사용자가 선택하게 하는 UI" (2026-08-07, 사용자 요청 — commit
  작성자 계정 혼선을 겪은 뒤 "이 사고를 막으려면 어느 쪽을 쓸지 직접 고를 수 있어야 한다"는 취지).**
  기존 `detectCorrectOrigin()`(§ fix_origin)은 SSH 키/HTTPS 인증정보 중 **한쪽만** 있을 때만
  자동 전환하고, 둘 다 있으면 "어느 쪽이 맞는지 추측할 수 없다"며 일부러 손을 뗀다(`correctOrigin`
  이 `null`로 남음) — 그 애매한 상태를 방치하지 않고 사용자가 직접 고르게 하는 것이 이번 기능.
  **신규**: 규칙 10 `origin-choice.js`(`hasSshKey && hasHttpsAuth`이고 `ctx.correctOrigin`이
  없을 때만 발동, `severity:'info'` — 문제가 아니라 선택지 안내라는 의미), 복구 스텝
  `set-origin-protocol.js`(사용자가 고른 프로토콜로 `git remote set-url` 실행, 기존
  `convertOriginProtocol()` 재사용, `fix_origin`과 달리 "무엇이 맞는지" 추측하지 않고 사용자가
  준 값을 그대로 적용). **이슈 액션에 새 타입 `choice` 추가**(기존 openUrl/navigate/input/rescan에
  이어 5번째 — 여러 선택지 버튼을 렌더링, `IssueItem.vue`의 `applyStep()` 공통 헬퍼로 `input`과
  로직 공유해 중복 없앰). 단위 테스트 7개(origin-choice 규칙 2 + set-origin-protocol 스텝 5) 추가.
  > ⚠️ **기존 통합 테스트 "문제 없음" 픽스처가 이번에도 걸림 (fix_origin 때와 같은 패턴, TODO.md
  > 앞부분 참고)**: SSH 키 + HTTPS credential.helper가 동시에 있는 픽스처였는데, 이제 그게 정확히
  > origin_choice가 잡아야 하는 "진짜 애매한 상태" 그 자체라 오히려 규칙이 정상 동작한다는 증거였음.
  > 픽스처를 "SSH만 쓰는 시나리오"(origin도 SSH로, credential.helper 없음)로 수정해 진짜 문제
  > 0건 케이스로 되돌림 — origin이 SSH가 되면서 scanner가 `ssh-identity` 체크(실제 `ssh` 호출)를
  > 새로 타므로, `runDetailed`를 fake로 명시 주입해 실제 네트워크/SSH 호출을 막음.
  브라우저에 SSH+HTTPS 모두 있는 시나리오를 fake로 주입해 "SSH 사용"/"HTTPS 사용" 버튼이 실제로
  올바른 스텝(`set_origin_protocol`)과 선택값을 IPC로 전달하는 것까지 클릭으로 확인함.

- [x] **ssh-agent 항목 호버 가이드 (2026-08-07, 사용자 질문 "이게 뭐고 어떻게 설정하나" → 시니어
  판단: 자동화는 보류, 안내만).** ssh-agent 자동 설정(`~/.ssh/config` 수정)은 검토했으나, 사용자의
  다른 `Host` 설정을 건드릴 위험이 있는 파일이라 자동화 대비 낮은 가치(`severity:warning`일 뿐
  push를 막지 않음 — 암호 없는 키거나 HTTPS 인증이면 아예 무관)에 비해 리스크가 커서 보류로 판단.
  대신 `ScanResultCard.vue`의 `ssh-agent` 행에 ⓘ 호버 아이콘을 추가해, 무엇인지·왜 안전한지·
  켜고 싶으면 어떤 명령을 쓰면 되는지(`ssh-add --apple-use-keychain ~/.ssh/id_ed25519`)를
  안내만 함(파일 수정·시스템 명령 실행 없음, 순수 UI). CSS만으로 구현(`.hint-icon`/`.hint-tooltip`,
  새 JS 상태 없음), 마우스 호버와 키보드 포커스(`tabindex`) 둘 다 지원. 브라우저에서 호버 시 툴팁
  내용까지 실제로 확인함.

- [x] **사이드바 나머지 4개 화면 구현 상세 (2026-08-07, `docs/04` 설계 → `sidebar` 브랜치 구현).**
  이 앱이 처음으로 "기록을 남기는" 영속 저장소를 갖게 됐다 — 지금까지는 순수 상태 조회 앱이었음.
  - **`electron-store` 최초 도입**: `src/engine/app-store.js`(신규) — 최근 프로젝트(20개 상한)·
    복구 히스토리(50개 상한)를 DI로 감싸 테스트 격리(다른 모든 OS/디스크 접근과 동일 원칙, 실제
    `~/Library/Application Support/github-doctor/config.json` 미접근).
  - **Claude API 키는 별도로 keytar에** — `src/engine/ai-key-store.js`(신규), PAT 저장 때와
    동일한 이유로 electron-store(평문 JSON)에 절대 안 둠. `ai-diagnosis.js`의 기존
    `apiKey = process.env.ANTHROPIC_API_KEY` 기본값을 `getAiKey()`(keytar 우선, `.env` 폴백) 호출로
    교체 — 이 한 줄 교체가 기존 코드를 건드린 유일한 지점(설계 의도대로).
  - **`ipc-handlers.js`가 15개 채널을 한 파일에 담고 있어 관심사별로 분리**(사용자가 반복 강조한
    "리팩토링 없이 깨끗한 코드" 원칙 선제 적용 — 이번에 6개 채널을 더 얹으면 150줄 가까이 될 예정이라
    미리 나눔): `src/main/ipc-handlers/` 디렉터리로 전환(`index.js` 오케스트레이터 +
    scan/recovery/ssh/credential/store/misc-handlers.js). 기존 `require('./ipc-handlers')` 경로는
    그대로 유지(Node가 디렉터리의 `index.js`로 자동 해석) — 옛 평면 파일은 삭제해 그림자 충돌 방지.
  - **신규 복구 스텝** `set-origin-url.js`: `add_origin`(없을 때만)·`fix_origin`/`set_origin_protocol`
    (프로토콜만)과 달리, origin 존재 여부와 무관하게 사용자가 입력한 임의 주소를 검증 없이 그대로
    적용하는 유일한 origin 조작 기능이라 화면에 경고 문구를 붙임(§7 열린 질문 4번 해결).
  - 최근 프로젝트 기록은 스캔이 아니라 **진단(diagnose) 완료 시점**에 함(이슈 개수·심각도를 함께
    남기려면 진단 결과가 필요). 복구 히스토리는 `recover:run` 완료 직후 기록 — 각 스텝의 `message`
    필드에 비밀값이 절대 안 들어간다는 기존 불변식을 그대로 신뢰(전수 확인함, docs/04 §4-3).
  - 단위 테스트 3개 파일 추가(`app-store`/`ai-key-store`/`set-origin-url`, 총 13개 케이스) +
    `ai-diagnosis.test.js` 6개 케이스를 새 `getAiKey` DI 계약에 맞게 갱신(전부 fake만 사용,
    실제 keytar/electron-store 미접근). 총 124개 테스트 통과. 브라우저에서 4개 화면 전부(최근
    프로젝트 클릭, origin 프로토콜 전환, 히스토리 아코디언, API 키 저장+알림 토글) 실제 클릭 확인.

- [x] **"프로젝트 선택" 최근 목록이 저장 안 되던 버그 (2026-08-07, 사용자가 실사용 중 발견).**
  근본 원인: `electron-store` v9+는 순수 ESM 패키지(`package.json` `"type":"module"`)인데 이
  프로젝트는 CommonJS라, `app-store.js`에서 `require('electron-store')`로 받으면 `Store` 클래스가
  아니라 `{ __esModule, default: Store }` 래퍼 객체가 나옴. `new nodeElectronStore(...)`가
  "is not a constructor"로 던지는데, 이걸 `DIAGNOSE_RUN`/`RECOVER_RUN` 핸들러가 감싸지 않고 있어서
  진단/복구 결과 자체를 렌더러에 못 돌려주는 핸들러 실패로 이어질 수 있었음(설계상 부가 기능이
  핵심 기능을 망가뜨리는 구조적 취약점). **조치**: `require('electron-store').default`로 명시적
  언랩(§ `app-store.js` 상단 주석에 이유 기록), `addRecentProject`/`addRecoveryHistoryEntry` 호출을
  각각 try/catch로 감싸 기록 실패가 진단/복구 결과 반환을 막지 않도록 방어. 회귀 테스트 추가
  (`app-store.test.js` — 실제 `electron-store` 모듈을 격리된 임시 디렉터리로 로드해 생성자가
  진짜 동작하는지 확인, 실제 사용자 설정 경로는 미접근). 총 125개 테스트 통과.
  > ⚠️ 정확히 재현하려면: 이 프로젝트처럼 `"type":"commonjs"`인 곳에서 ESM 전용 패키지를 plain
  > `require()`로 쓸 때는 항상 `.default` 언랩 여부를 직접 확인할 것 — Node 22+는 조용히 래퍼
  > 객체를 반환해서(에러조차 안 남) 눈치채기 특히 어려움.

- [x] **"최근 프로젝트" 항목 삭제 기능 (2026-08-07, 사용자 요청).** 각 행에 "삭제" 버튼 추가
  (`@click.stop`으로 행 클릭=스캔 트리거와 분리). `app-store.js`에 `removeRecentProject(path)`
  추가(해당 경로만 필터링), IPC 채널 `store:removeRecentProject` 신규, 삭제 후 최신 목록을 바로
  반환해 별도 재조회 없이 화면 갱신. 단위 테스트 2개(정상 삭제, 없는 경로 삭제 시 무해함) 추가 —
  총 127개 테스트 통과. 브라우저에서 삭제 클릭 시 해당 항목만 없어지고 스캔 화면으로 안 넘어가는
  것까지 확인.

- [x] **삭제 전 확인 모달 (2026-08-07, 사용자 요청 — "예쁜 경고 모달").** 즉시 삭제 대신 확인
  단계를 넣음. `src/renderer/components/ConfirmModal.vue` 신규(범용 확인/취소 2択 모달,
  특정 기능에 종속되지 않아 다른 화면의 파괴적 동작에도 재사용 가능) + `assets/styles/global.css`에
  기존 다크 테마 팔레트를 그대로 따르는 모달 스타일 추가. `ProjectSelect.vue`는 "삭제" 클릭 시
  바로 지우지 않고 `pendingDelete`(대기 중인 경로)만 세팅 → 모달에서 "확인"을 눌러야 실제
  `projectsStore.remove()` 호출. 브라우저에서 취소(항목 유지)/확인(실제 삭제) 둘 다 클릭으로 확인.

- [x] **"최근 프로젝트" 인라인 메모 (2026-08-07, 사용자 요청).** 폴더명 옆에 짧은 설명을 바로
  입력할 수 있는 입력창 추가 — `AAA [주택관리를 위한 앱] 4분전 · 정상 · 삭제` 형태. 매 키 입력마다
  저장하지 않고 **Enter 또는 blur 시점에만** 저장(과도한 디스크 쓰기 방지). `app-store.js`에
  `updateRecentProjectMemo(path, memo)` 신규 — 다른 필드는 안 건드리고 메모만 갱신. **재스캔 시
  메모가 사라지는 문제를 미리 막음**: `addRecentProject`가 같은 경로를 다시 추가할 때 기존 메모를
  찾아서 보존하도록 수정(그렇지 않으면 프로젝트를 다시 스캔할 때마다 메모가 초기화됐을 것).
  평소엔 테두리 없이 일반 텍스트처럼 보이다가 hover/focus 시에만 입력창 테두리가 나타나는 스타일로
  마무리. 단위 테스트 3개(메모만 갱신, 다른 필드 보존, 재스캔 후에도 메모 유지) 추가 — 총 129개
  테스트 통과. 브라우저에서 입력→포커스 아웃→저장까지 실제 확인.

- [x] **PAT로만 등록한 계정이 스캔 결과에 안 보이던 버그 (2026-08-07, 사용자가 실사용 중 발견 —
  gppc5096은 저장 후 목록에 뜨는데 jongchoon580325는 "✅ repo 스코프 확인됨"까지 뜨고도 목록에
  안 보임).** 이미 코드에 문서화돼 있던 한계(TODO.md 위쪽 참고: "GitHub Doctor로 생성하지 않은
  SSH 키를 쓰는 계정은 놓칠 수 있음")가 실제로 발생한 것 — SSH 키가 아니라 PAT로만 등록한 계정도
  같은 사각지대였음. macOS Keychain은 "이 서비스로 저장된 모든 계정"을 나열하는 안전한 방법이
  없어서, 스캔은 (1) 계정 미지정 조회 1건 + (2) SSH 키 파일명에서 뽑은 후보만 개별 확인한다 —
  jongchoon580325는 SSH 키가 없으니 애초에 확인 대상에 못 들었음(저장 자체는 성공했음).
  **조치**: `app-store.js`에 `knownAccounts` 신규(PAT 저장 성공 시 계정명 기록),
  `scanners/index.js`가 SSH 키 후보 + `knownAccounts`를 합쳐(중복 제거) `candidateAccounts`로
  넘기도록 수정. **테스트 안전성**: `getKnownAccounts`(electron-store 조회)는 Electron 앱
  컨텍스트 밖(vitest 등)에서 호출하면 실제로 throw한다는 걸 직접 확인함(`new Store()`가
  `app.getPath` 필요) — DI 주입 가능하게 만들되 호출부에서 try/catch로 감싸 실패해도 스캔 자체는
  계속되게 함(recentProjects/recoveryHistory 기록 때와 같은 방어 패턴). 이 덕분에 기존 스캐너
  테스트 7개는 전혀 손대지 않고도 안전하게 통과함(기본값이 테스트 환경에서 알아서 실패 → 빈
  배열로 폴백). 단위 테스트 7개 추가(app-store 2 + scanner 통합 3 — 병합/중복제거/실패 시 폴백,
  기존 통합 테스트 로직도 재검증). 총 134개 테스트 통과. 브라우저에서 gppc5096 등록 후
  jongchoon580325를 추가 등록 → 재스캔 → 저장된 인증정보 목록에 둘 다 뜨는 것까지 실제 확인.

- [x] **인증정보 관리 목록에 "삭제" 액션 추가 (2026-08-07, 사용자 요청 — SSH 키 관리 화면과
  같은 조작감 원함).** "공개키 복사"는 함께 검토했으나 PAT는 공개/비밀 쌍이 없는 단일 비밀값이라
  대응 개념이 없고, 토큰을 복사하게 하면 "저장 후엔 토큰을 어떤 형태로도 다시 안 보여준다"는
  기존 보안 원칙(docs/03 §16-2)과 충돌해서 제외 — 사용자 확인 후 "삭제"만 진행. **새 백엔드 로직
  없음**: `wrong_cred` 자동 복구가 이미 쓰던 `adapter.deleteCredential(account)`를 IPC 채널
  하나만 새로 뚫어 그대로 재사용. "최근 프로젝트" 삭제 때 만든 `ConfirmModal.vue`를 그대로 재사용해
  삭제 전 확인 모달도 일관되게 적용(재사용 가능하게 설계해둔 덕분에 새 컴포넌트 불필요). 삭제 성공
  시 재스캔해 목록 갱신. 브라우저에서 확인 모달 → 확인 → 해당 계정만 삭제되고 나머지는 유지되는
  것까지 실제 확인. 테스트는 추가하지 않음(신규 엔진 로직 없이 기존에 검증된 adapter 함수 재사용).

- [x] **자동 복구(wrong_cred)가 "Keychain에서 못 찾음" 오류로 매번 실패하던 버그 (2026-08-07,
  사용자가 실사용 중 발견 — 스캔은 jongchoon580325/namsabo180708-prog 2개 계정을 오계정으로
  찾아냈는데, 정작 삭제 시도는 둘 다 "SecKeychainSearchCopyNext: The specified item could not be
  found in the keychain"로 실패해 복구 전체가 중단됨).** `security find-internet-password`(존재
  확인)는 찾아내는데 `security delete-internet-password`(삭제)는 같은 항목을 못 찾는 경우가 실제로
  있음을 확인 — 직전에 이미 삭제됐거나(예: 방금 추가한 인증정보 관리 "삭제" 버튼을 먼저 쓰고
  재스캔 없이 대시보드의 예전 진단 결과로 복구를 실행한 경우), 진단이 최신 Keychain 상태를 못
  따라간 경우로 추정. **조치**: `wrong_cred` 스텝의 진짜 목표는 "그 계정이 Keychain에 없는 상태"인데
  삭제하려는 게 이미 없다면 목표는 이미 달성된 것 — `macos-adapter.js`/`windows-adapter.js`의
  `deleteCredential`이 "이미 없음"류 에러("could not be found in the keychain" / "could not be
  found")를 실패가 아니라 성공으로 처리하도록 수정(idempotent delete, `rm -f`와 같은 원칙).
  `fix-wrong-cred.js`는 손대지 않음 — 이미 `{ok,error}` 결과만 신뢰하는 구조라 어댑터 계층에서만
  고치면 자동으로 올바르게 동작함. 단위 테스트 2개 추가(macOS/Windows 각각 "이미 없음" 케이스),
  기존 "일반 실패 시 ok:false" 테스트는 그대로 유지(다른 종류의 에러는 여전히 실패로 처리). 총
  136개 테스트 통과.

- [x] **복구 히스토리 "초기화" 기능 (2026-08-07, 사용자 요청).** 상단바 액션 자리(`TopBar.vue`의
  `#actions` 슬롯 재사용 — 진단 대시보드의 재스캔/리포트 버튼과 같은 자리)에 "🗑 초기화" 버튼
  추가, 기록이 없으면 비활성화. "최근 프로젝트"/"인증정보" 삭제 때와 동일하게 `ConfirmModal.vue`
  재사용해 삭제 전 확인. `app-store.js`에 `clearRecoveryHistory()` 신규(`recoveryHistory`를 빈
  배열로 교체), IPC 채널 하나 추가. 단위 테스트 1개 추가 — 총 137개 테스트 통과. 브라우저에서
  확인 모달 → 확인 → 목록이 실제로 비워지고 버튼도 비활성화되는 것까지 확인.

- [x] **복구 완료 OS 알림 (2026-08-07, 사용자 요청 — 환경설정 "알림" 토글을 실제로 동작하게).**
  지금까지 값만 저장되고 아무 효과가 없던 토글에 실제 기능을 붙임. 신규 `src/main/notify.js`
  (Electron 내장 `Notification` API, 추가 패키지 불필요) — `recovery-handlers.js`가 복구 완료
  직후 `settings.notificationsEnabled`를 확인해서 호출. 알림 표시 실패가 복구 결과 반환을 막지
  않도록 방어적으로 처리(히스토리 기록과 동일 원칙). Settings.vue의 "준비 중" 안내 문구 제거.
  > ⚠️ **검증 한계**: `Notification`은 Electron 전용 API라 일반 브라우저에는 없어 브라우저
  > 자동화로 검증할 수 없다 — 테스트/빌드만 통과 확인했고, 실제 알림이 뜨는지는 **실제 Electron
  > 앱에서 사용자가 직접 확인 필요**(자동 복구 실행 → macOS 알림센터/Windows 토스트 확인).

- [x] **AI 진단 실패 사유가 안 보이던 문제 + 알림 무음 실패 진단 보강 (2026-08-07, 사용자가 실사용
  중 발견 — 유효한 API 키를 등록했는데도 진단이 "진단 중..." 후 규칙 기반으로 돌아왔고, 알림도
  체크했는데 안 뜸).**
  - **AI 진단**: 실패 사유(`e.message`)가 메인 프로세스 콘솔에만 찍히고 화면 어디에도 안 보여서
    "키는 유효한데 왜 규칙 기반으로 돌아가는지" 사용자가 알 방법이 전혀 없었음 — 근본 원인 자체는
    아직 미확정(모델 ID 문제/JSON 파싱 실패/네트워크 등 여러 후보 중 하나, `claude-sonnet-5`
    모델 ID는 §5-1에 재확인 필요 경고가 이미 있었음). **조치**: `ai-diagnosis.js`가 AI 호출
    실패·JSON 파싱 실패 시 `_aiFallbackReason`을 진단 결과에 실어 보내고, `DiagnosisCard.vue`가
    이를 경고 문구로 표시하도록 수정 — 재스캔하면 정확한 실패 사유가 화면에 뜬다. 단위 테스트
    2개 갱신(사유 값 검증 추가). **다음 실사용 확인 시 화면에 뜨는 정확한 사유로 근본 원인을
    마저 특정할 수 있음.**
  - **알림**: `Notification.isSupported()` 체크 추가 + 미지원 시 콘솔 경고. macOS 알려진 제약을
    코드 주석으로 남김 — 서명 안 된 개발 모드 앱은 시스템 설정에 "GitHub Doctor"가 아니라
    "Electron"이라는 이름으로 알림 권한이 등록되므로, 거기서 알림이 꺼져 있으면 코드가 정상
    호출돼도 아무것도 안 보임(사용자 확인 필요 — 아래 참고).
  - 총 137개 테스트 통과.
  > ℹ️ **사용자 확인 필요 (다음 라운드)**: (1) AI 진단 재시도 후 화면에 뜨는 `_aiFallbackReason`
  > 문구 확인 → 정확한 원인 특정. (2) macOS 시스템 설정 > 알림에서 "Electron" 항목이 허용돼
  > 있는지 확인, 그리고 스캔/진단만이 아니라 "자동 복구 계속"까지 실제로 실행했는지, 이 기능
  > 추가 이후 앱을 완전히 재시작했는지 확인.

- [x] **AI 진단 실패 근본 원인 확정 및 수정 (2026-08-07) — 유효한 API 키인데 매번 규칙 기반으로
  돌아가던 진짜 이유.** 방금 추가한 `_aiFallbackReason` 표시 덕분에 사용자가 정확한 에러
  ("Cannot read properties of undefined (reading 'replace')")를 바로 확인해줌 → 공식 SDK 문서
  (`@anthropic-ai/sdk` / `anthropic-sdk-typescript`)로 원인 확정: Claude 응답의 `content`는 여러
  타입(`text`/`thinking`/`tool_use` 등)의 배열인데, **확장 사고(extended thinking)가 켜지면
  `content[0]`이 `type:'thinking'` 블록**(`.text` 필드 자체가 없음)이고 실제 텍스트는 그 뒤에
  옴 — 코드가 무조건 `content[0].text`만 읽어서 `undefined.replace()`로 조용히 깨지고 있었음.
  **조치**: `msg.content.find(block => block.type === 'text')`로 타입 기준으로 찾도록 수정(공식
  문서의 `tools.ts` 예제와 동일한 패턴 — `content.find(c => c.type === 'tool_use')`). 텍스트
  블록이 아예 없으면 어떤 타입들이 왔는지 담아 명확히 실패. **부수 확인**: 이 조사 과정에서
  `claude-sonnet-5` 모델 ID 자체는 공식 문서 예제에 그대로 쓰여있어 정확함을 확인 —
  §5-1의 "재확인 필요" 경고 해소.
  회귀 테스트 2개 추가(thinking 블록이 앞에 와도 정상 파싱 / 텍스트 블록이 아예 없을 때 명확한
  폴백), 기존 fake 응답 픽스처 4곳에 `type: 'text'` 보강. 총 139개 테스트 통과.
  > ℹ️ **"자동 복구 계속" 비활성화는 버그 아님**: origin_choice(SSH+HTTPS 둘 다 있음)처럼 사용자가
  > 직접 골라야 하는 이슈는 auto-fix 대상이 아니라 recoveryPlan에 안 들어감 — 카드 안의
  > "SSH 사용"/"HTTPS 사용" 버튼을 눌러야 한다(설계대로 동작).
  > **알림 무음 실패는 아직 미해결** — macOS 시스템 설정 > 알림의 "Electron" 항목 허용 여부와
  > "자동 복구 계속"(SSH/HTTPS 선택이 아니라)을 실제로 완주했는지 사용자 확인 대기 중.

- [x] **AI 진단이 여전히 실패하던 2차 원인: thinking 토큰이 max_tokens 예산을 갉아먹어 JSON 응답이
  중간에 잘림 (2026-08-07, content 블록 수정 후에도 사용자가 재현 — "Unterminated string in
  JSON at position 907").** 공식 SDK 문서 재확인: "thinking에 쓴 토큰도 `max_tokens`(당시 1024)
  예산에서 함께 차감된다"가 명시돼 있음 — 사고에 토큰을 많이 쓰면 정작 JSON을 완성할 토큰이
  부족해져 응답이 문자열 중간에서 잘림. **조치**: 이 작업(정해진 형식의 JSON 생성)은 복잡한
  추론이 필요 없으니 `thinking: { type: 'disabled' }`로 명시적으로 꺼서 예산을 전부 응답에 쓰게
  하고, `max_tokens`도 1024→2048로 올려 여유를 둠. content 블록을 타입으로 찾는 기존 방어 로직은
  thinking이 나중에 다시 켜지는 경우(모델 기본값 변경 등)에 대비해 그대로 유지. 테스트 1개
  갱신(실제로 `thinking:disabled`·`max_tokens:2048`이 API 호출에 실려 가는지 확인) — 총 139개
  테스트 통과.
  > ℹ️ 참고로 문서에서 `output_config.format: { type: 'json_schema', schema: {...} }`로 응답
  > 형식을 아예 강제하는 구조화 출력 기능도 확인함 — 지금은 범위를 좁혀 진행하지 않았지만,
  > "AI가 JSON 형식을 안 지킬 가능성" 자체를 없앨 수 있는 더 견고한 다음 단계로 TODO에 남겨둠.

- [x] **환경설정 AI 키에 "중지"/"삭제" 추가 (2026-08-08, 사용자 요청).** 두 액션의 의미를 분리:
  "중지"(⏸)는 키는 그대로 두고 AI 사용만 껐다 켰다 하는 토글(재클릭 시 "▶ 재개"로 라벨 전환),
  "삭제"는 저장된 키 자체를 keytar에서 제거(다른 삭제 액션들과 동일하게 `ConfirmModal.vue`
  재사용). "중지" 상태는 `settings.aiEnabled`로 영속 저장 — `ai-diagnosis.js`가 AI 키 유무를
  확인하기 *전에* 먼저 이 값을 확인해서, 꺼져 있으면 API 호출 자체를 시도하지 않고 바로 규칙
  기반으로 감(설정 조회 자체가 실패해도 기존 동작인 "AI 시도"를 유지하도록 방어 — scanners의
  getKnownAccounts와 동일 원칙, 그래서 기존 AI 진단 테스트들은 전혀 안 건드려도 됐음).
  `ai-key-store.js`에 `deleteAiKey()` 신규(keytar `deletePassword`). 상태 표시도 3단계로 세분화
  (미설정/설정됨/설정됨+중지됨). 단위 테스트 5개 추가 — 총 143개 테스트 통과. 브라우저에서
  중지→재개 라벨 전환과 삭제 확인 모달→실제 삭제까지 클릭으로 확인.

## 전체 로드맵 (docs/03 §12)

- [x] v0.1 MVP — CLI 진단 엔진 완성 (4주)
- [x] v0.2 — 규칙 기반 진단 엔진, `ruleDiagnose()` 단위 테스트 통과 (총 10개 규칙 테스트로 확장)
- [x] v0.3 — OS 어댑터 완성 (macOS+Windows, 조회/삭제/저장/SSH생성 DI 테스트로 확인 — 실 Keychain 미접근)
- [x] v0.4 — Claude AI 진단 연동, 폴백 전환 확인 (`ai-diagnosis.js`, 키 없음/API 실패/JSON 파싱 실패 3가지 폴백 경로 테스트)
- [x] v0.5 Beta — Electron 메인/프리로드/IPC + Vue 렌더러(라우터·Pinia) + SCR-01 대시보드, 프로덕션 빌드(vite build) 통과 확인
- [x] v0.6 — 자동 복구 엔진 (`recovery/`, 스텝 5개), wrong_cred→fix_config→push 흐름을 fake git/adapter로 시뮬레이션해 확인 (완료 기준 충족 — 실제 push는 미실행, 최종 통합 테스트 때까지 보류)
- [x] v0.7 — Windows 완전 지원 (`windows-adapter.js`는 v0.1 3주차에 macOS와 함께 이미 구현·테스트됨 — UserName 버그 수정 포함 5개 테스트로 완료 기준 충족 확인)
- [x] v0.8 — SSH 키 관리 화면 (SCR-04, `SshManager.vue` + `deleteSshKey`/`readSshPublicKey` IPC 신규 추가, 대시보드에서 진입 가능)
- [ ] v1.0 정식 — QA + 빌드 + 배포 (4주) — 통합 테스트·`isWrong` 감지 로직까지 완료, 남은 건 실계정 QA·코드 서명·패키징(사용자 지시 필요)
- [ ] v1.5 — Firebase/Vercel 배포 연동 진단 (4주)

## 착수 전 확인해야 할 미해결 사항 (문서 리뷰에서 발견)

- [ ] Claude API 모델 ID(`claude-sonnet-5`)는 구현 시점에 Anthropic 공식 문서에서 재확인 (§5-1 경고 참고)
- [x] ~~`git init` + 최초 커밋 + 실계정 통합 테스트 + push~~ — 2026-08-07 완료 (사용자 직접 지시,
  `github.com/gppc5096/github-doctor`로 push까지 완료. 아래 v1.0 로드맵 참고)
- [ ] "SSH 키 GitHub 등록 여부" 스캔 항목 구현 여부 결정 — PRD에는 명시돼 있으나 GitHub API 인증(PAT)이 선행돼야 해서 범위가 커짐 (v0.8 노트 참고)
- [x] **사이드바 4개 화면(프로젝트 선택/Remote 설정/복구 히스토리/환경설정) 구현 완료 (2026-08-07,
  `sidebar` 브랜치, `docs/04` 설계 → 구현).** §7의 열린 질문 4가지는 문서의 권장안대로 진행(전부
  docs/04 그대로): (1) 복구 히스토리는 지금 구현(docs/03 §9-1 스키마 근거) (2) "언어" 항목은
  이번 스코프 제외 (3) 알림 토글은 값만 저장, 실제 알림 로직은 다음으로 미룸 (4) Remote 설정의
  자유 입력 origin 변경엔 경고 문구 추가(모달 확인 대신 인라인 경고 — 기존 UI 톤 유지).
  아래 "전체 로드맵" v1.1 항목에 구현 상세 기록.

## 완료된 문서 작업

- [x] PRD(02) 마크다운화 + 모델 ID 오류 수정
- [x] 실전개발계획서 03(v1.0)+04(v1.1) 완전판 병합, 버그 3건 수정 (모델 ID, Windows 자격증명 로직, 스텝 ID 불일치)
- [x] 원본 docx 3종 `docs/archive/`로 백업
