import { tracker } from '@gkucmierz/analytics';

if (!import.meta.env.SSR) {
  tracker.init('nano-ui', 'https://analytics.7u.pl');
}

import pkg from '../package.json';
import { initTheme, getZeroFoucScript, getZeroFoucStyle, getZeroFoucHtml } from './theme.js';
import Ripple from './directives/ripple.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import GlobalTooltip from './components/GlobalTooltip.vue';
import NanoModal from './components/NanoModal.vue';
import ThreeDDonutChart from './components/ThreeDDonutChart.vue';
import PrecisionScrubber from './components/PrecisionScrubber.vue';
import MutatingHeader from './components/MutatingHeader.vue';
import TopologyRadar from './components/TopologyRadar.vue';
import NanoSwitch from './components/NanoSwitch.vue';
import KineticRotator from './components/KineticRotator.vue';
import NanoCodeBlock from './components/NanoCodeBlock.vue';
import NanoIcon from './components/NanoIcon.vue';
import { registerIcons, getAvailableIcons, BUILTIN_ICONS } from './icons/index.js';
import { transitions, durations, easings, transitionVariables } from './config/transitions.js';
import './style.css';

export {
  Ripple,
  tooltipDirective,
  showTooltip,
  hideTooltip,
  tooltipState,
  GlobalTooltip,
  NanoModal,
  ThreeDDonutChart,
  PrecisionScrubber,
  TopologyRadar,
  MutatingHeader,
  NanoSwitch,
  KineticRotator,
  NanoCodeBlock,
  NanoIcon,
  registerIcons,
  getAvailableIcons,
  BUILTIN_ICONS,
  initTheme,
  getZeroFoucScript,
  getZeroFoucStyle,
  getZeroFoucHtml,
  transitions,
  durations,
  easings,
  transitionVariables,
};

export const version = pkg.version;

export const nanoCompilerOptions = {
  isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block',
};

export default {
  version: pkg.version,
  install(app, { directivePrefix = '', componentPrefix = '' } = {}) {
    const dp = directivePrefix ? `${directivePrefix}-` : '';
    const cp = componentPrefix ? `${componentPrefix}` : '';

    app.directive(`${dp}ripple`, Ripple);
    app.directive(`${dp}tooltip`, tooltipDirective);

    app.component(`${cp}GlobalTooltip`, GlobalTooltip);
    app.component(`${cp}NanoModal`, NanoModal);
    app.component(`${cp}ThreeDDonutChart`, ThreeDDonutChart);
    app.component(`${cp}PrecisionScrubber`, PrecisionScrubber);
    app.component(`${cp}TopologyRadar`, TopologyRadar);
    app.component(`${cp}MutatingHeader`, MutatingHeader);
    app.component(`${cp}NanoSwitch`, NanoSwitch);
    app.component(`${cp}KineticRotator`, KineticRotator);
    app.component(`${cp}NanoCodeBlock`, NanoCodeBlock);
    app.component(`${cp}NanoIcon`, NanoIcon);
  },
};
