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
import NanoSlider from './components/NanoSlider.vue';
import KineticRotator from './components/KineticRotator.vue';
import NanoCodeBlock from './components/NanoCodeBlock.vue';
import NanoIcon from './components/NanoIcon.vue';
import NanoColorPickerOklch from './components/NanoColorPickerOklch.vue';
import NuMaskedInput from './components/NuMaskedInput.vue';
import NuPinInput from './components/NuPinInput.vue';
import { registerIcons, getAvailableIcons, BUILTIN_ICONS } from './icons/index.js';
import { normalizeAngle, shortestAngleDiff } from './utils/math.js';
import {
  getPerceivedLightness,
  getContrastTextColor,
  pickBestContrastColor,
  adjustLightness,
  getWcagContrastRatio,
  parseColor,
  rgbToOklch,
  oklchToRgb,
  formatHex,
  formatRgb,
  formatOklch,
} from './utils/colors.js';
import {
  DEFAULT_TOKENS,
  countSlots,
  applyMask,
  parseMaskSteps,
} from './utils/mask.js';
import {
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
  cubicHermite,
  sampleKinematics,
} from './utils/kinetics.js';
import { highlightCode } from './utils/syntax-highlighter.js';
import { detectRenderedGridColumns } from './utils/grid.js';
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
  NanoSlider,
  KineticRotator,
  NanoCodeBlock,
  NanoIcon,
  NanoColorPickerOklch,
  NuMaskedInput,
  NuPinInput,
  registerIcons,
  getAvailableIcons,
  BUILTIN_ICONS,
  normalizeAngle,
  shortestAngleDiff,
  getPerceivedLightness,
  getContrastTextColor,
  pickBestContrastColor,
  adjustLightness,
  getWcagContrastRatio,
  parseColor,
  rgbToOklch,
  oklchToRgb,
  formatHex,
  formatRgb,
  formatOklch,
  DEFAULT_TOKENS,
  countSlots,
  applyMask,
  parseMaskSteps,
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
  cubicHermite,
  sampleKinematics,
  highlightCode,
  detectRenderedGridColumns,
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
    app.component(`${cp}NanoSlider`, NanoSlider);
    app.component(`${cp}KineticRotator`, KineticRotator);
    app.component(`${cp}NanoCodeBlock`, NanoCodeBlock);
    app.component(`${cp}NanoIcon`, NanoIcon);
    app.component(`${cp}NanoColorPickerOklch`, NanoColorPickerOklch);
    app.component(`${cp}NuMaskedInput`, NuMaskedInput);
    app.component(`${cp}NuPinInput`, NuPinInput);
  },
};
