import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
    plugins: [
        preact(),
        viteSingleFile(),
    ],
    root: 'ui-src',
    build: {
        outDir: '../', // Output to project root
        emptyOutDir: false, // Don't wipe out code.ts, manifest.json, etc.
        rollupOptions: {
            input: 'ui-src/index.html',
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    server: {
        port: 5173,
        open: false,
    },
});
