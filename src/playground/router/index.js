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
import SelectDoc from '../docs/SelectDoc.vue';
import KnobDoc from '../docs/KnobDoc.vue';
import GlobeDoc from '../docs/GlobeDoc.vue';
import MapDoc from '../docs/MapDoc.vue';
import ColorPickerDoc from '../docs/ColorPickerDoc.vue';
import MaskedPinDoc from '../docs/MaskedPinDoc.vue';
import TrendChartDoc from '../docs/TrendChartDoc.vue';
import ChannelOsdDoc from '../docs/ChannelOsdDoc.vue';
import NumberStepperDoc from '../docs/NumberStepperDoc.vue';
import KineticAnimationsDoc from '../docs/KineticAnimationsDoc.vue';
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
      description: 'Zero-clutter two-pane resizable splitter with 1px cyan laser line, triangle lock pull-tab, and nested horizontal/vertical support.',
    },
  },
  {
    path: '/docs/select',
    name: 'Select',
    component: SelectDoc,
    meta: {
      title: 'NanoSelect Component | Nano UI',
      componentName: 'NanoSelect',
      type: 'component',
      description: 'Configurable single and multi-select dropdown with diacritic-insensitive live search filter, keyboard navigation, and modal-safe Escape isolation.',
    },
  },
  {
    path: '/docs/knob',
    name: 'Knob',
    component: KnobDoc,
    meta: {
      title: 'NanoKnob Component | Nano UI',
      componentName: 'NanoKnob',
      type: 'component',
      description: 'Tactile circular rotary dial built on C1 Hermite kinematics with geodesic shortest-path interpolation, center reset hub, and rim ticks.',
    },
  },
  {
    path: '/docs/globe',
    name: 'Globe',
    component: GlobeDoc,
    meta: {
      title: 'NanoGlobe & HEALPix Component | Nano UI',
      componentName: 'NanoGlobe',
      type: 'component',
      description: 'Interactive 3D orthographic SVG globe with country polygons, cartographic graticules, and equal-area HEALPix spherical tessellation.',
    },
  },
  {
    path: '/docs/map',
    name: 'Map',
    component: MapDoc,
    meta: {
      title: 'NanoMap & Tile Layers Component | Nano UI',
      componentName: 'NanoMap',
      type: 'component',
      description: 'Interactive Web Mercator slippy map with 9 keyless tile layers, configurable + / - zoom controls, metric scale bar, rotating compass rose, and GPS polyline tracking.',
    },
  },
  {
    path: '/docs/color-picker',
    name: 'ColorPicker',
    component: ColorPickerDoc,
    meta: {
      title: 'NanoColorPickerOklch Component | Nano UI',
      componentName: 'NanoColorPickerOklch',
      type: 'component',
      description: 'Perceptually uniform OKLCH color picker with interactive Hue/Chroma wheel, Lightness slider, and WCAG 2.1 AA/AAA contrast verification.',
    },
  },
  {
    path: '/docs/masked-input',
    name: 'MaskedInput',
    component: MaskedPinDoc,
    meta: {
      title: 'NuMaskedInput & NuPinInput | Nano UI',
      componentName: 'NuMaskedInput',
      type: 'component',
      description: 'Declarative masked text input and 6-digit 2FA PIN verification control with live guide overlay and countdown expiration timer.',
    },
  },
  {
    path: '/docs/channel-osd',
    name: 'ChannelOsd',
    component: ChannelOsdDoc,
    meta: {
      title: 'NanoChannelOsd (TV HUD) | Nano UI',
      componentName: 'NanoChannelOsd',
      type: 'component',
      description: 'TV-style multi-digit glassmorphic numeric HUD overlay for instant 01–99 channel/scene switching via 0–9 keys.',
    },
  },
  {
    path: '/docs/number-stepper',
    name: 'NumberStepper',
    component: NumberStepperDoc,
    meta: {
      title: 'NanoNumberStepper (Stacked & Split) | Nano UI',
      componentName: 'NanoNumberStepper',
      type: 'component',
      description: 'Dual-variant numeric stepper control: right-side 50%/50% stacked Up/Down chevrons and glued Left/Right (- / +) buttons with hold-to-repeat.',
    },
  },
  {
    path: '/docs/trend-chart',
    name: 'TrendChart',
    component: TrendChartDoc,
    meta: {
      title: 'NanoTrendChart & Vertical Bands | Nano UI',
      componentName: 'NanoTrendChart',
      type: 'component',
      description: 'Generic multi-series kinetic SVG spline & area chart with configurable vertical bands (single SB/ND or merged SB–ND) and floating kinetic tooltip bubbles.',
    },
  },
  {
    path: '/docs/kinetic-animations',
    name: 'KineticAnimations',
    component: KineticAnimationsDoc,
    meta: {
      title: 'Kinetic Animations Engine (C¹ Hermite) | Nano UI',
      componentName: 'KineticAnimations',
      type: 'utility',
      description: 'Headless C¹ velocity-preserving Hermite kinematics engine for scalar transitions, multi-point curve resampling, Catmull-Rom splines, and 16-step Bezier bisection.',
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
