// Ensure SSR prerendering runs with production environment so Vue scoped CSS hashes (descriptor.id) match client build exactly
process.env.NODE_ENV = 'production';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.resolve(root, 'dist-ssg');

const escapeAttr = (str) => String(str).replace(/"/g, '&quot;');
const escapeText = (str) => String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');

const prerender = async () => {
  const templatePath = path.resolve(distDir, 'index.html');
  let template;
  try {
    template = await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error('[prerender] Error: dist-ssg/index.html not found. Run client build first: npm run build:ssg');
    process.exit(1);
  }

  // Spin up Vite in custom middlewareMode to load SSR modules on-the-fly
  const vite = await createServer({
    root,
    configFile: path.resolve(root, 'vite.config.js'),
    mode: 'ssg',
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { render, routes } = await vite.ssrLoadModule('/src/playground/entry-server.js');

    const renderRoutes = routes
      .filter((r) => r.path !== '/:pathMatch(.*)*')
      .map((r) => r.path);

    const allPaths = [...new Set([...renderRoutes, '/docs', '/404'])];

    console.log(`[prerender] Pre-rendering ${allPaths.length} routes for SEO into dist-ssg...`);

    for (const url of allPaths) {
      const is404 = url === '/404';
      const targetUrl = is404 ? '/non-existent-page' : url;
      const { appHtml, meta } = await render(targetUrl);

      let html = template;

      // Inject server-rendered HTML into #app
      html = html.replace(/<div\s+id="app">\s*<\/div>/, `<div id="app">${appHtml}</div>`);

      // Inject SEO Title
      if (meta.title) {
        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeText(meta.title)}</title>`);
        html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(meta.title)}" />`);
        html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`);
      }

      // Inject SEO Description
      if (meta.description) {
        html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(meta.description)}" />`);
        html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`);
        if (/<meta\s+name="description"/i.test(html)) {
          html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(meta.description)}" />`);
        } else {
          html = html.replace(/<\/title>/i, `</title>\n    <meta name="description" content="${escapeAttr(meta.description)}" />`);
        }
      }

      // Inject Canonical Link Tag & og:url for SEO SSoT
      const canonicalPath = is404 ? '/404' : url === '/docs' ? '/docs/overview' : url;
      const canonicalUrl = `https://nano-ui.7u.pl${canonicalPath === '/' ? '' : canonicalPath}`;
      html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
      html = html.replace(/<\/head>/i, `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);

      let outFilePath;
      if (is404) {
        outFilePath = path.resolve(distDir, '404.html');
      } else if (url === '/') {
        outFilePath = path.resolve(distDir, 'index.html');
      } else {
        const cleanPath = url.replace(/^\//, ''); // e.g. 'docs', 'docs/overview', 'docs/tooltip'
        outFilePath = path.resolve(distDir, `${cleanPath}.html`);
        await fs.mkdir(path.dirname(outFilePath), { recursive: true });

        // Ensure root index.html has pre-rendered overview content
        if (url === '/docs/overview') {
          await fs.writeFile(path.resolve(distDir, 'index.html'), html, 'utf-8');
        }
      }

      await fs.writeFile(outFilePath, html, 'utf-8');
      console.log(`[prerender] ✓ ${url} -> ${path.relative(root, outFilePath)}`);
    }

    console.log('[prerender] Pre-rendering completed successfully!');
  } finally {
    await vite.close();
  }
};

prerender();
