import { createAppInstance } from './app-factory.js';

const { app, router } = createAppInstance({ isServer: false });

router.isReady().then(() => {
  app.mount('#app');
});
