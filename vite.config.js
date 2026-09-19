import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block'
        }
      }
    })
  ],
  server: {
    port: 33164,
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
