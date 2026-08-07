import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    // vite-plugin-electron의 entry는 `root`(src/renderer)가 아니라 프로젝트 루트 기준이어야 하므로
    // 절대 경로로 지정한다 (docs/03 §6-1에는 없던 수정 — 실제 빌드 시 발견된 이슈).
    electron([
      {
        entry: `${rootDir}src/main/index.js`,
        vite: {
          build: {
            rollupOptions: {
              // 메인 프로세스는 실제 Node.js에서 실행되므로 node_modules를 번들링하지 않는다.
              // keytar 같은 네이티브(.node) 애드온을 번들에 포함하려 하면 빌드가 깨진다.
              external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.includes(rootDir),
            },
          },
        },
      },
    ]),
  ],
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
