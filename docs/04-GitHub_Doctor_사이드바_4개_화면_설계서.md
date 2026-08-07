# GitHub Doctor — 사이드바 4개 화면 구현 설계서 (v1.1, 2026-08-07, 미구현)

> 사이드바에 자리만 있고 비활성화된 5개 탭 중 4개(프로젝트 선택 / Remote 설정 / 복구 히스토리 /
> 환경설정)를 구현하기로 결정한 뒤 작성하는 설계 제안. 배포 연동(SCR-07)은 docs/02·03 로드맵
> 표 모두에서 v1.5로 명시돼 있어 이번 스코프에서 제외한다. **아직 코드는 없다 — 이 문서를
> 검토·승인한 뒤 §7의 열린 질문에 답이 정해지면 구현을 시작한다.**
>
> **문서 상세도 안내**: SCR-02(프로젝트 선택)만 docs/02 §5-3에 실제 와이어프레임이 있고, 나머지
> 3개(Remote 설정/복구 히스토리/환경설정)는 docs/02 §5-1 표에 한 줄 설명만 있다. 아래 세부 설계
> 중 SCR-02를 제외한 나머지는 그 한 줄을 근거로 한 이번 설계자의 판단이며, 기존 문서의 "확정된
> 스펙"이 아니다 — §7에서 확인이 필요한 지점을 명시했다.

---

## 0. 배경 및 범위

4개 화면 모두 공통적으로 **"기록을 남기는" 영속 저장소가 필요**하다는 게 이 설계서의 핵심 전제다.
지금까지 GitHub Doctor는 순수하게 "현재 상태를 스캔해서 보여주는" 앱이었고, 무엇도 디스크에
기록해두지 않았다. `electron-store`는 `package.json`에 의존성으로 이미 설치돼 있고 docs/03
§9-1에 스키마 초안까지 있었지만, 실제로 `new Store()`를 호출하는 코드는 이 프로젝트 어디에도
없다 — 이번이 처음 실사용이다.

| 화면 | SCR | 필요한 새 저장 데이터 | 새 백엔드 로직 규모 |
|---|---|---|---|
| 프로젝트 선택 | SCR-02 | 최근 프로젝트 목록 | 작음 (기록 로직만) |
| Remote 설정 | SCR-06 | 없음 (기존 스캔 데이터 재사용) | 매우 작음 (신규 스텝 1개) |
| 복구 히스토리 | SCR-08 | 복구 실행 기록 | 작음 (기록 로직만) |
| 환경설정 | SCR-10 | 앱 설정값 + (AI 키는 별도 보안 저장) | 중간 (keytar 연동 포함) |

---

## 1. 공통 인프라: electron-store 도입

### 1-1. 설계 원칙 — DI로 감싼다

이 프로젝트의 모든 OS/디스크 접근은 예외 없이 의존성 주입으로 테스트를 격리해왔다(git,
Keychain/Credential Manager, SSH, fetch 전부 동일 패턴). `electron-store`도 실제로는 디스크에
JSON 파일을 쓰는 실제 I/O이므로 같은 원칙을 적용한다 — 기본값은 진짜 `electron-store` 인스턴스,
테스트는 반드시 in-memory fake를 주입한다.

### 1-2. 스키마 (docs/03 §9-1 초안을 다듬음)

```js
// src/engine/app-store.js
{
  recentProjects: [
    { path, lastScanAt, issueCount, worstSeverity } // 최대 20개, 최신순
  ],
  recoveryHistory: [
    { id, projectPath, startedAt, finishedAt, ok, summary, steps: [{ stepId, ok, message }] }
    // 최대 50개, 최신순
  ],
  settings: {
    notificationsEnabled: true,
  },
}
```

`language` 필드는 넣지 않는다 — §5-1에서 이유를 설명한다.

### 1-3. 보안 원칙 재확인 (docs/03 §9-2 체크리스트 그대로 적용)

> ✅ **PAT·API 키는 이 저장소에 절대 저장하지 않는다.** `recentProjects`/`recoveryHistory`는
> 프로젝트 경로와 요약 메시지만 담으므로 평문 JSON으로 괜찮지만, §5에서 다루는 Claude API 키는
> 반드시 keytar(OS 네이티브 보안 저장소)로 분리한다 — PAT 저장 때와 완전히 같은 이유(§16-1의
> "keytar vs 저장 위치" 교훈과는 반대로, 이번엔 git이 읽을 필요가 없는 값이라 keytar가 정답이다).

### 1-4. 파일 — `src/engine/app-store.js` (~35줄, 신규)

```js
const nodeElectronStore = require('electron-store'); // 실제 인스턴스는 지연 생성(app.getPath 필요)

const MAX_RECENT_PROJECTS = 20;
const MAX_RECOVERY_HISTORY = 50;

function getStore(store) {
  return store || new nodeElectronStore({ defaults: { recentProjects: [], recoveryHistory: [], settings: {} } });
}

function addRecentProject(entry, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recentProjects').filter((p) => p.path !== entry.path);
  s.set('recentProjects', [entry, ...list].slice(0, MAX_RECENT_PROJECTS));
}

function addRecoveryHistoryEntry(entry, { store } = {}) {
  const s = getStore(store);
  const list = s.get('recoveryHistory');
  s.set('recoveryHistory', [entry, ...list].slice(0, MAX_RECOVERY_HISTORY));
}

// getRecentProjects / getRecoveryHistory / getSettings / updateSettings도 같은 패턴으로 추가

module.exports = { addRecentProject, addRecoveryHistoryEntry, /* ... */ };
```

테스트에서는 `{ store: fakeStoreObject }`(간단한 `Map` 기반 fake, `get`/`set`만 구현)를 주입해
실제 `~/Library/Application Support/github-doctor/config.json`을 절대 건드리지 않는다.

---

## 2. SCR-02 프로젝트 선택

### 2-1. 화면 설계 (docs/02 §5-3 와이어프레임 그대로)

```
┌─ 프로젝트 선택 ──────────────────────────────┐
│ 폴더를 드래그하거나 [폴더 선택]으로 지정        │
│                                                │
│ 최근 프로젝트                                  │
│  프로젝트명          마지막 진단        상태    │
│  housebook-app       10분 전            🟢 정상 │
│  us-monthly-etf      어제                🔴 1건 │
└────────────────────────────────────────────┘
```

행 클릭 → 진단 대시보드로 이동 + 해당 경로로 자동 재스캔(기존 `scanStore.runScan` 재사용).

### 2-2. 기록 시점 — 진단(diagnose) 완료 시점

"상태" 컬럼(🟢/🔴/🟡)은 스캔이 아니라 **진단 결과의 심각도**를 반영해야 의미가 있다. 따라서 기록은
`scan:run`이 아니라 **`diagnose:run` IPC 핸들러가 성공적으로 끝난 직후** 수행한다:

```js
// ipc-handlers.js, DIAGNOSE_RUN 핸들러 안에서
const result = await runDiagnose(scanResult);
appStore.addRecentProject({
  path: scanResult.projectPath,
  lastScanAt: new Date().toISOString(),
  issueCount: result.issues.length,
  worstSeverity: result.issues.some(i => i.severity === 'critical') ? 'critical'
    : result.issues.some(i => i.severity === 'warning') ? 'warning' : 'ok',
});
return result;
```

### 2-3. 파일 분리 계획

```
src/engine/app-store.js          ← §1-4 (공통, 4개 화면이 함께 씀)
src/renderer/views/ProjectSelect.vue  ← 화면 조립만 (~60줄)
src/renderer/stores/projects.js       ← getRecentProjects() 호출만 (~20줄)
```

### 2-4. 테스트 전략

`app-store.test.js`에서 fake store(Map 기반)로 `addRecentProject`가 최신순 정렬·중복 제거(같은
경로 재스캔 시 갱신, 목록에 중복 안 생김)·20개 상한을 지키는지 검증. 실제 electron-store/디스크
미접근.

---

## 3. SCR-06 Remote 설정

### 3-1. 화면 설계 — 기존 기능 재배치 + 신규 1개

문서엔 "origin 주소 확인 및 수정" 한 줄뿐이지만, 이미 구현된 origin 관련 기능(자동 프로토콜 전환
`fix_origin`, 미연결 시 등록 `add_origin`, SSH/HTTPS 선택 `set_origin_protocol`)을 진단 카드에
문제가 있을 때만 우연히 마주치는 게 아니라 **평소에도 관리할 수 있는 전용 화면**으로 제안한다.

```
┌─ Remote 설정 ────────────────────────────────┐
│ 현재 origin: https://github.com/gppc5096/repo.git (HTTPS)
│                                                │
│ 새 주소로 변경                                 │
│  [___________________________] [적용]          │
│                                                │
│ 프로토콜만 전환                                │
│  [SSH 사용]  [HTTPS 사용]                      │
└────────────────────────────────────────────┘
```

**"새 주소로 변경"은 기존 3개 스텝 중 어디에도 해당하지 않는 새 케이스다** — `add_origin`은
origin이 아예 없을 때만, `fix_origin`은 자동 판단된 프로토콜 불일치일 때만 동작한다. origin이
이미 있는데 사용자가 **완전히 다른 저장소 주소로 바꾸고 싶은 경우**를 위한 스텝이 없다.

### 3-2. 신규 스텝 — `set-origin-url.js` (~15줄)

```js
const { git: defaultGit } = require('../../git-helper');

// 이 파일이 하는 일: 사용자가 입력한 임의의 주소로 origin을 등록/교체만 한다.
// (add_origin은 "없을 때만", fix_origin/set_origin_protocol은 "프로토콜만" 다루는 것과 달리,
// 이 스텝은 origin 존재 여부와 무관하게 사용자가 준 주소를 그대로 적용한다.)
async function setOriginUrl(ctx) {
  const { originUrl, projectPath, git = defaultGit } = ctx;
  if (!originUrl) throw new Error('set_origin_url: originUrl이 없어 실행할 수 없습니다.');

  const exists = git('remote get-url origin', projectPath) !== null;
  const cmd = exists ? `remote set-url origin ${originUrl}` : `remote add origin ${originUrl}`;
  const result = git(cmd, projectPath);
  if (result === null) throw new Error(`set_origin_url: git ${cmd.split(' ')[0]} 실패`);
  return { message: `origin을 ${originUrl}로 설정했습니다.` };
}

module.exports = setOriginUrl;
```

`set_origin_protocol`(§ 이전 구현)은 그대로 재사용 — 진단 카드 밖에서도 `recoveryStore.runStep()`
으로 호출 가능하므로 화면에 버튼만 있으면 된다.

### 3-3. 테스트 전략

`set-origin-url.test.js`: origin 있을 때 `set-url` 호출, 없을 때 `add` 호출, 둘 다 실패 시
에러 — 기존 `set-origin-protocol.test.js`와 동일한 패턴(fake git 주입).

---

## 4. SCR-08 복구 히스토리

### 4-1. 문서 간 불일치 — 이 설계서의 권장안

docs/02 §8 로드맵 표는 "v1.5 | 배포 연동 확장 | Firebase/Vercel 진단, **복구 히스토리** | 4주"로
명시하지만, docs/03 §9-1(더 상세한 기술 설계 섹션)은 `recoveryHistory`를 `recentProjects`/
`settings`와 함께 **지금 스키마에 포함**시켜뒀다. 정황상 docs/03 작성 시점에 이미 "지금 만든다"는
전제였던 것으로 보인다.

**권장**: docs/03 §9-1을 따라 지금 만든다(사용자가 이미 4개 모두 진행 의사를 밝혔으므로). 다만
최종 확인은 §7에서 받는다.

### 4-2. 화면 설계

```
┌─ 복구 히스토리 ──────────────────────────────┐
│ 2026-08-07 14:32   us-monthly-etf   ✅ 성공 (2단계)
│ 2026-08-07 11:05   housebook-app    ⚠️ 실패 (push에서 중단)
└────────────────────────────────────────────┘
```

행 클릭 시 `steps` 배열을 펼쳐 각 단계의 성공/실패·메시지를 보여준다(별도 화면 전환 없이
아코디언 형태 — 새 라우트 불필요).

### 4-3. 기록 시점 — `recover:run` 완료 직후

```js
// ipc-handlers.js, RECOVER_RUN 핸들러 안에서
const startedAt = new Date().toISOString();
const result = await runRecovery(plan, progressCb);
appStore.addRecoveryHistoryEntry({
  id: crypto.randomUUID(),
  projectPath: plan.context?.projectPath ?? null,
  startedAt,
  finishedAt: new Date().toISOString(),
  ok: result.ok,
  summary: result.ok ? '전체 성공' : `${result.failedStep}에서 중단: ${result.error}`,
  steps: result.results,
});
```

> ⚠️ **보안 확인**: `result.results`의 각 스텝 `message`에 비밀값이 섞여 들어가면 그대로
> 디스크에 평문 기록된다. 기존 스텝들의 반환 메시지를 전수 확인한 결과(`add-origin.js`,
> `fix-origin.js`, `pat-store.js` 등) 전부 계정명·URL 등 비민감 정보만 담고 있어 안전하다 —
> **새 스텝을 추가할 때마다 이 불변식(반환 메시지에 토큰/비밀번호를 절대 담지 않는다)을 지켜야
> 한다**는 걸 §6 체크리스트에 명시한다.

### 4-4. 파일 분리 계획

```
src/renderer/views/RecoveryHistory.vue  ← 화면 조립만 (~50줄)
src/renderer/stores/history.js             ← getRecoveryHistory() 호출만 (~15줄)
```

### 4-5. 테스트 전략

`app-store.test.js`에 `addRecoveryHistoryEntry` 케이스 추가(50개 상한, 최신순). ipc-handlers는
이 프로젝트에서 별도 단위 테스트 대상이 아니었던 기존 관례를 따라 별도 테스트 없음(엔진 레이어
함수만 테스트).

---

## 5. SCR-10 환경설정

### 5-1. 스코프 축소 제안

문서의 "언어, 알림, AI 엔진 설정" 중 **"언어"는 이번 라운드에서 제외를 제안한다** — 지금 앱의
모든 문자열이 각 `.vue` 파일에 한국어로 하드코딩돼 있어서, 실제 다국어 지원은 `vue-i18n` 도입 +
전체 컴포넌트 문자열 추출이라는 훨씬 큰 별도 작업이다. 토글 하나 만들고 실제로 아무것도 안
바뀌는 "가짜 기능"을 만들 순 없으니, 이번엔 **AI 엔진 설정(Claude API 키) + 알림** 2가지만
다룬다.

### 5-2. AI 엔진 설정 — Claude API 키 관리 (보안 핵심)

지금은 `.env` 파일의 `ANTHROPIC_API_KEY`만 읽는다(코드 수정 없이는 앱 안에서 바꿀 방법이 없음).
PAT 때와 똑같은 이유로 **keytar에 저장**하고 `ai-diagnosis.js`가 **keytar 우선, 없으면 `.env`
폴백**하도록 한다(기존 `.env` 개발 워크플로를 안 깨면서 앱 UI로도 설정 가능하게).

```js
// src/engine/ai-key-store.js (신규, ~20줄)
const nodeKeytar = require('keytar');
const SERVICE = 'github-doctor-anthropic';
const ACCOUNT = 'default';

async function saveAiKey(key, { keytar = nodeKeytar } = {}) {
  await keytar.setPassword(SERVICE, ACCOUNT, key);
}
async function getAiKey({ keytar = nodeKeytar } = {}) {
  return (await keytar.getPassword(SERVICE, ACCOUNT)) || process.env.ANTHROPIC_API_KEY || null;
}

module.exports = { saveAiKey, getAiKey };
```

`ai-diagnosis.js`의 기존 `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` 부분을
`await getAiKey()`로 교체 — **이 한 줄 교체가 이번 설계에서 기존 코드를 건드리는 유일한 지점**이라
영향 범위가 명확하다.

마스킹 입력·저장 후 재노출 금지 등은 §16 PAT 설계와 완전히 동일한 원칙을 그대로 적용한다(중복
설명 생략).

### 5-3. 알림 설정

```js
{ settings: { notificationsEnabled: boolean } }
```

**주의**: 지금 코드베이스엔 실제 OS 알림(`new Notification()`)을 띄우는 곳이 어디에도 없다. 이
토글은 일단 **값만 저장**하고, "복구 완료 시 알림 띄우기" 같은 실제 알림 로직은 이번 스코프에
넣지 않는다(토글은 있는데 아무 효과가 없는 상태로 잠깐 존재함 — §7에서 이 순서가 괜찮은지
확인받는다).

### 5-4. 화면 설계

```
┌─ 환경설정 ────────────────────────────────────┐
│ 🤖 AI 엔진 설정                                │
│  Claude API 키  [•••••••••••••••••] [저장]     │
│  상태: ✅ 설정됨 / ⚠️ 미설정 (규칙 기반으로 동작) │
│                                                │
│ 🔔 알림                                        │
│  [ ] 복구 완료 시 알림 (준비 중)                │
└────────────────────────────────────────────┘
```

### 5-5. 파일 분리 계획

```
src/engine/ai-key-store.js         ← §5-2 (~20줄, 신규)
src/renderer/views/Settings.vue        ← 화면 조립만 (~60줄)
src/renderer/stores/settings.js           ← saveAiKey/getSettings 호출만 (~25줄)
```

### 5-6. 테스트 전략

`ai-key-store.test.js`: fake keytar 주입, 저장/조회/`.env` 폴백 3케이스. 실제 Keychain 미접근
(PAT 테스트와 동일 패턴).

---

## 6. 전체 파일 구조 요약 (§15 기준: 파일 100줄/함수 20줄)

```
src/engine/
├── app-store.js            ← 신규 (~35줄) — recentProjects/recoveryHistory 공통
├── ai-key-store.js            ← 신규 (~20줄) — Claude API 키 (keytar)
└── recovery/steps/
    └── set-origin-url.js         ← 신규 (~15줄)

src/renderer/views/
├── ProjectSelect.vue    ← 신규 (~60줄)
├── RemoteConfig.vue        ← 신규 (~50줄)
├── RecoveryHistory.vue        ← 신규 (~50줄)
└── Settings.vue                  ← 신규 (~60줄)

src/renderer/stores/
├── projects.js    ← 신규 (~20줄)
├── history.js         ← 신규 (~15줄)
└── settings.js            ← 신규 (~25줄)

기존 파일 수정 (전부 몇 줄 추가 수준, 100줄 상한 여유 있음):
├── src/main/ipc-handlers.js   ← 핸들러 4개 추가 (프로젝트/히스토리 기록 + 신규 IPC 채널들)
├── src/engine/ai-diagnosis.js    ← API 키 조회 방식 1줄 교체
├── src/shared/ipc-channels.js       ← 채널 상수 추가
├── src/main/preload.js                 ← 새 IPC 노출
└── src/renderer/components/Sidebar.vue    ← 4개 탭 활성화
```

전부 §15 기준 안에 들어온다.

---

## 7. 결정이 필요한 열린 질문 (구현 착수 전 확인)

1. **복구 히스토리를 v1.5가 아니라 지금 만드는 게 맞는지** — docs/02는 v1.5, docs/03 §9-1
   스키마는 지금 포함. 이 설계서는 "지금 만든다"를 권장.
2. **환경설정의 "언어" 항목을 이번에 제외하는 것에 동의하는지** — 실제 다국어 지원은 훨씬 큰
   별도 작업이라 이번엔 AI 키 + 알림 토글만 제안.
3. **"알림" 토글을 값만 저장하고 실제 알림 기능은 나중으로 미루는 것에 동의하는지** — 지금
   당장은 아무 효과 없는 설정 항목이 됨.
4. **Remote 설정의 "새 주소로 변경"을 완전 자유 입력으로 둘지** — 지금까지 원칙(모호하면 자동
   추측 안 함)과 달리, 이건 사용자가 직접 입력한 값을 검증 없이 그대로 적용하는 유일한 origin
   조작 기능이 된다(오타로 엉뚱한 저장소를 가리키게 될 수 있음 — 확인 문구 정도는 필요해 보임).

---

*GitHub Doctor 사이드바 4개 화면 구현 설계서 v1.1 | 기반: docs/02 §5-1·5-3·§8, docs/03 §9-1·§15*
