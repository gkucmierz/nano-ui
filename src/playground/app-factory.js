import { createApp, createSSRApp } from 'vue';
import { cleanCurrentUrl, createUrlCleaner } from 'vue-url-cleaner';
import App from './App.vue';
import NanoUI from '../index.js';
import { createAppRouter, routes } from './router/index.js';
import {
  resolveRouteAllowedQueryKeys,
  buildInitialAllowedQueryKeys,
} from './urlCleanerConfig.js';
import i18n from '../locales.js';

export { resolveRouteAllowedQueryKeys, buildInitialAllowedQueryKeys };

export const createAppInstance = ({
  isServer = false,
  hydrate = false,
  urlCleanerOptions = {},
} = {}) => {
  const app = isServer || hydrate ? createSSRApp(App) : createApp(App);

  if (!isServer && globalThis.window !== undefined && globalThis.window.location) {
    const initialAllowedKeys = buildInitialAllowedQueryKeys(
      globalThis.window.location.pathname,
      routes,
      urlCleanerOptions
    );

    cleanCurrentUrl({
      ...urlCleanerOptions,
      allowedKeys: initialAllowedKeys,
    });
  }

  const router = createAppRouter({ isServer });

  app.use(router);
  if (!isServer) {
    app.use(
      createUrlCleaner({
        router,
        autoFromRouteMeta: true,
        ...urlCleanerOptions,
      })
    );
  }
  app.use(i18n);
  app.use(NanoUI);

  return { app, router };
};
