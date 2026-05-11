import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Separate Vite config to build the Playground app (index.html)
// This overrides the library mode so we get a standard SPA build.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist-app',
    emptyOutDir: true
  }
});
