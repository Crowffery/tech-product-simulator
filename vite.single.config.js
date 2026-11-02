// 单文件构建：所有 JS / CSS 打进一个 HTML（用于托管试玩链接）
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
