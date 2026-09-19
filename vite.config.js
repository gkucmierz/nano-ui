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
      entry: {
        'nano-ui': resolve(__dirname, 'src/index.js'),
        'vite': resolve(__dirname, 'src/vite/index.js')
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: ['vue', 'vite', /^node:/]
    }
  }
});
