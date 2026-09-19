import { createSSRApp } from 'vue';
import App from './App.vue';
import NanoUI from '../index.js';
import { createAppRouter } from './router/index.js';
import i18n from '../locales.js';

export const createAppInstance = ({ isServer = false } = {}) => {
  const app = createSSRApp(App);
  const router = createAppRouter({ isServer });

  app.use(router);
  app.use(i18n);
  app.use(NanoUI);

  return { app, router };
};
