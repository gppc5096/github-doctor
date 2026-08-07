import { defineConfig } from 'vitest/config';

// vite.config.mjs와 별도로 둔다 — 거기서는 root를 'src/renderer'로 지정하는데
// (Electron 렌더러 빌드용), 그 설정을 Vitest가 그대로 물려받으면 tests/unit을
// 찾지 못한다 (Vitest는 vitest.config.*가 있으면 vite.config.*보다 우선한다).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
