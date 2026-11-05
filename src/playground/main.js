import { tracker } from '@gkucmierz/analytics';
import { createAppInstance } from './app-factory.js';

if (typeof window !== 'undefined') {
  tracker.init('nano-ui', 'https://analytics.7u.pl');
}

const hasSsrMarkup =
  typeof document !== 'undefined' &&
  Boolean(document.getElementById('app')?.firstElementChild);

const { app, router } = createAppInstance({
  isServer: false,
  hydrate: hasSsrMarkup,
});

router.isReady().then(() => {
  app.mount('#app');
});
