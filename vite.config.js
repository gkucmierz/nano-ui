import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 19211,
    strictPort: true
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'NanoUI',
      formats: ['es'],
      fileName: 'nano-ui'
    },
    rollupOptions: {
      external: ['vue']
    }
  }
});
