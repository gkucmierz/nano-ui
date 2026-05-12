import { createRouter, createWebHashHistory } from 'vue-router';
import RippleDoc from '../docs/RippleDoc.vue';
import TooltipDoc from '../docs/TooltipDoc.vue';

const routes = [
  {
    path: '/',
    redirect: '/docs/ripple'
  },
  {
    path: '/docs/ripple',
    name: 'Ripple',
    component: RippleDoc
  },
  {
    path: '/docs/tooltip',
    name: 'Tooltip',
    component: TooltipDoc
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
