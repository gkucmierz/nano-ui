import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nanoUi } from './src/vite/index.js';

// Separate Vite config to build the Playground app (index.html)
// This overrides the library mode so we get a standard SPA build.
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block'
        }
      }
    }),
    nanoUi()
  ],
  build: {
    outDir: 'dist-app',
    emptyOutDir: true
  }
});
