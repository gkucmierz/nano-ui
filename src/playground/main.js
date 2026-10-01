import { tracker } from '@gkucmierz/analytics';
import { createAppInstance } from './app-factory.js';

if (typeof window !== 'undefined') {
  tracker.init('nano-ui', 'https://analytics.7u.pl');
}

const { app, router } = createAppInstance({ isServer: false });

router.isReady().then(() => {
  app.mount('#app');
});
