🩺

# GitHub Doctor

## 실전 개발 계획서 (완전판)

> Scaffold → Code → Ship — 복사·붙여넣기로 완성하는 단계별 실행 매뉴얼

| 항목 | 내용 |
|---|---|
| 문서 종류 | 실전 개발 계획서 (Implementation Plan) |
| 기반 문서 | GitHub Doctor PRD v1.0 · 개발 목표 정의서 v1.0 |
| 버전 | v1.1 완전판 (v1.0 섹션 0~14 + v1.1 섹션 15 병합, 리뷰 반영) |
| 작성일 | 2026년 8월 |
| 타겟 OS | macOS 12+ (Intel/Apple Silicon) · Windows 10/11 |
| 기술 스택 | Electron · Vue 3 · Node.js · Claude API (`claude-sonnet-5`) |
| 배포 형태 | macOS .dmg · Windows .exe (electron-builder) |

---

## 이 문서에 대하여 (v1.1 완전판 개정 노트)

기존 `03-...v1.0.docx`와 `04-...v1.1_코드분리원칙.docx`는 04가 "섹션 1~14는 v1.0과 동일, 섹션 15만 추가"라는 전제로 분리 보관되어 있었습니다. 두 파일을 따로 유지하면 한쪽만 수정될 위험이 있어, 이번에 **하나의 완전판**으로 병합했습니다. 병합 과정에서 코드 리뷰로 발견된 문제 3가지를 함께 수정했습니다.

| # | 문제 | 위치 | 수정 내용 |
|---|---|---|---|
| 1 | 존재하지 않는 모델 ID `claude-sonnet-4-6` 사용 | 문서 헤더, §5-1 `ai-diagnosis.js` | `claude-sonnet-5`로 수정 + "구현 시점에 최신 모델 ID 재확인" 안내 추가 |
| 2 | Windows 어댑터가 **비밀번호(PAT)를 계정명으로 오인**해 반환 | §7-3 `windows-adapter.js` `getStoredCredentials()` | `Password` 대신 `UserName` 프로퍼티만 조회하도록 수정 (보안·정확성 동시 개선) |
| 3 | 복구 스텝 ID 불일치 (`fix_user_config` vs `fix_config`) + 규칙 엔진이 해당 이슈를 아예 생성하지 않음 | §5-2 `rule-diagnosis.js`, §8 `recovery.js`, §15 `step-registry.js` | 전 구간 `fix_config`로 통일, 규칙 엔진에 "규칙 7: user.name/email 불일치" 추가 |

---

## 목차

0. 문서 읽는 법 & 개발 원칙
1. 개발 환경 구축
2. 프로젝트 스캐폴딩
3. 메인 프로세스 (Electron Main)
4. 진단 엔진 개발
5. AI 진단 엔진 (Claude API 연동)
6. 렌더러 — UI 개발 (Vue 3)
7. OS 인증 어댑터 (macOS / Windows)
8. 자동 복구 엔진
9. 보안 & 데이터 저장
10. 빌드 & 배포 (electron-builder)
11. 테스트 전략
12. 단계별 개발 로드맵
13. 갈림길 판단 기준표
14. 트러블슈팅 레퍼런스
15. 코드 분리 원칙 & 유지보수 가이드

---

## 0. 문서 읽는 법 & 개발 원칙

### 0-1. 이 문서의 목적

이 문서는 "설명서"가 아니라 "실행서"다. 각 섹션은 실제로 터미널에 입력할 명령어, 생성할 파일 경로, 작성할 코드 골격, 그리고 갈림길마다 어떤 선택을 하고 왜 하는지 판단 기준까지 포함한다. 처음부터 끝까지 순서대로 따라가면 GitHub Doctor v0.1 MVP가 완성된다.

### 0-2. 표기 규칙

| 표기 | 의미 |
|---|---|
| `# 터미널 명령` | 터미널에 그대로 입력하는 명령어 |
| 📁 경로/파일명 | 생성하거나 편집할 파일 위치 |
| ⚠️ 주의 | 이 단계에서 자주 실수하는 포인트 |
| ✅ 판단 기준 | 선택지가 있을 때 "이걸 선택하라"는 근거 |
| 🔁 갈림길 | 상황에 따라 다른 경로를 택해야 하는 분기점 |

### 0-3. 핵심 개발 원칙 5가지

| 원칙 | 내용 | 이유 |
|---|---|---|
| OS 어댑터 분리 | macOS/Windows 코드를 한 파일에 섞지 않는다 | 플랫폼별 버그 추적이 불가능해짐 |
| 자동/반자동/안내 엄격 구분 | 보안 민감 작업은 절대 완전 자동 처리하지 않는다 | PAT·SSH 키 평문 노출 위험 |
| AI 응답 의존 최소화 | AI 진단 실패 시 규칙 기반 폴백 엔진이 반드시 동작해야 한다 | API 지연·오프라인 환경 대비 |
| 스캔 → 진단 → 복구 단방향 | 복구가 스캔을 변경하거나 진단이 복구를 재호출하지 않는다 | 사이드 이펙트 방지 |
| 사용자 동의 없는 삭제 금지 | 자동 복구라도 삭제 전 확인 다이얼로그 표시 | 되돌릴 수 없는 작업 보호 |

---

## 1. 개발 환경 구축

### 1-1. 필수 설치 목록

| 도구 | 버전 기준 | 설치 확인 명령 | 역할 |
|---|---|---|---|
| Node.js | 20.x LTS 이상 | `node -v` | Electron 런타임 |
| npm | 10.x 이상 | `npm -v` | 패키지 관리 |
| Git | 2.40 이상 | `git --version` | 진단 엔진 CLI 호출 |
| VS Code | 최신 | — | 개발 IDE |
| Xcode CLI (macOS) | 최신 | `xcode-select -p` | node-gyp 빌드 |
| Windows Build Tools | — | — | Windows node-gyp |

### 1-2. macOS 환경 구축

**Node.js 설치 (nvm 방식 — 권장)**

```bash
# 1. nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. 터미널 재시작 후
nvm install 20
nvm use 20
nvm alias default 20

# 3. 확인
node -v   # v20.x.x
npm -v    # 10.x.x
```

**Xcode Command Line Tools**

```bash
xcode-select --install
# 팝업에서 "설치" 클릭 → 완료까지 대기 (약 5~10분)

# 확인
xcode-select -p
# 출력: /Library/Developer/CommandLineTools
```

> ⚠️ 주의: Xcode CLI 없이 빌드하면 keytar(네이티브 모듈) 컴파일 오류 발생. 반드시 선행 설치.

### 1-3. Windows 환경 구축

**Node.js 설치 (공식 설치 프로그램)**

```powershell
# 1. https://nodejs.org → LTS 버전 다운로드 · 설치
# 설치 옵션: "Automatically install necessary tools" 체크 ✅

# 2. 관리자 권한 PowerShell에서 (구버전 Node일 때만)
npm install -g windows-build-tools

# 또는 (Node 20+ 신규 설치 시 자동 포함)
node -v
npm -v
```

**Git for Windows**

```powershell
# https://git-scm.com/download/win → 설치
# 설치 옵션: "Git Credential Manager" 반드시 체크 ✅

# 확인
git --version
git config --global credential.helper manager   # GCM 확인
```

> ✅ 판단 기준: Windows에서 credential helper가 "manager"(GCM)인지 반드시 확인. "wincred"면 다중 계정 사용 불가. GCM으로 교체 권장.

### 1-4. VS Code 추천 익스텐션

| 익스텐션 | 역할 |
|---|---|
| ESLint | 코드 품질 검사 |
| Prettier | 코드 포맷 자동화 |
| Volar (Vue - Official) | Vue 3 인텔리센스 |
| Electron Snippets | Electron 코드 스니펫 |
| GitLens | Git 히스토리 시각화 |
| Thunder Client | Claude API 테스트 |

---

## 2. 프로젝트 스캐폴딩

### 2-1. 프로젝트 생성

```bash
# 작업 폴더로 이동
cd ~/projects              # macOS
# cd C:\projects            # Windows

# 프로젝트 폴더 생성
mkdir github-doctor && cd github-doctor

# npm 초기화
npm init -y
```

### 2-2. 디렉터리 구조 (전체)

> 아래 구조를 먼저 만들고 나서 코딩 시작. 구조가 틀리면 Electron의 main/renderer 경로 설정이 꼬인다.

```
github-doctor/
├── package.json
├── electron-builder.yml
├── .env.example
├── .gitignore
│
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── index.js             # 앱 진입점
│   │   ├── preload.js           # 보안 브릿지
│   │   └── ipc-handlers.js      # IPC 채널 핸들러
│   │
│   ├── renderer/                # Vue 3 UI (렌더러 프로세스)
│   │   ├── index.html
│   │   ├── main.js              # Vue 앱 진입점
│   │   ├── App.vue
│   │   ├── router/index.js      # Vue Router
│   │   ├── stores/               # Pinia 상태 관리
│   │   │   ├── scan.js
│   │   │   ├── diagnosis.js
│   │   │   └── recovery.js
│   │   ├── views/                # 화면 컴포넌트 (SCR-01~10)
│   │   │   ├── Dashboard.vue     # SCR-01 메인 진단 대시보드
│   │   │   ├── ProjectSelect.vue # SCR-02
│   │   │   ├── AccountManager.vue# SCR-03
│   │   │   ├── SshManager.vue    # SCR-04
│   │   │   ├── CredManager.vue   # SCR-05
│   │   │   ├── RemoteConfig.vue  # SCR-06
│   │   │   ├── DeployLink.vue    # SCR-07
│   │   │   ├── History.vue       # SCR-08
│   │   │   ├── RecoveryDone.vue  # SCR-09
│   │   │   └── Settings.vue      # SCR-10
│   │   └── components/           # 공통 컴포넌트
│   │       ├── Sidebar.vue
│   │       ├── ScanResultCard.vue
│   │       ├── DiagnosisCard.vue
│   │       ├── RecoverySteps.vue
│   │       ├── StatusBadge.vue
│   │       └── ActionBar.vue
│   │
│   ├── engine/                   # 진단·복구 엔진 (Node.js)
│   │   ├── scanner.js            # Phase 1: 자동 스캔
│   │   ├── ai-diagnosis.js       # Phase 2: Claude AI 진단
│   │   ├── rule-diagnosis.js     # Phase 2 폴백: 규칙 기반 진단
│   │   ├── recovery.js           # Phase 3: 자동 복구 오케스트레이터
│   │   └── git-helper.js         # git 명령어 유틸
│   │
│   ├── adapters/                 # OS별 인증 어댑터
│   │   ├── index.js              # OS 감지 및 어댑터 선택
│   │   ├── macos-adapter.js      # macOS Keychain
│   │   └── windows-adapter.js    # Windows Credential Manager
│   │
│   └── shared/                   # Main·Renderer 공용
│       ├── constants.js          # 상수 정의
│       └── ipc-channels.js       # IPC 채널명 상수
│
├── assets/
│   ├── icons/
│   │   ├── icon.png              # 512x512 앱 아이콘
│   │   ├── icon.icns             # macOS
│   │   └── icon.ico              # Windows
│   └── styles/
│       └── global.css
│
└── tests/
    ├── unit/
    └── integration/
```

> 섹션 15에서 `engine/`, `adapters/`, `renderer/` 하위 폴더를 더 잘게 쪼갠 "완성 구조"를 다룬다. 여기서는 v0.1 MVP를 시작할 때의 기본 골격만 잡는다.

### 2-3. 폴더 일괄 생성 명령

```bash
# macOS / Linux
mkdir -p src/main src/renderer/router src/renderer/stores \
  src/renderer/views src/renderer/components \
  src/engine src/adapters src/shared \
  assets/icons assets/styles tests/unit tests/integration
```

```powershell
# Windows PowerShell
$dirs = "src/main","src/renderer/router","src/renderer/stores",
  "src/renderer/views","src/renderer/components",
  "src/engine","src/adapters","src/shared",
  "assets/icons","assets/styles","tests/unit","tests/integration"
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ }
```

### 2-4. 패키지 설치

**프로덕션 의존성**

```bash
npm install \
  electron \
  vue@3 \
  vue-router@4 \
  pinia \
  @anthropic-ai/sdk \
  keytar \
  electron-store \
  electron-updater
```

**개발 의존성**

```bash
npm install -D \
  electron-builder \
  @vitejs/plugin-vue \
  vite \
  vite-plugin-electron \
  eslint \
  prettier \
  vitest \
  @vue/test-utils
```

### 2-5. package.json 핵심 설정

```json
{
  "name": "github-doctor",
  "version": "0.1.0",
  "description": "AI 기반 GitHub 인증 자동 진단 및 복구",
  "main": "src/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "build:mac": "vite build && electron-builder --mac",
    "build:win": "vite build && electron-builder --win",
    "test": "vitest",
    "start": "electron ."
  },
  "build": {
    "extends": "./electron-builder.yml"
  }
}
```

### 2-6. .gitignore

```
node_modules/
dist/
.env
*.dmg
*.exe
*.AppImage
.DS_Store
Thumbs.db
```

### 2-7. .env.example

```bash
# Claude AI API 키 — 절대 git에 커밋하지 말 것
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# 개발 모드 (production | development)
NODE_ENV=development
```

> ⚠️ 주의: .env 파일은 반드시 .gitignore에 포함. API 키 노출 시 즉시 Anthropic Console에서 무효화 필요.

---

## 3. 메인 프로세스 (Electron Main)

### 3-1. `src/main/index.js` — 앱 진입점

```js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipc-handlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 760,
    minWidth: 900, minHeight: 640,
    webPreferences: {
      nodeIntegration: false,   // 보안: 반드시 false
      contextIsolation: true,   // 보안: 반드시 true
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers(ipcMain); // IPC 채널 등록
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

### 3-2. `src/main/preload.js` — 보안 브릿지

> ⚠️ 핵심 보안 파일: 렌더러(Vue)가 메인 프로세스와 통신하는 유일한 통로. 이 파일 외의 Node API 노출 금지.

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
  scan: (projectPath) => ipcRenderer.invoke('scan:run', projectPath),
  diagnose: (scanResult) => ipcRenderer.invoke('diagnose:run', scanResult),
  recover: (plan) => ipcRenderer.invoke('recover:run', plan),
  genSshKey: (account) => ipcRenderer.invoke('ssh:generate', account),
  openUrl: (url) => ipcRenderer.invoke('shell:openUrl', url),
  onProgress: (cb) => ipcRenderer.on('recover:progress', (_, data) => cb(data)),
});
```

### 3-3. `src/shared/ipc-channels.js`

```js
// IPC 채널명을 상수로 관리 — 오탈자 방지
module.exports = {
  SCAN_RUN: 'scan:run',
  DIAGNOSE_RUN: 'diagnose:run',
  RECOVER_RUN: 'recover:run',
  RECOVER_PROGRESS: 'recover:progress',
  SSH_GENERATE: 'ssh:generate',
  SHELL_OPEN_URL: 'shell:openUrl',
};
```

### 3-4. `src/main/ipc-handlers.js`

```js
const { shell } = require('electron');
const { runScan } = require('../engine/scanner');
const { runDiagnose } = require('../engine/ai-diagnosis');
const { runRecovery } = require('../engine/recovery');
const { generateSshKey } = require('../adapters');
const CH = require('../shared/ipc-channels');

function setupIpcHandlers(ipcMain) {
  // ── 스캔 ───────────────────────────────────────
  ipcMain.handle(CH.SCAN_RUN, async (event, projectPath) => {
    try {
      return await runScan(projectPath);
    } catch (e) {
      return { error: e.message };
    }
  });

  // ── 진단 ───────────────────────────────────────
  ipcMain.handle(CH.DIAGNOSE_RUN, async (event, scanResult) => {
    return await runDiagnose(scanResult);
  });

  // ── 복구 ───────────────────────────────────────
  ipcMain.handle(CH.RECOVER_RUN, async (event, plan) => {
    return await runRecovery(plan, (progress) => {
      event.sender.send(CH.RECOVER_PROGRESS, progress);
    });
  });

  // ── SSH 키 생성 ─────────────────────────────────
  ipcMain.handle(CH.SSH_GENERATE, async (event, account) => {
    return await generateSshKey(account);
  });

  // ── 외부 URL ────────────────────────────────────
  ipcMain.handle(CH.SHELL_OPEN_URL, async (event, url) => {
    await shell.openExternal(url);
  });
}

module.exports = { setupIpcHandlers };
```

---

## 4. 진단 엔진 개발 (Phase 1: 자동 스캔)

### 4-1. `src/engine/git-helper.js` — Git CLI 유틸

```js
const { execSync } = require('child_process');

// git 명령 실행 유틸 — 에러 시 null 반환
function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd, encoding: "utf8", timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

// 플랫폼 독립 명령 실행
function run(cmd, cwd) {
  try {
    return execSync(cmd, {
      cwd, encoding: "utf8", timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

module.exports = { git, run };
```

### 4-2. `src/engine/scanner.js` — 자동 스캔 메인

```js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { git, run } = require('./git-helper');
const adapter = require('../adapters');

async function runScan(projectPath) {
  const result = {
    projectPath,
    timestamp: new Date().toISOString(),
    items: {},
  };
  const r = result.items;

  // ── 1. Git 설치 여부 ───────────────────────────
  const gitVer = run("git --version");
  r.gitInstalled = {
    ok: !!gitVer,
    value: gitVer || "미설치",
    severity: gitVer ? "ok" : "critical",
  };
  if (!gitVer) return result; // Git 없으면 이후 스캔 불필요

  // ── 2. user.name / user.email ──────────────────
  r.userName = {
    local: git("config --local user.name", projectPath),
    global: git("config --global user.name"),
  };
  r.userEmail = {
    local: git("config --local user.email", projectPath),
    global: git("config --global user.email"),
  };
  r.userName.active = r.userName.local || r.userName.global;
  r.userEmail.active = r.userEmail.local || r.userEmail.global;
  r.userName.severity = r.userName.active ? "ok" : "warning";
  r.userEmail.severity = r.userEmail.active ? "ok" : "warning";

  // ── 3. credential helper ───────────────────────
  r.credHelper = {
    value: git("config --global credential.helper"),
  };
  const helper = r.credHelper.value || "";
  r.credHelper.ok = !!helper;
  r.credHelper.severity = helper ? "ok" : "warning";

  // ── 4. OS별 저장된 인증정보 ────────────────────
  r.storedCreds = await adapter.getStoredCredentials();

  // ── 5. SSH 키 존재 여부 및 유형 ──────────────
  const sshDir = path.join(os.homedir(), ".ssh");
  const sshFiles = fs.existsSync(sshDir)
    ? fs.readdirSync(sshDir).filter(f => f.endsWith(".pub"))
    : [];
  r.sshKeys = sshFiles.map(f => {
    const type = f.includes("ed25519") ? "Ed25519"
      : f.includes("rsa") ? "RSA"
      : f.includes("dsa") ? "DSA (폐기됨 ⚠️)"
      : "Unknown";
    return { file: f, type, isDSA: f.includes("dsa"),
      severity: f.includes("dsa") ? "critical" : "ok" };
  });

  // ── 6. ssh-agent 상태 ──────────────────────────
  const agentOut = run("ssh-add -l");
  r.sshAgent = {
    running: agentOut !== null,
    keyCount: agentOut ? agentOut.split("\n").length : 0,
    severity: agentOut !== null ? "ok" : "warning",
  };

  // ── 7. origin remote ───────────────────────────
  const remote = git("remote get-url origin", projectPath);
  r.origin = {
    value: remote || null,
    protocol: remote ? (remote.startsWith("git@") ? "SSH" : "HTTPS") : null,
    severity: remote ? "ok" : "warning",
  };

  // ── 8. GitHub API 연결 상태 ────────────────────
  try {
    const res = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(5000) });
    r.githubConn = { ok: res.ok, status: res.status, severity: "ok" };
  } catch {
    r.githubConn = { ok: false, status: null, severity: "critical" };
  }

  return result;
}

module.exports = { runScan };
```

> ✅ 판단 기준: 스캔 항목은 순서가 중요. Git 미설치 → 즉시 반환. GitHub API 연결 → 마지막에 확인(가장 느림). 중간 항목 실패해도 나머지 계속 스캔.

> ⚠️ **`storedCreds[].isWrong` 계산 로직 추가 (v1.0, 실제 구현에서 발견 및 사용자 결정 반영)**: 위 코드와
> §7-2/7-3의 어댑터 코드는 `isWrong`을 항상 `false`로 반환할 뿐, "이 계정이 현재 프로젝트에 맞는
> 계정인가"를 비교해서 뒤집는 로직이 없다 — 즉 원문 그대로면 `wrong_cred` 규칙(§5-2)이 절대 발동하지
> 않는다. 실제 구현(`src/engine/scanner.js`)은 SSH 키 스캔(원문 순서 5번)을 storedCreds 조회보다
> 먼저 수행해 `id_ed25519_<account>` 파일명에서 후보 계정을 뽑고, `getStoredCredentials({ candidateAccounts })`로
> 넘겨 어댑터가 해당 계정들의 Keychain/Credential Manager 존재 여부만 추가로 확인하게 한다. 그 후
> **저장된 계정이 2개 이상이고 그중 하나가 `userName.active`와 일치할 때만** 나머지를 `isWrong: true`로
> 표시한다 (계정이 1개뿐이거나 일치하는 게 없으면 절대 건드리지 않음 — 오탐으로 유효한 자격증명을
> 지우는 사고를 막기 위함). 자세한 배경은 `TODO.md`의 "해결된 핵심 기능 공백" 참고.

### 4-3. 스캔 결과 데이터 구조 (참고)

```jsonc
// severity: "ok" | "warning" | "critical"
{
  "projectPath": "/Users/bluebird/projects/housebook",
  "timestamp": "2026-08-06T07:00:00.000Z",
  "items": {
    "gitInstalled": { "ok": true, "value": "git version 2.45.0", "severity": "ok" },
    "userName": { "active": "jongchoon5803", "local": null, "global": "jongchoon5803", "severity": "ok" },
    "userEmail": { "active": "najongchoon@gmail.com", "...": "..." },
    "credHelper": { "value": "osxkeychain", "ok": true, "severity": "ok" },
    "storedCreds": [{ "account": "gppc5096", "server": "github.com", "isWrong": true }],
    "sshKeys": [{ "file": "id_ed25519.pub", "type": "Ed25519", "isDSA": false }],
    "sshAgent": { "running": true, "keyCount": 1, "severity": "ok" },
    "origin": { "value": "https://github.com/jongchoon580325/housebook.git", "protocol": "HTTPS" },
    "githubConn": { "ok": true, "status": 200, "severity": "ok" }
  }
}
```

---

## 5. AI 진단 엔진 (Claude API 연동)

### 5-1. `src/engine/ai-diagnosis.js`

> ⚠️ **모델 ID 수정 (v1.1 완전판)**: 원문에는 `claude-sonnet-4-6`이라는 존재하지 않는 모델 ID가 적혀 있었습니다. 아래는 `claude-sonnet-5`로 수정했습니다. Claude API의 `model` 값은 시점에 따라 갱신되므로, 구현 착수 시 [Anthropic 공식 문서]에서 현재 유효한 모델 ID를 다시 확인하세요.

```js
const Anthropic = require('@anthropic-ai/sdk');
const { ruleDiagnose } = require('./rule-diagnosis');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runDiagnose(scanResult) {
  // 1. AI 진단 시도
  try {
    const prompt = buildPrompt(scanResult);
    const msg = await client.messages.create({
      model: 'claude-sonnet-5', // ⚠️ 구현 시점에 최신 모델 ID로 재확인
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = msg.content[0].text;
    return parseAIResponse(raw);

  } catch (e) {
    // 2. API 실패 시 규칙 기반 폴백
    console.warn("AI 진단 실패, 규칙 기반으로 전환:", e.message);
    return ruleDiagnose(scanResult);
  }
}

function buildPrompt(scanResult) {
  return `당신은 GitHub 인증 문제 전문가입니다.
아래 스캔 결과를 분석하여 문제를 진단하고 복구 계획을 JSON으로 반환하세요.

스캔 결과:
${JSON.stringify(scanResult.items, null, 2)}

반환 형식 (JSON만 반환, 설명 없이):
{
  "summary": "한 문장 요약",
  "issues": [
    {
      "id": "unique_id",
      "severity": "critical|warning|info",
      "title": "제목",
      "description": "초보자도 이해할 수 있는 설명",
      "autoFixable": true|false,
      "fixType": "auto|semi|guide"
    }
  ],
  "recoveryPlan": ["step1_id", "step2_id", ...]
}`
}

function parseAIResponse(raw) {
  try {
    // JSON 블록 추출 (마크다운 펜스 제거)
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return { source: "ai", ...JSON.parse(cleaned) };
  } catch {
    return { source: "ai_parse_error", issues: [], summary: "분석 실패" };
  }
}

module.exports = { runDiagnose };
```

### 5-2. `src/engine/rule-diagnosis.js` — 폴백 규칙 엔진

> AI API 실패·오프라인·응답 지연 시 이 규칙 엔진이 동일한 인터페이스로 진단 결과를 반환한다. 반드시 구현.
>
> ⚠️ **규칙 추가 (v1.1 완전판)**: 원문 규칙 엔진은 PRD Phase 3 표에서 "완전 자동"으로 분류된 `user.name`/`user.email` 교체 항목에 대응하는 규칙이 누락되어 있었습니다 (`storedCreds`만 `wrong_cred`로 감지되고, 계정 설정 불일치는 감지되지 않았음). **규칙 7**을 추가하고, 복구 스텝 레지스트리(§15)와 ID를 맞추기 위해 이슈 id를 `fix_config`로 지정합니다.

```js
function ruleDiagnose(scanResult) {
  const items = scanResult.items;
  const issues = [];

  // 규칙 1: Git 미설치
  if (!items.gitInstalled?.ok) {
    issues.push({ id: "no_git", severity: "critical",
      title: "Git이 설치되지 않음",
      description: "Git을 설치해야 GitHub 기능을 사용할 수 있습니다.",
      autoFixable: false, fixType: "guide" });
  }

  // 규칙 2: 저장된 인증정보에 오계정 존재
  const wrongCreds = (items.storedCreds || []).filter(c => c.isWrong);
  if (wrongCreds.length > 0) {
    issues.push({ id: "wrong_cred", severity: "critical",
      title: `Keychain에 다른 계정 토큰 잔존 (${wrongCreds.map(c => c.account).join(", ")})`,
      description: "이전 계정 인증정보가 남아 있어 push가 막힙니다. 자동으로 삭제합니다.",
      autoFixable: true, fixType: "auto" });
  }

  // 규칙 3: SSH 키 없음
  if ((items.sshKeys || []).length === 0) {
    issues.push({ id: "no_ssh", severity: "warning",
      title: "SSH 키가 없습니다",
      description: "SSH 키를 생성하면 더 안전하고 편리하게 GitHub를 사용할 수 있습니다.",
      autoFixable: false, fixType: "semi" });
  }

  // 규칙 4: DSA 키 감지
  const dsaKeys = (items.sshKeys || []).filter(k => k.isDSA);
  if (dsaKeys.length > 0) {
    issues.push({ id: "dsa_key", severity: "critical",
      title: "폐기된 DSA SSH 키 감지",
      description: "DSA 키는 2022년 이후 GitHub에서 사용 불가. Ed25519 키를 새로 생성하세요.",
      autoFixable: false, fixType: "semi" });
  }

  // 규칙 5: origin 없음
  if (!items.origin?.value) {
    issues.push({ id: "no_origin", severity: "warning",
      title: "원격 저장소(origin)가 연결되지 않음",
      description: "GitHub 저장소 주소를 등록해야 push가 가능합니다.",
      autoFixable: false, fixType: "guide" });
  }

  // 규칙 6: GitHub 연결 불가
  if (!items.githubConn?.ok) {
    issues.push({ id: "no_network", severity: "critical",
      title: "GitHub 서버에 연결할 수 없음",
      description: "인터넷 연결 또는 방화벽 설정을 확인하세요.",
      autoFixable: false, fixType: "guide" });
  }

  // 규칙 7 (v1.1 추가): user.name / user.email 미설정 또는 불일치
  // storedCreds의 계정과 git config의 사용자 정보가 어긋나면 push 작성자 정보가 꼬인다.
  // PRD Phase 3 기준상 "완전 자동" 항목이므로 autoFixable: true, id는 §15 스텝 레지스트리와
  // 동일하게 "fix_config"로 맞춘다.
  const missingUserConfig = !items.userName?.active || !items.userEmail?.active;
  if (missingUserConfig) {
    issues.push({ id: "fix_config", severity: "warning",
      title: "Git 사용자 정보(user.name / user.email)가 설정되지 않음",
      description: "커밋 작성자 정보를 현재 계정 기준으로 자동 설정합니다.",
      autoFixable: true, fixType: "auto" });
  }

  const summary = issues.length === 0
    ? "발견된 문제가 없습니다. push를 진행하세요."
    : `총 ${issues.length}가지 문제를 발견했습니다.`;

  return {
    source: "rule",
    summary,
    issues,
    recoveryPlan: issues.filter(i => i.autoFixable).map(i => i.id),
  };
}

module.exports = { ruleDiagnose };
```

> 🔁 갈림길 — **(v1.0, 사용자 결정으로 갱신)** `origin`이 아예 없는 경우(`no_origin`)는 규칙 엔진만으로는
> "정확한 값"을 알 수 없어 계속 `guide`로 남긴다. 반면 **origin은 있는데 사용 가능한 인증 수단과
> 프로토콜(HTTPS/SSH)만 맞지 않는 경우**는 owner/repo 경로를 그대로 두고 프로토콜만 기계적으로
> 바꾸는 것이라 "어느 저장소가 맞는지" 추측이 필요 없어, 규칙 엔진만으로도 안전하게 완전자동으로
> 처리한다(`fix_origin`, 규칙 8 — `src/engine/recovery-context.js`의 `detectCorrectOrigin()` 참고).
> 완전히 다른 저장소를 가리키는 경우(진짜 오탈자·잘못된 주소)는 여전히 규칙 엔진이 알 방법이 없어,
> AI 진단 경로(§5-1)가 `context.correctOrigin`을 함께 제시할 때만 자동 실행 후보에 오른다.

---

## 6. 렌더러 — UI 개발 (Vue 3)

### 6-1. Vite 설정 (`vite.config.js`)

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    vue(),
    electron([{ entry: 'src/main/index.js' }]),
  ],
  root: "src/renderer",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});
```

### 6-2. `src/renderer/main.js` — Vue 앱 진입점

```js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import '../../../assets/styles/global.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
```

### 6-3. `src/renderer/router/index.js` — 라우터

```js
import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('../views/Dashboard.vue') },
  { path: '/project', component: () => import('../views/ProjectSelect.vue') },
  { path: '/accounts', component: () => import('../views/AccountManager.vue') },
  { path: '/ssh', component: () => import('../views/SshManager.vue') },
  { path: '/creds', component: () => import('../views/CredManager.vue') },
  { path: '/remote', component: () => import('../views/RemoteConfig.vue') },
  { path: '/deploy', component: () => import('../views/DeployLink.vue') },
  { path: '/history', component: () => import('../views/History.vue') },
  { path: '/done', component: () => import('../views/RecoveryDone.vue') },
  { path: '/settings', component: () => import('../views/Settings.vue') },
];

export default createRouter({
  history: createWebHashHistory(), // Electron은 Hash 모드 사용
  routes,
});
```

> ⚠️ 주의: Electron에서 Vue Router는 반드시 `createWebHashHistory()` 사용. `createWebHistory()`는 파일 로드 시 404 발생.

### 6-4. `src/renderer/stores/scan.js` — Pinia 스토어

```js
import { defineStore } from 'pinia';

export const useScanStore = defineStore("scan", {
  state: () => ({
    projectPath: null,
    scanResult: null,
    isScanning: false,
    scanError: null,
  }),
  actions: {
    async runScan(projectPath) {
      this.isScanning = true;
      this.scanError = null;
      try {
        this.projectPath = projectPath;
        this.scanResult = await window.electronAPI.scan(projectPath);
      } catch (e) {
        this.scanError = e.message;
      } finally {
        this.isScanning = false;
      }
    },
  },
});
```

### 6-5. SCR-01 `Dashboard.vue` — 핵심 화면 골격

```vue
<template>
  <div class="dashboard">
    <!-- 프로젝트 경로 바 -->
    <div class="path-bar">
      <span class="path">{{ scanStore.projectPath || "프로젝트를 선택하세요" }}</span>
      <button @click="$router.push('/project')">변경</button>
    </div>

    <!-- 스캔 중 -->
    <div v-if="scanStore.isScanning" class="loading">
      <p>환경 스캔 중... (최대 10초)</p>
    </div>

    <!-- 스캔 완료 -->
    <div v-else-if="scanStore.scanResult" class="grid">
      <ScanResultCard :items="scanStore.scanResult.items" />
      <DiagnosisCard :diagnosis="diagStore.diagnosis" />
      <RecoverySteps :steps="recoveryStore.steps" />
    </div>

    <!-- 액션 바 -->
    <ActionBar
      :status="recoveryStore.status"
      @start="startRecovery"
      @abort="abortRecovery"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useScanStore } from '../stores/scan';
import { useDiagnosisStore } from '../stores/diagnosis';
import { useRecoveryStore } from '../stores/recovery';
import ScanResultCard from '../components/ScanResultCard.vue';
import DiagnosisCard from '../components/DiagnosisCard.vue';
import RecoverySteps from '../components/RecoverySteps.vue';
import ActionBar from '../components/ActionBar.vue';

const scanStore = useScanStore();
const diagStore = useDiagnosisStore();
const recoveryStore = useRecoveryStore();

onMounted(async () => {
  if (scanStore.projectPath) {
    await scanStore.runScan(scanStore.projectPath);
    await diagStore.runDiagnose(scanStore.scanResult);
  }
});

async function startRecovery() {
  await recoveryStore.runRecovery(diagStore.diagnosis.recoveryPlan);
}
function abortRecovery() {
  recoveryStore.abort();
}
</script>
```

---

## 7. OS 인증 어댑터 (macOS / Windows)

### 7-1. `src/adapters/index.js` — OS 감지 및 라우팅

```js
const os = require('os');

function getAdapter() {
  return os.platform() === 'darwin'
    ? require('./macos-adapter')
    : require('./windows-adapter');
}

// 공통 인터페이스 — 어댑터는 반드시 이 함수들을 export
module.exports = {
  getStoredCredentials: () => getAdapter().getStoredCredentials(),
  deleteCredential: (account) => getAdapter().deleteCredential(account),
  saveCredential: (account, token) => getAdapter().saveCredential(account, token),
  generateSshKey: (account) => getAdapter().generateSshKey(account),
};
```

### 7-2. `src/adapters/macos-adapter.js`

```js
const { run } = require('../engine/git-helper');
const keytar = require('keytar');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// macOS Keychain에서 GitHub 인증정보 목록 조회
async function getStoredCredentials() {
  try {
    // security CLI로 Keychain 항목 조회
    const raw = run(`security find-internet-password -s github.com -g 2>&1 || true`);
    if (!raw) return [];

    // 계정명 추출
    const accountMatch = raw.match(/"acct"<blob>="([^"]+)"/);
    if (!accountMatch) return [];

    return [{ account: accountMatch[1], server: "github.com",
      isWrong: false // 스캐너에서 context와 비교 후 판단
    }];
  } catch { return []; }
}

// Keychain에서 GitHub 인증정보 삭제
async function deleteCredential(account) {
  try {
    execSync(`security delete-internet-password -a "${account}" -s github.com`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Keychain에 새 인증정보 저장 (keytar 사용)
async function saveCredential(account, token) {
  await keytar.setPassword("github.com", account, token);
  return { ok: true };
}

// Ed25519 SSH 키 생성
async function generateSshKey(account) {
  const keyPath = path.join(os.homedir(), ".ssh", `id_ed25519_${account}`);
  execSync(`ssh-keygen -t ed25519 -C "${account}" -f "${keyPath}" -N ""`, { stdio: 'pipe' });
  const pubKey = require("fs").readFileSync(`${keyPath}.pub`, "utf8").trim();
  return { keyPath, pubKey };
}

module.exports = { getStoredCredentials, deleteCredential, saveCredential, generateSshKey };
```

### 7-3. `src/adapters/windows-adapter.js`

> ⚠️ **버그 수정 (v1.1 완전판)**: 원문 `getStoredCredentials()`는 `Get-StoredCredential`에서 **`Password`(=평문 PAT)를 꺼내 `account` 필드에 그대로 담아 반환**하는 오류가 있었습니다. 스캔 단계는 "어느 계정이 저장돼 있는가"만 확인하면 되므로, 굳이 비밀번호를 복호화할 필요가 없습니다. 아래는 `UserName` 프로퍼티만 조회하도록 수정한 버전입니다 — 로직도 맞고, 스캔 중 토큰을 불필요하게 메모리에 노출하지 않아 더 안전합니다.

```js
const { execSync } = require('child_process');
const keytar = require('keytar');
const path = require('path');
const os = require('os');

// Windows Credential Manager에서 GitHub 계정명 조회
// (수정) Password가 아닌 UserName만 읽는다 — 계정 식별에 토큰 복호화가 필요 없다.
async function getStoredCredentials() {
  try {
    const raw = execSync(
      `powershell -Command "(Get-StoredCredential -Target 'git:https://github.com').UserName"`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    return raw ? [{ account: raw, server: "github.com", isWrong: false }] : [];
  } catch { return []; }
}

// Windows Credential Manager에서 삭제
async function deleteCredential(account) {
  try {
    execSync(`cmdkey /delete:git:https://github.com`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// keytar로 저장 (GCM과 호환)
async function saveCredential(account, token) {
  await keytar.setPassword("git:https://github.com", account, token);
  return { ok: true };
}

// Ed25519 SSH 키 생성 (Windows)
async function generateSshKey(account) {
  const keyPath = path.join(os.homedir(), ".ssh", `id_ed25519_${account}`);
  execSync(`ssh-keygen -t ed25519 -C "${account}" -f "${keyPath}" -N ""`, { stdio: 'pipe' });
  const pubKey = require("fs").readFileSync(`${keyPath}.pub`, "utf8").trim();
  return { keyPath, pubKey };
}

module.exports = { getStoredCredentials, deleteCredential, saveCredential, generateSshKey };
```

---

## 8. 자동 복구 엔진

### 8-1. `src/engine/recovery.js` — 복구 오케스트레이터 (v0.1~v0.6 기준)

> ⚠️ **ID 수정 (v1.1 완전판)**: 원문은 스텝 id로 `fix_user_config`를 사용했으나, §5-2 규칙 엔진과 §15 스텝 레지스트리는 `fix_config`를 사용해 서로 어긋났습니다. 아래는 `fix_config`로 통일한 버전입니다. 이 섹션은 v0.1~v0.6 단계의 "단일 파일" 구현이며, 파일이 커지면 §15의 `recovery/` 디렉터리 분리 구조로 전환하는 것을 전제로 한다.

```js
const adapter = require('../adapters');
const { git } = require('./git-helper');

// progress 콜백: (step, status, message) => void
async function runRecovery(plan, progressCb) {
  const results = [];

  for (const stepId of plan) {
    progressCb({ stepId, status: "running", message: `${stepId} 처리 중...` });

    try {
      const result = await executeStep(stepId, plan._context);
      results.push({ stepId, ok: true, ...result });
      progressCb({ stepId, status: "done", message: result.message });

    } catch (e) {
      results.push({ stepId, ok: false, error: e.message });
      progressCb({ stepId, status: "error", message: e.message });
      break; // 복구 실패 시 중단
    }
  }

  // 마지막: git push 실행
  if (results.every(r => r.ok)) {
    return await executePush(plan._context, progressCb);
  }
  return { ok: false, results };
}

async function executeStep(stepId, ctx) {
  switch (stepId) {

    case "wrong_cred":
      // 오계정 인증정보 삭제
      for (const cred of ctx.wrongCreds) {
        await adapter.deleteCredential(cred.account);
      }
      return { message: "잘못된 인증정보를 삭제했습니다." };

    case "fix_config":
      // user.name / user.email 교체
      git(`config --local user.name "${ctx.targetAccount}"`, ctx.projectPath);
      git(`config --local user.email "${ctx.targetEmail}"`, ctx.projectPath);
      return { message: "Git 사용자 정보를 업데이트했습니다." };

    case "fix_origin":
      // origin 주소 수정
      git(`remote set-url origin ${ctx.correctOrigin}`, ctx.projectPath);
      return { message: "원격 저장소 주소를 수정했습니다." };

    default:
      throw new Error(`알 수 없는 복구 단계: ${stepId}`);
  }
}

async function executePush(ctx, progressCb) {
  progressCb({ stepId: "push", status: "running", message: "git push 실행 중..." });
  try {
    const result = git("push -u origin main", ctx.projectPath);
    progressCb({ stepId: "push", status: "done", message: "Push 성공! ✅" });
    return { ok: true, pushResult: result };
  } catch (e) {
    progressCb({ stepId: "push", status: "error", message: e.message });
    return { ok: false, error: e.message };
  }
}

module.exports = { runRecovery };
```

---

## 9. 보안 & 데이터 저장

### 9-1. electron-store — 앱 설정 저장

```js
const Store = require('electron-store');

const store = new Store({
  schema: {
    recentProjects: { type: "array", default: [] },
    recoveryHistory: { type: "array", default: [] },
    settings: {
      type: "object",
      properties: {
        language: { type: "string", default: "ko" },
        aiEnabled: { type: "boolean", default: true },
      },
    },
  },
});

module.exports = store;
```

> ✅ 판단 기준: PAT·토큰은 절대 electron-store에 저장 금지. 반드시 keytar(OS 네이티브 보안 저장소)만 사용.

### 9-2. 보안 체크리스트

| 항목 | 규칙 | 위반 시 결과 |
|---|---|---|
| PAT 저장 | keytar만 사용, 평문 금지 | 토큰 유출 → 계정 탈취 |
| API 키 | .env 파일, git 커밋 절대 금지 | Anthropic 과금 피해 |
| IPC 통신 | contextIsolation: true 유지 | XSS → Node 권한 탈취 |
| nodeIntegration | false 유지 | 렌더러에서 fs/exec 직접 접근 |
| 외부 URL | shell.openExternal만 사용 | 피싱 페이지 열림 가능 |
| **인증정보 조회 (v1.1 추가)** | **계정 식별에는 UserName만 사용, Password는 복구 실행 시점 외 조회 금지** | **스캔 로그에 평문 PAT 노출** |

---

## 10. 빌드 & 배포 (electron-builder)

### 10-1. `electron-builder.yml`

```yaml
appId: com.bluebird.github-doctor
productName: GitHub Doctor
copyright: "Copyright © 2026 Bluebird"

directories:
  output: release

files:
  - dist/**
  - src/main/**
  - src/engine/**
  - src/adapters/**
  - src/shared/**
  - package.json

mac:
  target: dmg
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist

win:
  target: nsis
  publisherName: "Bluebird"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true

publish:
  provider: github
```

### 10-2. 빌드 명령

```bash
# macOS용 빌드
npm run build:mac
# 결과: release/GitHub Doctor-0.1.0.dmg

# Windows용 빌드
npm run build:win
# 결과: release/GitHub Doctor Setup 0.1.0.exe

# 양 플랫폼 동시 (CI 환경)
npm run build
```

> ⚠️ 주의: macOS .dmg 배포 시 Apple Developer 계정으로 코드 서명(Code Signing) 및 공증(Notarization) 필요. 미서명 앱은 Gatekeeper 차단.

---

## 11. 테스트 전략

### 11-1. 테스트 레이어

| 레이어 | 도구 | 대상 | 목표 커버리지 |
|---|---|---|---|
| 단위 테스트 | Vitest | 진단 엔진, 어댑터, 규칙 엔진 | 80% 이상 |
| 통합 테스트 | Vitest + 실제 Git | 스캔 → 진단 → 복구 플로우 | 핵심 경로 100% |
| E2E 테스트 | Spectron / Playwright | 실제 Electron 앱 UI | 주요 화면 흐름 |

### 11-2. 진단 엔진 단위 테스트 예시

```js
import { describe, it, expect } from 'vitest';
import { ruleDiagnose } from '../../src/engine/rule-diagnosis';

describe("규칙 기반 진단 엔진", () => {

  it("잘못된 인증정보를 Critical으로 진단한다", () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [{ account: "gppc5096", isWrong: true }],
        sshKeys: [],
        origin: { value: "https://github.com/test/repo.git" },
        githubConn: { ok: true },
      }
    };
    const result = ruleDiagnose(scanResult);
    const crit = result.issues.find(i => i.id === "wrong_cred");
    expect(crit).toBeDefined();
    expect(crit.severity).toBe("critical");
    expect(crit.autoFixable).toBe(true);
  });

  it("문제 없으면 빈 issues 반환", () => {
    const scanResult = {
      items: {
        gitInstalled: { ok: true },
        storedCreds: [],
        sshKeys: [{ file: "id_ed25519.pub", isDSA: false }],
        origin: { value: "https://github.com/test/repo.git" },
        githubConn: { ok: true },
        userName: { active: "tester" },
        userEmail: { active: "tester@example.com" },
      }
    };
    const result = ruleDiagnose(scanResult);
    expect(result.issues).toHaveLength(0);
  });
});
```

---

## 12. 단계별 개발 로드맵

| 버전 | 기간 | 목표 | 완료 기준 |
|---|---|---|---|
| v0.1 MVP | 4주 | CLI 진단 엔진 완성 | scanner.js 실행 시 8개 항목 JSON 출력 |
| v0.2 | 2주 | 규칙 기반 진단 엔진 | ruleDiagnose() 단위 테스트 전체 통과 |
| v0.3 | 2주 | OS 어댑터 완성 | macOS Keychain 조회·삭제 동작 확인 |
| v0.4 | 2주 | Claude AI 진단 연동 | AI 진단 JSON 파싱 및 폴백 전환 확인 |
| v0.5 Beta | 4주 | Electron GUI 완성 | SCR-01 대시보드 실제 스캔 데이터 표시 |
| v0.6 | 2주 | 자동 복구 엔진 | wrong_cred 자동 삭제 후 push 성공 |
| v0.7 | 2주 | Windows 완전 지원 | Credential Manager 어댑터 동작 확인 |
| v0.8 | 2주 | SSH 키 관리 화면 | Ed25519 키 생성 + 공개키 클립보드 복사 |
| v1.0 정식 | 4주 | QA + 빌드 + 배포 | .dmg/.exe 정상 설치 및 전체 흐름 완료 |
| v1.5 | 4주 | 배포 연동 진단 | Firebase/Vercel 계정 불일치 감지 |

### 12-1. v0.1 MVP 첫 실행 목표 (4주 세부)

| 주차 | 작업 항목 |
|---|---|
| 1주차 | 개발 환경 구축 + 스캐폴딩 + package.json 완성 |
| 2주차 | git-helper.js + scanner.js 8개 항목 구현 |
| 3주차 | macOS 어댑터 + Keychain 조회 + 단위 테스트 |
| 4주차 | 터미널 실행 확인 + JSON 출력 검증 + README 작성 |

---

## 13. 갈림길 판단 기준표

개발 중 선택지가 생길 때 아래 기준으로 결정한다. 판단이 모호하면 "더 안전한 쪽"을 선택한다.

| 갈림길 | 선택 A | 선택 B | 판단 기준 → 정답 |
|---|---|---|---|
| Vue Router 히스토리 모드 | createWebHistory() | createWebHashHistory() | Electron → B (Hash). Web배포면 A. |
| credential 저장 위치 | electron-store (평문) | keytar (OS 보안 저장소) | 항상 → B. 보안 원칙 불변. |
| AI 진단 실패 처리 | 에러 화면 표시 | 규칙 기반 폴백 실행 | → B. 오프라인·API 지연 대비 필수. |
| SSH 키 유형 선택 | RSA 4096 | Ed25519 | → B. GitHub 권장, 더 안전·빠름. |
| 복구 도중 실패 처리 | 계속 진행 | 즉시 중단 후 오류 표시 | → B. 부분 복구보다 일관성이 중요. |
| 스캔 항목 실패 시 | 전체 스캔 중단 | 해당 항목만 null 처리 후 계속 | → B. 하나 실패해도 나머지 정보 필요. |
| Windows 다중 계정 HTTPS | credential namespace | SSH 키 분리 방식 | → B 권장. HTTPS namespace는 GCM 버전 의존. |
| IPC 통신 방식 | ipcRenderer.sendSync (동기) | ipcRenderer.invoke (비동기) | → B. 동기 IPC는 UI 블록킹 발생. |

---

## 14. 트러블슈팅 레퍼런스

| 오류 메시지 / 증상 | 원인 | 해결 방법 |
|---|---|---|
| keytar 빌드 실패 (node-gyp error) | Xcode CLI 또는 Windows Build Tools 미설치 | `xcode-select --install` (mac) / `npm i -g windows-build-tools` (win) |
| Electron 앱 흰 화면 | Vite dev server 미실행 또는 loadURL 경로 오류 | `npm run dev` 먼저 실행 후 Electron 시작. 또는 loadFile 경로 확인 |
| Vue Router 404 (Electron) | createWebHistory() 사용 | createWebHashHistory()로 교체 |
| IPC 응답 없음 | preload.js에 채널 미등록 또는 ipcMain.handle 누락 | ipc-channels.js 채널명 일치 여부 확인 |
| security: No such keychain item (macOS) | Keychain에 github.com 항목 없음 (정상) | 예외 처리로 빈 배열 반환, 오류 아님 |
| cmdkey /delete 실패 (Windows) | 이미 삭제된 항목 또는 항목명 불일치 | `cmdkey /list`로 실제 항목명 확인 후 수정 |
| git push: 403 Forbidden | PAT 권한 부족 또는 repo scope 미포함 | GitHub → Settings → Tokens → repo scope 재발급 |
| git push: 128 exit code | 원격 저장소 권한 없음 또는 origin 주소 오류 | `git remote -v` 확인 후 set-url 수정 |
| Claude API: 401 Unauthorized | ANTHROPIC_API_KEY 오류 또는 미설정 | .env 파일 확인. `process.env.ANTHROPIC_API_KEY` 로깅으로 검증 |
| Claude API: model not found (v1.1 추가) | 존재하지 않거나 폐기된 모델 ID 사용 | Anthropic 공식 문서에서 현재 유효한 모델 ID 확인 후 `ai-diagnosis.js`의 `model` 값 교체 |
| electron-builder: code sign error | macOS 코드 서명 인증서 없음 | 개발 중: `--skip-notarization`. 배포: Apple Developer 등록 필요 |
| `[UNRESOLVED_ENTRY] Cannot resolve entry module src/renderer/src/main/index.js` (v0.5 구현 중 발견) | `vite-plugin-electron`의 `entry`가 vite `root`(`src/renderer`) 기준으로 잘못 해석됨 | `entry`를 프로젝트 루트 기준 절대경로로 지정 (`vite.config.mjs` 참고) |
| `[UNLOADABLE_DEPENDENCY] Could not load .../keytar.node` (v0.5 구현 중 발견) | 메인 프로세스 빌드가 keytar 네이티브(.node) 모듈까지 번들링을 시도함 | `rollupOptions.external`로 상대경로가 아닌 import(=node_modules)는 전부 번들 제외 처리 |
| `vitest run` 시 "No test files found" (v0.5 구현 중 발견) | `vite.config.mjs`의 `root: 'src/renderer'`를 Vitest가 그대로 물려받아 `tests/unit`을 못 찾음 | `vitest.config.mjs`를 별도 파일로 분리 (Vitest는 vite.config보다 vitest.config를 우선함) |

---

## 15. 코드 분리 원칙 & 유지보수 가이드

> **핵심 원칙**: 하나의 파일·함수·컴포넌트는 딱 하나의 일만 한다. 200줄이 넘으면 분리를 고려하고, 100줄 이하를 목표로 한다.

### 15-1. 파일 크기 기준 & 분리 신호

| 기준 | 상태 | 조치 |
|---|---|---|
| 함수 1개 → 20줄 이하 | ✅ 정상 | 유지 |
| 파일 전체 → 100줄 이하 | ✅ 정상 | 유지 |
| 파일 전체 → 100~200줄 | ⚠️ 경계 | 함수 단위 분리 검토 |
| 파일 전체 → 200줄 초과 | 🔴 분리 필요 | 즉시 파일 분리 |
| 함수 인자 → 4개 초과 | ⚠️ 경계 | 객체(options)로 묶기 |
| if/else 중첩 → 3단 초과 | 🔴 분리 필요 | 함수 추출 또는 전략 패턴 |

### 15-2. 진단 엔진 분리 구조 (Before → After)

**❌ Before — 한 파일에 모든 스캔 로직 집중**

```js
// src/engine/scanner.js ← 350줄짜리 파일 (나쁜 예)
async function runScan(projectPath) {
  // Git 설치 확인 (30줄)
  // user.name/email 확인 (40줄)
  // credential helper 확인 (35줄)
  // Keychain 조회 (50줄)
  // SSH 키 검사 (60줄)
  // ssh-agent 확인 (30줄)
  // origin remote 확인 (40줄)
  // GitHub API 연결 (30줄)
  // ← 모든 로직이 한 함수에. 수정 시 전체를 읽어야 함
}
```

**✅ After — 항목별 파일 분리 (각 파일 30~50줄)**

```
src/engine/scanners/
├── index.js            ← 오케스트레이터 (30줄)
├── git-install.js       ← Git 설치 확인만 (20줄)
├── user-config.js        ← user.name/email만 (25줄)
├── cred-helper.js         ← credential helper만 (20줄)
├── stored-creds.js         ← OS 인증정보 조회만 (25줄)
├── ssh-keys.js               ← SSH 키 검사만 (35줄)
├── ssh-agent.js                ← ssh-agent 상태만 (20줄)
├── origin-remote.js              ← origin 주소 확인만 (20줄)
└── github-conn.js                  ← GitHub API 연결만 (15줄)
```

**✅ `src/engine/scanners/index.js` — 오케스트레이터**

```js
// 각 스캐너를 불러와서 순서대로 실행하는 역할만 담당
const checkGitInstall = require('./git-install');
const checkUserConfig = require('./user-config');
const checkCredHelper = require('./cred-helper');
const checkStoredCreds = require('./stored-creds');
const checkSshKeys = require('./ssh-keys');
const checkSshAgent = require('./ssh-agent');
const checkOrigin = require('./origin-remote');
const checkGithubConn = require('./github-conn');

async function runScan(projectPath) {
  const ctx = { projectPath, items: {} };

  // 순서 중요: Git 없으면 조기 반환
  await checkGitInstall(ctx);
  if (!ctx.items.gitInstalled.ok) return ctx;

  // 나머지는 병렬 실행 가능한 것끼리 묶음
  await Promise.all([
    checkUserConfig(ctx),
    checkCredHelper(ctx),
    checkSshKeys(ctx),
    checkSshAgent(ctx),
    checkOrigin(ctx),
  ]);

  // 인증정보 조회는 OS 어댑터 의존 → 순차 실행
  await checkStoredCreds(ctx);

  // 네트워크 확인은 마지막 (가장 느림)
  await checkGithubConn(ctx);

  ctx.timestamp = new Date().toISOString();
  return ctx;
}

module.exports = { runScan };
```

**✅ `src/engine/scanners/git-install.js` — 단일 책임**

```js
const { run } = require('../git-helper');

// 이 파일이 하는 일: Git 설치 여부만 확인
async function checkGitInstall(ctx) {
  const ver = run("git --version");
  ctx.items.gitInstalled = {
    ok: !!ver,
    value: ver || "미설치",
    severity: ver ? "ok" : "critical",
  };
}

module.exports = checkGitInstall;
```

**✅ `src/engine/scanners/ssh-keys.js` — 단일 책임**

```js
const os = require('os');
const path = require('path');
const fs = require('fs');

const KEY_TYPE_MAP = {
  ed25519: "Ed25519",
  rsa: "RSA",
  ecdsa: "ECDSA",
  dsa: "DSA (폐기됨 ⚠️)",
};

function detectKeyType(filename) {
  for (const [keyword, label] of Object.entries(KEY_TYPE_MAP)) {
    if (filename.includes(keyword)) return { label, isDSA: keyword === "dsa" };
  }
  return { label: "Unknown", isDSA: false };
}

// 이 파일이 하는 일: SSH 키 목록 확인만
async function checkSshKeys(ctx) {
  const sshDir = path.join(os.homedir(), ".ssh");
  const exists = fs.existsSync(sshDir);
  const pubFiles = exists
    ? fs.readdirSync(sshDir).filter(f => f.endsWith(".pub"))
    : [];

  ctx.items.sshKeys = pubFiles.map(file => {
    const { label, isDSA } = detectKeyType(file);
    return { file, type: label, isDSA, severity: isDSA ? "critical" : "ok" };
  });
}

module.exports = checkSshKeys;
```

### 15-3. 복구 엔진 분리 구조

**❌ Before — 하나의 switch에 모든 복구 로직**

```js
// src/engine/recovery.js ← 250줄 (나쁜 예)
async function executeStep(stepId, ctx) {
  switch (stepId) {
    case "wrong_cred": // 50줄...
    case "fix_config": // 40줄...
    case "fix_origin": // 35줄...
    case "gen_ssh": // 60줄...
    // ... 추가될수록 switch가 무한히 커짐
  }
}
```

**✅ After — 복구 단계별 파일 분리**

```
src/engine/recovery/
├── index.js                    ← 오케스트레이터 (40줄)
├── steps/
│   ├── fix-wrong-cred.js         ← 인증정보 삭제만 (30줄)
│   ├── fix-user-config.js          ← Git 사용자 설정만 (25줄)
│   ├── fix-origin.js                 ← origin 주소 수정만 (20줄)
│   ├── gen-ssh-key.js                  ← SSH 키 생성만 (30줄)
│   └── run-push.js                       ← git push 실행만 (25줄)
└── step-registry.js                        ← 단계 ID → 파일 매핑 (20줄)
```

> ⚠️ **ID 일치 확인 (v1.1 완전판)**: 아래 `step-registry.js`의 키(`wrong_cred`, `fix_config`, `fix_origin`, `gen_ssh`, `push`)는 **§5-2 규칙 엔진의 이슈 id, §8 복구 오케스트레이터의 스텝 id와 정확히 동일해야 한다.** 이름이 하나라도 어긋나면 `getStep()`이 "알 수 없는 복구 단계" 에러를 던진다. 새 복구 항목을 추가할 때는 (1) 규칙/AI 진단이 내는 이슈 id, (2) `step-registry.js`의 키, (3) `steps/*.js` 파일명 세 곳을 항상 함께 갱신한다.

**✅ `src/engine/recovery/step-registry.js`**

```js
// 복구 단계 ID와 실행 함수를 매핑 — switch 완전 제거
const registry = {
  wrong_cred: require('./steps/fix-wrong-cred'),
  fix_config: require('./steps/fix-user-config'),
  fix_origin: require('./steps/fix-origin'),
  gen_ssh: require('./steps/gen-ssh-key'),
  push: require('./steps/run-push'),
};

function getStep(stepId) {
  const step = registry[stepId];
  if (!step) throw new Error(`알 수 없는 복구 단계: ${stepId}`);
  return step;
}

module.exports = { getStep };
```

**✅ `src/engine/recovery/index.js` — 오케스트레이터**

```js
const { getStep } = require('./step-registry');

async function runRecovery(plan, progressCb) {
  for (const stepId of plan.steps) {
    progressCb({ stepId, status: "running" });
    try {
      const stepFn = getStep(stepId);
      const result = await stepFn(plan.context);
      progressCb({ stepId, status: "done", message: result.message });
    } catch (e) {
      progressCb({ stepId, status: "error", message: e.message });
      return { ok: false, failedStep: stepId, error: e.message };
    }
  }
  return { ok: true };
}

module.exports = { runRecovery };
```

**✅ `src/engine/recovery/steps/fix-wrong-cred.js`**

```js
const adapter = require('../../../adapters');

// 이 파일이 하는 일: 잘못된 인증정보 삭제만
async function fixWrongCred(ctx) {
  const { wrongCreds } = ctx;
  for (const cred of wrongCreds) {
    await adapter.deleteCredential(cred.account);
  }
  return {
    message: `인증정보 삭제 완료: ${wrongCreds.map(c => c.account).join(", ")}`,
  };
}

module.exports = fixWrongCred;
```

### 15-4. Vue 컴포넌트 분리 원칙

**❌ Before — `Dashboard.vue` 한 파일에 모든 기능**

```
<!-- Dashboard.vue ← 400줄 (나쁜 예) -->
<!-- 프로젝트 경로 바 UI + 로직 -->
<!-- 스캔 실행 로직 -->
<!-- 스캔 결과 렌더링 -->
<!-- AI 진단 카드 렌더링 -->
<!-- 복구 단계 타임라인 -->
<!-- 액션 바 버튼 로직 -->
<!-- 모달 / 오류 처리 -->
<!-- ← 한 파일이 화면·로직·상태 모두 담당. 수정 불가 -->
```

**✅ After — 컴포넌트 분리 (각 파일 50~80줄)**

```
src/renderer/
├── views/
│   └── Dashboard.vue          ← 레이아웃 조립만 (60줄)
├── components/
│   ├── PathBar.vue              ← 경로 표시+변경만 (40줄)
│   ├── ScanResultCard.vue         ← 스캔 결과 표시만 (70줄)
│   ├── ScanResultRow.vue            ← 항목 한 줄 표시만 (30줄)
│   ├── DiagnosisCard.vue              ← AI 진단 결과만 (60줄)
│   ├── IssueItem.vue                    ← 이슈 한 건 표시만 (35줄)
│   ├── RecoverySteps.vue                  ← 복구 단계 타임라인만 (55줄)
│   ├── RecoveryStepRow.vue                  ← 단계 한 줄만 (30줄)
│   └── ActionBar.vue                          ← 하단 버튼 바만 (45줄)
└── composables/
    ├── useScan.js                                ← 스캔 실행 로직만 (40줄)
    ├── useDiagnosis.js                              ← 진단 실행 로직만 (35줄)
    └── useRecovery.js                                  ← 복구 실행+진행 로직만 (50줄)
```

**✅ `Dashboard.vue` — 조립만 하는 깨끗한 뷰**

```vue
<!-- 이 파일이 하는 일: 컴포넌트 배치(레이아웃)만 -->
<template>
  <div class="dashboard">
    <PathBar />
    <div v-if="scan.isScanning" class="loading">스캔 중...</div>
    <template v-else-if="scan.result">
      <div class="grid-2col">
        <ScanResultCard :items="scan.result.items" />
        <DiagnosisCard :diagnosis="diagnosis.result" />
      </div>
      <RecoverySteps :steps="recovery.steps" />
    </template>
    <ActionBar
      :status="recovery.status"
      @start="recovery.start"
      @abort="recovery.abort"
    />
  </div>
</template>

<script setup>
import { useScan } from '../composables/useScan';
import { useDiagnosis } from '../composables/useDiagnosis';
import { useRecovery } from '../composables/useRecovery';
import PathBar from '../components/PathBar.vue';
import ScanResultCard from '../components/ScanResultCard.vue';
import DiagnosisCard from '../components/DiagnosisCard.vue';
import RecoverySteps from '../components/RecoverySteps.vue';
import ActionBar from '../components/ActionBar.vue';

const scan = useScan();
const diagnosis = useDiagnosis(scan);
const recovery = useRecovery(diagnosis);
</script>
```

**✅ `composables/useScan.js` — 스캔 로직만**

```js
import { ref } from 'vue';

// 이 파일이 하는 일: 스캔 실행 + 상태 관리만
export function useScan() {
  const isScanning = ref(false);
  const result = ref(null);
  const error = ref(null);
  const projectPath = ref(null);

  async function run(path) {
    isScanning.value = true;
    error.value = null;
    try {
      projectPath.value = path;
      result.value = await window.electronAPI.scan(path);
    } catch (e) {
      error.value = e.message;
    } finally {
      isScanning.value = false;
    }
  }

  return { isScanning, result, error, projectPath, run };
}
```

**✅ `composables/useRecovery.js` — 복구 로직만**

```js
import { ref } from 'vue';

// 이 파일이 하는 일: 복구 실행 + 진행 상태만
export function useRecovery(diagnosis) {
  const steps = ref([]);
  const status = ref("idle"); // idle|running|done|error

  // 진행 상황 수신 등록 (한 번만)
  window.electronAPI.onProgress(progress => {
    const step = steps.value.find(s => s.id === progress.stepId);
    if (step) step.status = progress.status;
  });

  async function start() {
    if (!diagnosis.result.value) return;
    status.value = "running";

    // 단계 목록 초기화
    steps.value = diagnosis.result.value.recoveryPlan.map(id => ({
      id, status: "pending", message: "",
    }));

    const result = await window.electronAPI.recover(diagnosis.result.value);
    status.value = result.ok ? "done" : "error";
  }

  function abort() { status.value = "idle"; }

  return { steps, status, start, abort };
}
```

### 15-5. AI 진단 모듈 분리

```
src/engine/diagnosis/
├── index.js                  ← AI 우선, 실패 시 폴백 (25줄)
├── ai-client.js                 ← Claude API 호출만 (35줄)
├── prompt-builder.js               ← 프롬프트 생성만 (30줄)
├── response-parser.js                 ← JSON 파싱만 (25줄)
└── rule-engine/
    ├── index.js                          ← 규칙 순서 실행만 (20줄)
    └── rules/
        ├── no-git.js (10줄)
        ├── wrong-cred.js (15줄)
        ├── no-ssh.js (12줄)
        ├── dsa-key.js (12줄)
        ├── no-origin.js (10줄)
        ├── no-network.js (10줄)
        └── fix-config.js (12줄)   ← v1.1 완전판 추가 (§5-2 규칙 7)
```

**✅ `src/engine/diagnosis/prompt-builder.js`**

```js
// 이 파일이 하는 일: 프롬프트 텍스트 생성만
function buildPrompt(scanResult) {
  const scanJson = JSON.stringify(scanResult.items, null, 2);
  return [
    "당신은 GitHub 인증 문제 전문가입니다.",
    "아래 스캔 결과를 분석하여 문제를 진단하고",
    "복구 계획을 JSON으로만 반환하세요.",
    "",
    "스캔 결과:",
    scanJson,
    "",
    "반환 형식 (JSON만, 설명 없이):",
    JSON.stringify({
      summary: "한 문장 요약",
      issues: [{ id: "", severity: "", title: "", description: "", autoFixable: true, fixType: "" }],
      recoveryPlan: ["step_id"],
    }, null, 2),
  ].join("\n");
}

module.exports = { buildPrompt };
```

**✅ `src/engine/diagnosis/rule-engine/rules/wrong-cred.js`**

```js
// 이 파일이 하는 일: 오계정 인증정보 규칙 하나만
function checkWrongCred(items) {
  const wrong = (items.storedCreds || []).filter(c => c.isWrong);
  if (wrong.length === 0) return null;
  return {
    id: "wrong_cred",
    severity: "critical",
    title: `오계정 토큰 잔존 (${wrong.map(c => c.account).join(", ")})`,
    description: "이전 계정 인증정보가 남아 push를 막고 있습니다.",
    autoFixable: true,
    fixType: "auto",
  };
}

module.exports = checkWrongCred;
```

**✅ `src/engine/diagnosis/rule-engine/rules/fix-config.js` (v1.1 완전판 추가)**

```js
// 이 파일이 하는 일: user.name/user.email 미설정 규칙 하나만
// §5-2 규칙 7과 동일한 로직을 rule-engine/rules/ 구조로 옮긴 버전
function checkFixConfig(items) {
  const missing = !items.userName?.active || !items.userEmail?.active;
  if (!missing) return null;
  return {
    id: "fix_config",
    severity: "warning",
    title: "Git 사용자 정보(user.name / user.email)가 설정되지 않음",
    description: "커밋 작성자 정보를 현재 계정 기준으로 자동 설정합니다.",
    autoFixable: true,
    fixType: "auto",
  };
}

module.exports = checkFixConfig;
```

### 15-6. OS 어댑터 분리 세분화

```
src/adapters/
├── index.js                 ← OS 감지 + 라우팅만 (20줄)
├── macos/
│   ├── index.js                ← macOS 어댑터 진입점 (15줄)
│   ├── keychain-read.js           ← Keychain 조회만 (25줄)
│   ├── keychain-delete.js            ← Keychain 삭제만 (20줄)
│   ├── keychain-save.js                 ← Keychain 저장만 (15줄)
│   └── ssh-keygen-mac.js                   ← SSH 키 생성만 (25줄)
└── windows/
    ├── index.js                ← Windows 어댑터 진입점 (15줄)
    ├── credman-read.js            ← Credential Manager 조회만 (25줄, §7-3 수정 버전 적용)
    ├── credman-delete.js             ← Credential Manager 삭제만 (20줄)
    ├── credman-save.js                  ← Credential Manager 저장만 (15줄)
    └── ssh-keygen-win.js                   ← SSH 키 생성만 (25줄)
```

### 15-7. 함수 작성 규칙 요약

| 규칙 | 나쁜 예 ❌ | 좋은 예 ✅ |
|---|---|---|
| 함수 이름은 동사+명사 | `data()` | `fetchScanResult()` |
| 인자는 3개 이하 | `fn(a,b,c,d,e)` | `fn(path, options)` |
| 함수는 하나만 반환 | `return {data, error, status}` | `throw error` / `return data` |
| 중첩 if 3단 이상 금지 | `if(a){if(b){if(c){}}}` | 함수로 추출 |
| 매직 넘버 상수화 | `if(lines > 200)` | `const MAX_LINES = 200` |
| 주석은 왜(Why)만 | `// user.name 가져옴` | `// local이 global보다 우선` |
| 비동기는 async/await만 | `.then().catch().finally()` | `try{ await }catch{}` |

### 15-8. 리팩토링 신호 체크리스트

> 아래 항목 중 하나라도 해당하면 즉시 분리한다.

| 번호 | 리팩토링 신호 | 대응 |
|---|---|---|
| ① | 파일이 200줄을 넘었다 | 기능별로 파일 분리 |
| ② | 같은 코드가 두 군데 이상 복사됐다 | 공통 함수로 추출 |
| ③ | 함수 이름에 "And"가 들어간다 (fetchAndParse) | 두 함수로 분리 |
| ④ | 주석 없이는 이해할 수 없는 if문이 있다 | 함수로 이름 부여 |
| ⑤ | switch/case가 10개를 넘었다 | 레지스트리 패턴으로 교체 |
| ⑥ | 컴포넌트가 props를 5개 이상 받는다 | 하위 컴포넌트 분리 |
| ⑦ | 한 composable이 3개 이상의 관심사를 다룬다 | composable 분리 |
| ⑧ | 테스트 작성이 어렵다고 느껴진다 | 의존성 주입으로 분리 |

### 15-9. 최종 파일 구조 요약 (분리 완료 기준)

```
github-doctor/src/
│
├── main/           ← Electron 진입 (3파일 × ~50줄)
│
├── engine/
│   ├── scanners/      ← 스캔 항목별 (9파일 × ~25줄)
│   ├── diagnosis/        ← AI진단 + 규칙엔진 분리 (11파일 × ~25줄, fix-config.js 포함)
│   ├── recovery/            ← 복구 단계별 (8파일 × ~30줄)
│   └── git-helper.js           ← CLI 유틸 (30줄)
│
├── adapters/
│   ├── macos/                     ← macOS 기능별 (5파일 × ~22줄)
│   └── windows/                       ← Windows 기능별 (5파일 × ~22줄)
│
├── renderer/
│   ├── views/                             ← 레이아웃 조립만 (10파일 × ~60줄)
│   ├── components/                            ← UI 단위 컴포넌트 (8파일 × ~45줄)
│   └── composables/                                ← 비즈니스 로직 (3파일 × ~45줄)
│
└── shared/                                              ← 상수·채널명 (2파일 × ~20줄)

총 파일 수: ~66개 (v1.1 완전판: fix-config.js 추가로 +1)
평균 파일 줄 수: ~35줄
최대 파일 줄 수: 100줄 이하 (목표)
```

> **최종 원칙**: 파일을 열었을 때 "이 파일이 뭐하는 건지" 파일명만 봐도 알 수 있어야 한다. 그리고 어떤 기능을 수정할 때 딱 한 파일만 열면 되어야 한다. **아이디(스텝 id·이슈 id) 하나가 여러 계층(규칙 엔진 → 레지스트리 → 스텝 파일)에 걸쳐 있을 때는, 이름을 바꾸는 순간 세 곳을 동시에 검색해서 고쳐야 한다는 점을 항상 기억한다.**

---

## 16. PAT(Personal Access Token) 자격증명 입력 — 설계안 (v1.1, 2026-08-07, 미구현)

> 사용자가 실제 push 권한 거부(§ SSH 계정 불일치, TODO.md 참고)를 겪은 뒤 "SSH 키 로직만 있고
> PAT 입력 경로가 없다"고 지적해 작성한 설계 제안. **아직 코드는 없다 — 구현 전 이 설계에 대한
> 확인/결정이 먼저 필요하다** (§16-9). HTTPS 인증은 2021년부터 비밀번호가 아니라 PAT만 허용되므로,
> `credential.helper` 설정 확인만으로는 부족하고 앱이 토큰 입력·저장을 직접 도와야 실사용자
> 커버리지가 완성된다.

### 16-1. 기존 코드 재사용 가능 여부 점검 (설계 중 발견한 중요 이슈)

`src/adapters/{macos,windows}-adapter.js`에는 이미 `saveCredential(account, token)`이 구현·
테스트(DI, fake keytar)돼 있고 `adapters/index.js`에도 라우팅돼 있다 — 그런데 **UI/IPC 어디에도
연결된 적이 없는 죽은 코드**이며, 아래 이유로 **현재 구현 그대로는 이 기능에 재사용하면 안 된다**:

- 이 함수는 `keytar.setPassword(service, account, token)`을 쓰는데, keytar는 macOS Keychain에
  **Generic Password**(`kSecClassGenericPassword`) 항목으로 저장한다.
- 반면 기존 `getStoredCredentials()`는 `security find-internet-password`로 조회하고, git의
  `credential.helper=osxkeychain`도 **Internet Password**(`kSecClassInternetPassword`) 항목만
  읽는다.
- 즉 지금 코드 그대로 저장하면 **앱 스캔에도 안 잡히고, git push 시 credential.helper도 못 찾는
  "보이지 않는 저장"**이 된다 — 저장은 성공했다고 뜨는데 실제 효과가 없는, 지금까지 고쳐온
  "silent false success" 버그와 성격이 같은 문제가 될 뻔했다.
- Windows도 마찬가지로 keytar가 만드는 저장소 키가 기존 `getStoredCredentials`/`cmdkey`가 읽는
  `git:https://<account>@github.com` 포맷과 다를 가능성이 높다.

**권장 방향**: keytar로 직접 저장하지 말고 **`git credential approve`**(git이 기본 제공하는
명령 — stdin으로 `protocol/host/username/password`를 주면 **현재 설정된 credential.helper가
실제로 쓰는 저장 방식 그대로** 기록해준다)를 쓴다.

- git이 push 시 찾는 저장소와 **100% 동일한 곳**에 저장되는 게 보장된다(형식 불일치 원천 차단).
- OS별 어댑터 분기가 필요 없어진다 — 단일 구현으로 macOS/Windows 공통 처리 가능(코드가 오히려
  더 단순해짐).
- 전제조건: `credential.helper`가 설정돼 있어야 한다(안 그러면 approve가 영속 저장을 못 함) —
  기존 `credHelper` 스캔 항목으로 이미 확인 가능하므로, 미설정 상태면 저장 전에 먼저 안내한다
  (새 규칙 불필요, 기존 흐름에서 순서만 강제).

> 이 발견 자체가 "코딩 전에 항상 기존 코드부터 확인해야 하는 이유"를 보여주는 사례다 —
> `saveCredential`이 이미 있다고 그대로 이어붙였다면, 단위 테스트는 통과해도 실제로는 안 먹히는
> 기능이 나올 뻔했다.

### 16-2. 보안 설계 원칙 (최우선)

| 원칙 | 구체적 적용 |
|---|---|
| 마스킹 입력 | `<input type="password">`만 사용, 평문 노출 금지 |
| 렌더러 메모리 체류 최소화 | 토큰 값은 로컬 `ref()`에만 담고, IPC 호출 성공/실패와 무관하게 `finally`에서 즉시 `''`로 폐기 — Pinia 영속 state에는 절대 두지 않음 |
| 재노출 금지 | 저장 후 토큰의 어떤 조각(마지막 4자리 포함)도 다시 보여주지 않는다 — "저장됨" 확인만 표시. Keychain/Credential Manager가 유일한 진실 공급원이고 앱은 이를 중복 보관하지 않는다 |
| 로그/에러에 노출 금지 | `git credential approve`는 값을 **인자가 아니라 stdin**으로 받으므로 프로세스 목록(`ps`)·에러 스택 어디에도 토큰이 남지 않는다(§16-1에서 keytar 대신 이 방식을 고른 이유이기도 함) |
| 검증 결과도 저장하지 않음 | GitHub API 검증(§16-4) 후 응답 body/헤더는 그대로 버리고 scope 문자열만 파싱해서 쓴다 |
| 저장 전 검증 필수 | "저장" 클릭 시 즉시 저장하지 않고, 검증 API가 먼저 성공해야 저장을 진행한다(무효 토큰을 저장소에 쌓지 않음) |
| Classic/Fine-grained 모두 수용 | `ghp_`(classic) / `github_pat_`(fine-grained) 접두사 둘 다 허용, 형식 검증은 최소화(GitHub이 포맷을 바꿔도 깨지지 않게 관대하게) |

### 16-3. 화면 설계 (SCR-03 `인증정보 관리` — 사이드바에 이미 자리만 있고 비활성 상태)

```
┌─ 인증정보 관리 ──────────────────────────────┐
│ 🔑 저장된 인증정보                            │
│  • gppc5096 (github.com)              [삭제]  │  ← 기존 storedCreds 재사용, 토큰 값은 절대 표시 안 함
│                                                │
│ ➕ 새 토큰 등록                                │
│  계정 라벨   [___________]                     │
│  PAT 값      [•••••••••••••••••••] (마스킹)    │
│              [검증 후 저장]                     │
│  상태: (검증 중... / ✅ repo 스코프 확인됨 /     │
│         ⚠️ repo 스코프 없음 / ❌ 유효하지 않음)  │
└────────────────────────────────────────────┘
```

- "저장된 인증정보" 목록은 기존 `scanStore.scanResult.items.storedCreds`를 그대로 재사용(이미
  계정명만 노출하는 안전한 형태로 구현돼 있음) — 새로 만들 필요 없음.
- "검증 후 저장" 버튼은 검증 API가 끝나기 전까지 비활성화(연타로 인한 중복 호출 방지).
- 저장 성공 시 기존 `input` 액션과 동일하게 자동 재스캔(기존 `emit('rescan')` 패턴 재사용).

### 16-4. 검증 로직 — `src/engine/pat-validator.js` (신규, ~30줄)

```js
// 이 파일이 하는 일: PAT 유효성 + repo 스코프 확인만 (저장은 하지 않는다).
async function validatePat(token, { fetchFn = fetch } = {}) {
  const res = await fetchFn('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return { ok: false, error: res.status === 401 ? '토큰이 유효하지 않습니다.' : `GitHub API 오류 (${res.status})` };
  }
  const scopes = (res.headers.get('x-oauth-scopes') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { ok: true, scopes, hasRepoScope: scopes.includes('repo') };
}

module.exports = { validatePat };
```

fine-grained 토큰은 `x-oauth-scopes` 헤더가 안 실릴 수 있다 — 이 경우 `hasRepoScope: null`로
"판단 불가"만 표시하고 무조건 거부하지 않는다(GitHub 문서상 알려진 한계를 그대로 인정).

### 16-5. 저장 로직 — `src/engine/pat-store.js` (신규, ~25줄, `git credential approve` 방식)

```js
// 이 파일이 하는 일: 검증된 토큰을 git credential approve로 넘기기만 한다.
// (macOS/Windows 어댑터 분기가 필요 없다 — 현재 설정된 credential.helper가 알아서 처리)
function storePatViaGitCredential(account, token, { runWithStdin } = {}) {
  const input = `protocol=https\nhost=github.com\nusername=${account}\npassword=${token}\n\n`;
  return runWithStdin('git credential approve', input); // stdin으로만 전달 — 인자/로그에 토큰 노출 없음
}

module.exports = { storePatViaGitCredential };
```

`runWithStdin`은 `git-helper.js`에 신규 추가할 자매 함수(§16-7)로, `execSync(cmd, { input })`
형태로 stdin 파이프만 다르게 처리한다 — 반환값에 토큰이 들어갈 일이 없으므로 detail(stderr)
버전조차 필요 없이 성공/실패(boolean)만 반환한다.

### 16-6. IPC 흐름

```
renderer: CredentialManager.vue
  → stores/credentials.js: saveToken(account, token)
    → window.electronAPI.saveCredential({ account, token })
      → IPC CH.CREDENTIAL_SAVE
        → main: validatePat() 먼저 → 실패 시 즉시 반환(저장 안 함)
                → 성공 시 storePatViaGitCredential()
        ← { ok, scopes, hasRepoScope, error }
    → 토큰 지역변수 즉시 '' 처리(성공/실패 무관, finally)
    → 성공 시 emit('rescan')
```

### 16-7. 파일 분리 계획 (§15 기준: 파일 100줄/함수 20줄 그대로 적용)

```
src/engine/
├── pat-validator.js      ← 검증만 (~30줄, 신규)
├── pat-store.js             ← git credential approve 호출만 (~25줄, 신규)
└── git-helper.js               ← runWithStdin() 함수 1개 추가(+10줄, 기존 60→70줄, 여유 있음)

src/renderer/
├── views/CredentialManager.vue   ← SCR-03 화면 조립만 (~80줄, 신규 — 기존 뷰들과 비슷한 규모)
└── stores/credentials.js            ← saveToken() 하나만 (~25줄, 신규)

src/main/ipc-handlers.js  ← 핸들러 1개 추가(+8줄, 기존 67→75줄, 여유 있음 — 100줄 넘으면 그때 분리)
src/adapters/*             ← 변경 없음(기존 saveCredential은 §16-1 사유로 이번 기능엔 안 씀 —
                                지금 지우진 않는다. 다른 용도로 재검토할 여지가 있어 미리 삭제하는
                                건 과도한 조치라고 판단. 정말 안 쓰일 게 확정되면 그때 제거)
```

전부 §15 기준(파일 100줄/함수 20줄) 안에 들어와서, 이 기능 때문에 별도 분리 라운드가 또 필요할
가능성은 낮다.

### 16-8. 테스트 전략 (기존 DI 원칙 그대로)

- `pat-validator.test.js`: `fetchFn`을 fake로 주입, 200 / 401 / 403 + scopes 헤더 유무 케이스.
  실제 네트워크·실제 토큰은 절대 쓰지 않는다(가짜 값은 `ghp_FAKE...` 형식으로 고정, 기존
  `github-doctor-test`/`fake-pat-token` 네이밍 관례 유지).
- `pat-store.test.js`: `runWithStdin`을 fake로 주입해 **호출된 커맨드/stdin 내용**만 검증(실제
  `git credential approve` 실행 금지). stdin 문자열에 토큰이 정확히 들어갔는지, **커맨드 인자
  쪽에는 토큰이 전혀 없는지**까지 명시적으로 어서션(보안 회귀 방지용으로 가치가 있음).
- 통합 테스트: `credential.helper` 미설정 상태에서 저장을 시도하면 안내만 하고 `approve`를
  호출하지 않는지 확인.
- **실계정/실토큰 E2E 검증(진짜 발급받은 PAT로 실제 push까지 되는지)은 기존 원칙과 동일하게
  프로젝트 완성 후 사용자가 직접 요청할 때만 진행** — "real-credential test" 하드 스탑에 정확히
  해당한다.

### 16-9. 결정이 필요한 열린 질문 (구현 착수 전 확인)

1. `saveCredential`(keytar 기반, 이미 구현·테스트됨)을 완전히 폐기할지, 다른 용도(예: 앱 자체
   설정값 저장)로 남겨둘지 — 지금은 "PAT 저장에는 안 씀"만 결정, 삭제 여부는 보류.
2. fine-grained 토큰의 스코프 확인 방법(`x-oauth-scopes` 헤더가 없을 때 대안이 마땅치 않음) —
   "판단 불가"로 관대하게 통과시키는 게 맞는지, fine-grained는 스코프 검증 자체를 스킵할지.
3. `credential.helper` 미설정 사용자에게 저장 전 안내를 어떤 흐름으로 보여줄지 — 기존 `fix_config`
   류 guide와 톤을 맞출지, 이 화면 안에서 원클릭으로 기본값을 설정해줄지(후자는 새로운 auto-fix
   범위 결정이 필요함).

---

*GitHub Doctor 실전 개발 계획서 v1.1 완전판 | 기반: PRD v1.0 · 개발목표 정의서 v1.0 · v1.0/v1.1 병합 및 리뷰 반영*
