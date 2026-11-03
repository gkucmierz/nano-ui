import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { nanoUi } from './src/vite/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app' || mode === 'ssg';
  const outDir = mode === 'ssg' ? 'dist-ssg' : isApp ? 'dist-app' : 'dist';

  return {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block',
          },
        },
      }),
      nanoUi(),
      {
        name: 'preview-clean-url-redirect',
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            const [pathname, query] = (req.url || '').split('?');
            if (pathname !== '/' && pathname.endsWith('/')) {
              const cleanPath = pathname.replace(/\/+$/, '') + (query ? `?${query}` : '');
              res.writeHead(301, { Location: cleanPath });
              return res.end();
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 33164,
      strictPort: true,
    },
    preview: {
      port: 33164,
      strictPort: true,
    },
    build: isApp
      ? {
        outDir,
        emptyOutDir: true,
      }
      : {
        lib: {
          entry: {
            'nano-ui': resolve(__dirname, 'src/index.js'),
            'vite': resolve(__dirname, 'src/vite/index.js'),
            'parsers/index': resolve(__dirname, 'src/parsers/index.js'),
            'parsers/javascript': resolve(__dirname, 'src/parsers/javascript.js'),
            'parsers/typescript': resolve(__dirname, 'src/parsers/typescript.js'),
            'parsers/vue': resolve(__dirname, 'src/parsers/vue.js'),
            'parsers/css': resolve(__dirname, 'src/parsers/css.js'),
            'parsers/json': resolve(__dirname, 'src/parsers/json.js'),
            'parsers/bash': resolve(__dirname, 'src/parsers/bash.js'),
            'parsers/markdown': resolve(__dirname, 'src/parsers/markdown.js'),
            'parsers/rust': resolve(__dirname, 'src/parsers/rust.js'),
            'parsers/python': resolve(__dirname, 'src/parsers/python.js'),
            'parsers/sql': resolve(__dirname, 'src/parsers/sql.js'),
            'parsers/yaml': resolve(__dirname, 'src/parsers/yaml.js'),
            'parsers/go': resolve(__dirname, 'src/parsers/go.js'),
            'parsers/dockerfile': resolve(__dirname, 'src/parsers/dockerfile.js'),
            'parsers/diff': resolve(__dirname, 'src/parsers/diff.js'),
            'parsers/api': resolve(__dirname, 'src/parsers/api.js'),
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
