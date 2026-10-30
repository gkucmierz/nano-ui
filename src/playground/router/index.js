import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import OverviewDoc from '../docs/OverviewDoc.vue';
import ButtonDoc from '../docs/ButtonDoc.vue';
import InputDoc from '../docs/InputDoc.vue';
import CardDoc from '../docs/CardDoc.vue';
import BadgeDoc from '../docs/BadgeDoc.vue';
import TableDoc from '../docs/TableDoc.vue';
import AlertDoc from '../docs/AlertDoc.vue';
import RippleDoc from '../docs/RippleDoc.vue';
import TooltipDoc from '../docs/TooltipDoc.vue';
import ModalDoc from '../docs/ModalDoc.vue';
import ThreeDDonutChartDoc from '../docs/ThreeDDonutChartDoc.vue';
import PrecisionScrubberDoc from '../docs/PrecisionScrubberDoc.vue';
import TopologyRadarDoc from '../docs/TopologyRadarDoc.vue';
import MutatingHeaderDoc from '../docs/MutatingHeaderDoc.vue';
import SwitchDoc from '../docs/SwitchDoc.vue';
import SliderDoc from '../docs/SliderDoc.vue';
import IconDoc from '../docs/IconDoc.vue';
import KineticDoc from '../docs/KineticDoc.vue';
import CodeEditorDoc from '../docs/CodeEditorDoc.vue';
import SplitterDoc from '../docs/SplitterDoc.vue';
import NotFoundDoc from '../docs/NotFoundDoc.vue';

export const routes = [
  {
    path: '/',
    redirect: '/docs/overview',
  },
  {
    path: '/docs',
    redirect: '/docs/overview',
  },
  {
    path: '/docs/overview',
    name: 'Overview',
    component: OverviewDoc,
    meta: {
      title: 'Overview & Setup | Nano UI',
      description: 'High-performance, minimal footprint Vue 3 UI library, interactive 3D charts, and kinematic directives with built-in Zero-FOUC design tokens.',
    },
  },
  {
    path: '/docs/buttons',
    name: 'Buttons',
    component: ButtonDoc,
    meta: {
      title: 'Buttons & Groups | Nano UI',
      componentName: 'Buttons',
      type: 'primitive',
      description: 'Ultra-lightweight, hardware-accelerated button primitives with semantic states, fluid hover transitions, native accessibility, and docked button groups.',
    },
  },
  {
    path: '/docs/inputs',
    name: 'Inputs',
    component: InputDoc,
    meta: {
      title: 'Inputs & Groups | Nano UI',
      componentName: 'Inputs',
      type: 'primitive',
      description: 'Clean, ergonomic form controls with native zero-outline focus glow, docked prefix/suffix addons, seamless action buttons, and validation states.',
    },
  },
  {
    path: '/docs/cards',
    name: 'Cards',
    component: CardDoc,
    meta: {
      title: 'Cards & Metrics | Nano UI',
      componentName: 'Cards',
      type: 'primitive',
      description: 'Structural surface primitives, docked headers/footers, interactive clickable tiles, and responsive KPI metric grids for telemetry dashboards.',
    },
  },
  {
    path: '/docs/badges',
    name: 'Badges',
    component: BadgeDoc,
    meta: {
      title: 'Badges & Indicators | Nano UI',
      componentName: 'Badges',
      type: 'primitive',
      description: 'Ultra-compact status indicators, pulsating telemetry dots, semantic badges, and filter pills with embedded counts for high-density applications.',
    },
  },
  {
    path: '/docs/tables',
    name: 'Tables',
    component: TableDoc,
    meta: {
      title: 'Data Tables | Nano UI',
      componentName: 'Tables',
      type: 'primitive',
      description: 'High-density tabular data presentation, sticky header navigation, selectable rows with left accent indicators, and compact telemetry variants.',
    },
  },
  {
    path: '/docs/alerts',
    name: 'Alerts',
    component: AlertDoc,
    meta: {
      title: 'Alerts & Banners | Nano UI',
      componentName: 'Alerts',
      type: 'primitive',
      description: 'Contextual feedback messages, system warnings, confirmation banners, and dismissible inline alerts with high-contrast theme tokens.',
    },
  },
  {
    path: '/docs/ripple',
    name: 'Ripple',
    component: RippleDoc,
    meta: {
      title: 'v-ripple Directive | Nano UI',
      componentName: 'Ripple',
      type: 'directive',
      description: 'Ultra-lightweight, hardware-accelerated fluid radial wave ripple directive for Vue 3.',
    },
  },
  {
    path: '/docs/tooltip',
    name: 'Tooltip',
    component: TooltipDoc,
    meta: {
      title: 'v-tooltip Directive | Nano UI',
      componentName: 'Tooltip',
      type: 'directive',
      description: 'Instant-feel cursor-aware tooltip directive for Vue 3 with zero latency and smart viewport collision avoidance.',
    },
  },
  {
    path: '/docs/modal',
    name: 'Modal',
    component: ModalDoc,
    meta: {
      title: 'NanoModal Component | Nano UI',
      componentName: 'NanoModal',
      type: 'component',
      description: 'Zero-FOUC glassmorphism modal dialog component with smooth backdrop transitions, dragging, and universal ESC dismissal.',
    },
  },
  {
    path: '/docs/switch',
    name: 'Switch',
    component: SwitchDoc,
    meta: {
      title: 'NanoSwitch Component | Nano UI',
      componentName: 'NanoSwitch',
      type: 'component',
      description: 'Tactile toggle switch component with spring-physics feedback and keyboard accessibility.',
    },
  },
  {
    path: '/docs/slider',
    name: 'Slider',
    component: SliderDoc,
    meta: {
      title: 'NanoSlider Component | Nano UI',
      componentName: 'NanoSlider',
      type: 'component',
      description: 'Tactile gradient range slider with dual-core thumb handle, quartile ticks, pointer-capture dragging, and keyboard accessibility.',
    },
  },
  {
    path: '/docs/icons',
    name: 'Icons',
    component: IconDoc,
    meta: {
      title: 'NanoIcon Component | Nano UI',
      componentName: 'NanoIcon',
      type: 'component',
      description: 'Universal, zero-dependency inline SVG icon component with full currentColor support, size presets, and offline-first design.',
    },
  },
  {
    path: '/docs/3d-donut-chart',
    name: 'ThreeDDonutChart',
    component: ThreeDDonutChartDoc,
    meta: {
      title: '3D Donut Chart Component | Nano UI',
      componentName: 'ThreeDDonutChart',
      type: 'component',
      description: 'Interactive 3D SVG donut and pie chart component with hover slicing, mouse tracking, and smooth rotation.',
    },
  },
  {
    path: '/docs/precision-scrubber',
    name: 'PrecisionScrubber',
    component: PrecisionScrubberDoc,
    meta: {
      title: 'PrecisionScrubber Component | Nano UI',
      componentName: 'PrecisionScrubber',
      type: 'component',
      description: 'High-precision rotary scrub dial and slider component for granular numerical value control.',
    },
  },
  {
    path: '/docs/topology-radar',
    name: 'TopologyRadar',
    component: TopologyRadarDoc,
    meta: {
      title: 'TopologyRadar Component | Nano UI',
      componentName: 'TopologyRadar',
      type: 'component',
      description: 'Cyberpunk-inspired dynamic vector radar canvas component for node clustering and telemetry visualization.',
    },
  },
  {
    path: '/docs/mutating-header',
    name: 'MutatingHeader',
    component: MutatingHeaderDoc,
    meta: {
      title: 'MutatingHeader Component | Nano UI',
      componentName: 'MutatingHeader',
      type: 'component',
      description: 'Smooth morphing and docking navigation header component with scroll hysteresis.',
    },
  },
  {
    path: '/docs/kinetic',
    name: 'KineticRotator',
    component: KineticDoc,
    meta: {
      title: 'KineticRotator Component | Nano UI',
      componentName: 'KineticRotator',
      type: 'component',
      description: 'Continuous velocity-preserving Hermite kinematics component with modular geodesic shortest-path interpolation.',
    },
  },
  {
    path: '/docs/code-editor',
    name: 'CodeEditor',
    component: CodeEditorDoc,
    meta: {
      title: 'NanoFileList & NanoCodeEditor | Nano UI',
      componentName: 'NanoCodeEditor',
      type: 'component',
      description: 'Git changed files navigator with middle-ellipsis truncation, unified/split diff inspector, and live syntax-highlighted code editor.',
    },
  },
  {
    path: '/docs/splitter',
    name: 'Splitter',
    component: SplitterDoc,
    meta: {
      title: 'NanoSplitter Component | Nano UI',
      componentName: 'NanoSplitter',
      type: 'component',
      description: 'Zero-clutter LoL-Inspector-styled two-pane resizable splitter with 1px cyan laser line, triangle lock pull-tab, and nested horizontal/vertical support.',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundDoc,
    meta: {
      title: '404 - Page Not Found | Nano UI',
      description: 'The requested documentation path does not exist or the component has moved.',
    },
  },
];

export const createAppRouter = ({ isServer = false } = {}) => {
  const router = createRouter({
    history: isServer ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  });

  // Graceful backward-compatibility redirect for legacy bookmarked URLs (e.g. /#/docs/...)
  router.beforeEach((to) => {
    if (!isServer && to.hash && to.hash.startsWith('#/')) {
      return to.hash.slice(1);
    }
  });

  // Reactive page title synchronization for client SPA navigation
  router.afterEach((to) => {
    if (!isServer && typeof document !== 'undefined' && to.meta?.title) {
      document.title = to.meta.title;
    }
  });

  return router;
};

export default createAppRouter;
