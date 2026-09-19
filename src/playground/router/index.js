import { createRouter, createWebHistory } from 'vue-router';
import OverviewDoc from '../docs/OverviewDoc.vue';
import RippleDoc from '../docs/RippleDoc.vue';
import TooltipDoc from '../docs/TooltipDoc.vue';
import ModalDoc from '../docs/ModalDoc.vue';
import ThreeDDonutChartDoc from '../docs/ThreeDDonutChartDoc.vue';
import PrecisionScrubberDoc from '../docs/PrecisionScrubberDoc.vue';
import TopologyRadarDoc from '../docs/TopologyRadarDoc.vue';
import MutatingHeaderDoc from '../docs/MutatingHeaderDoc.vue';
import SwitchDoc from '../docs/SwitchDoc.vue';
import KineticDoc from '../docs/KineticDoc.vue';
import NotFoundDoc from '../docs/NotFoundDoc.vue';

const routes = [
  {
    path: '/',
    redirect: '/docs/overview'
  },
  {
    path: '/docs/overview',
    name: 'Overview',
    component: OverviewDoc
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
    path: '/docs/switch',
    name: 'Switch',
    component: SwitchDoc
  },
  {
    path: '/docs/3d-donut-chart',
    name: 'ThreeDDonutChart',
    component: ThreeDDonutChartDoc
  },
  {
    path: '/docs/precision-scrubber',
    name: 'PrecisionScrubber',
    component: PrecisionScrubberDoc
  },
  {
    path: '/docs/topology-radar',
    name: 'TopologyRadar',
    component: TopologyRadarDoc
  },
  {
    path: '/docs/mutating-header',
    name: 'MutatingHeader',
    component: MutatingHeaderDoc
  },
  {
    path: '/docs/kinetic',
    name: 'KineticRotator',
    component: KineticDoc
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundDoc
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Graceful backward-compatibility redirect for legacy bookmarked URLs (e.g. /#/docs/...)
router.beforeEach((to) => {
  if (to.hash && to.hash.startsWith('#/')) {
    return to.hash.slice(1);
  }
});

export default router;
