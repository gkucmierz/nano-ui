import { renderToString } from 'vue/server-renderer';
import { createAppInstance } from './app-factory.js';
import { routes } from './router/index.js';

export { routes };

export const render = async (url) => {
  const { app, router } = createAppInstance({ isServer: true });

  await router.push(url);
  await router.isReady();

  const appHtml = await renderToString(app);
  const currentRoute = router.currentRoute.value;
  const meta = currentRoute.meta || {};

  return {
    appHtml,
    meta: {
      title: meta.title || 'Nano UI - High-performance Vue 3 UI Library',
      description: meta.description || 'High-performance, minimal footprint Vue 3 UI library, interactive 3D charts, and kinematic components.',
      path: url
    }
  };
};
