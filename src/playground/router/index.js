import { createRouter, createWebHashHistory } from 'vue-router';
import RippleDoc from '../docs/RippleDoc.vue';
import TooltipDoc from '../docs/TooltipDoc.vue';
import ModalDoc from '../docs/ModalDoc.vue';
import ThreeDDonutChartDoc from '../docs/ThreeDDonutChartDoc.vue';

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
  },
  {
    path: '/docs/modal',
    name: 'Modal',
    component: ModalDoc
  },
  {
    path: '/docs/3d-donut-chart',
    name: 'ThreeDDonutChart',
    component: ThreeDDonutChartDoc
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
