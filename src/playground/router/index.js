import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
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

export const routes = [
  {
    path: '/',
    redirect: '/docs/overview'
  },
  {
    path: '/docs/overview',
    name: 'Overview',
    component: OverviewDoc,
    meta: {
      title: 'Overview & Setup | Nano UI',
      description: 'High-performance, minimal footprint Vue 3 UI library, interactive 3D charts, and kinematic directives with built-in Zero-FOUC design tokens.'
    }
  },
  {
    path: '/docs/ripple',
    name: 'Ripple',
    component: RippleDoc,
    meta: {
      title: 'v-ripple Directive | Nano UI',
      description: 'Ultra-lightweight, hardware-accelerated fluid radial wave ripple directive for Vue 3.'
    }
  },
  {
    path: '/docs/tooltip',
    name: 'Tooltip',
    component: TooltipDoc,
    meta: {
      title: 'v-tooltip Directive | Nano UI',
      description: 'Instant-feel cursor-aware tooltip directive for Vue 3 with zero latency and smart viewport collision avoidance.'
    }
  },
  {
    path: '/docs/modal',
    name: 'Modal',
    component: ModalDoc,
    meta: {
      title: 'NanoModal Component | Nano UI',
      description: 'Zero-FOUC glassmorphism modal dialog component with smooth backdrop transitions, dragging, and universal ESC dismissal.'
    }
  },
  {
    path: '/docs/switch',
    name: 'Switch',
    component: SwitchDoc,
    meta: {
      title: 'NanoSwitch Component | Nano UI',
      description: 'Tactile toggle switch component with spring-physics feedback and keyboard accessibility.'
    }
  },
  {
    path: '/docs/3d-donut-chart',
    name: 'ThreeDDonutChart',
    component: ThreeDDonutChartDoc,
    meta: {
      title: '3D Donut Chart Component | Nano UI',
      description: 'Interactive 3D SVG donut and pie chart component with hover slicing, mouse tracking, and smooth rotation.'
    }
  },
  {
    path: '/docs/precision-scrubber',
    name: 'PrecisionScrubber',
    component: PrecisionScrubberDoc,
    meta: {
      title: 'PrecisionScrubber Component | Nano UI',
      description: 'High-precision rotary scrub dial and slider component for granular numerical value control.'
    }
  },
  {
    path: '/docs/topology-radar',
    name: 'TopologyRadar',
    component: TopologyRadarDoc,
    meta: {
      title: 'TopologyRadar Component | Nano UI',
      description: 'Cyberpunk-inspired dynamic vector radar canvas component for node clustering and telemetry visualization.'
    }
  },
  {
    path: '/docs/mutating-header',
    name: 'MutatingHeader',
    component: MutatingHeaderDoc,
    meta: {
      title: 'MutatingHeader Component | Nano UI',
      description: 'Smooth morphing and docking navigation header component with scroll hysteresis.'
    }
  },
  {
    path: '/docs/kinetic',
    name: 'KineticRotator',
    component: KineticDoc,
    meta: {
      title: 'KineticRotator Component | Nano UI',
      description: 'Continuous velocity-preserving Hermite kinematics component with modular geodesic shortest-path interpolation.'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundDoc,
    meta: {
      title: '404 - Page Not Found | Nano UI',
      description: 'The requested documentation path does not exist or the component has moved.'
    }
  }
];

export const createAppRouter = ({ isServer = false } = {}) => {
  const router = createRouter({
    history: isServer ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes
  });

  if (!isServer) {
    // Graceful backward-compatibility redirect for legacy bookmarked URLs (e.g. /#/docs/...)
    router.beforeEach((to) => {
      if (to.hash && to.hash.startsWith('#/')) {
        return to.hash.slice(1);
      }
    });

    // Reactive page title synchronization for client SPA navigation
    router.afterEach((to) => {
      if (typeof document !== 'undefined' && to.meta?.title) {
        document.title = to.meta.title;
      }
    });
  }

  return router;
};

export default createAppRouter();
