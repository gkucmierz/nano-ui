import { createRouter, createWebHashHistory } from 'vue-router';
import RippleDoc from '../docs/RippleDoc.vue';
import TooltipDoc from '../docs/TooltipDoc.vue';
import ModalDoc from '../docs/ModalDoc.vue';
import ThreeDDonutChartDoc from '../docs/ThreeDDonutChartDoc.vue';
import PrecisionScrubberDoc from '../docs/PrecisionScrubberDoc.vue';
import TopologyRadarDoc from '../docs/TopologyRadarDoc.vue';
import MutatingHeaderDoc from '../docs/MutatingHeaderDoc.vue';
import SwitchDoc from '../docs/SwitchDoc.vue';

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
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
