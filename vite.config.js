import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { nanoUi } from './src/vite/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app';

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block',
          },
        },
      }),
      nanoUi(),
    ],
    server: {
      port: 33164,
      strictPort: true,
    },
    build: isApp
      ? {
        outDir: 'dist-app',
        emptyOutDir: true,
      }
      : {
        lib: {
          entry: {
            'nano-ui': resolve(__dirname, 'src/index.js'),
            'vite': resolve(__dirname, 'src/vite/index.js'),
          },
          formats: ['es'],
          fileName: (format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
          external: ['vue', 'vite', /^node:/],
        },
      },
  };
});
