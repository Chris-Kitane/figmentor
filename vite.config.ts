import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    preact(),
    viteSingleFile(),
  ],
  root: resolve(__dirname, 'ui-src'),
  build: {
    outDir: resolve(__dirname, 'dist-ui'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'ui-src'),
    },
  },
});
