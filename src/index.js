import pkg from '../package.json';
import { initTheme, getZeroFoucScript, getZeroFoucStyle, getZeroFoucHtml } from './theme.js';
import { useTheme } from './composables/useTheme.js';
import Ripple from './directives/ripple.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import {
  useDialog,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
  dialogState,
} from './composables/useDialog.js';
import GlobalTooltip from './components/GlobalTooltip.vue';
import NanoModal from './components/NanoModal.vue';
import NanoDialog from './components/NanoDialog.vue';
import ThreeDDonutChart from './components/ThreeDDonutChart.vue';
import PrecisionScrubber from './components/PrecisionScrubber.vue';
import MutatingHeader from './components/MutatingHeader.vue';
import TopologyRadar from './components/TopologyRadar.vue';
import NanoSwitch from './components/NanoSwitch.vue';
import NanoSlider from './components/NanoSlider.vue';
import KineticRotator from './components/KineticRotator.vue';
import NanoCodeBlock from './components/NanoCodeBlock.vue';
import NanoFileList from './components/NanoFileList.vue';
import NanoCodeEditor from './components/NanoCodeEditor.vue';
import NanoSplitter from './components/NanoSplitter.vue';
import NanoIcon from './components/NanoIcon.vue';
import NanoColorPickerOklch from './components/NanoColorPickerOklch.vue';
import NuMaskedInput from './components/NuMaskedInput.vue';
import NuPinInput from './components/NuPinInput.vue';
import NanoGlobe from './components/NanoGlobe.vue';
import NanoMap from './components/NanoMap.vue';
import NanoKnob from './components/NanoKnob.vue';
import NanoSelect from './components/NanoSelect.vue';
import NanoTrendChart from './components/NanoTrendChart.vue';
import NanoChannelOsd from './components/NanoChannelOsd.vue';
import NanoNumberStepper from './components/NanoNumberStepper.vue';
import NanoTabs from './components/NanoTabs.vue';
import NanoCheckbox from './components/NanoCheckbox.vue';
import NanoSortableList from './components/NanoSortableList.vue';
import {
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  reorderArray,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
} from './utils/sortable.js';
import { WORLD_COUNTRIES_LITE } from './data/worldCountriesLite.js';
import {
  DEFAULT_MAP_LAYERS,
  MAP_LAYERS,
  getMapLayerById,
  resolveTileUrl,
  clampLatitude,
  normalizeLongitude,
  latLonToWorldPixel,
  worldPixelToLatLon,
  latLonToViewportPoint,
  viewportPointToLatLon,
  buildVisibleTileGrid,
  computeMapScaleBar,
  haversineDistanceKm,
  computePolylineDistanceKm,
  computeGeoBounds,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
} from './utils/map-engine.js';
import {
  registerIcons,
  getAvailableIcons,
  isIconColorable,
  NON_COLORABLE_ICONS,
  BUILTIN_ICONS,
} from './icons/index.js';
import {
  UI_CONTEXT,
  ALLOWED_CONTEXTS,
  WORST_CASE_PLACEHOLDERS,
  estimateVisualStringWidth,
  renderWorstCaseString,
  extractPlaceholders,
  resolveTranslation,
  validateLocaleSymmetry,
} from './utils/i18n-engine.js';
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
  evaluateSplineY,
  cubicHermite,
  sampleKinematics,
} from './utils/kinetics.js';
import {
  DEFAULT_WEEKDAY_LABELS,
  SHORT_WEEKDAY_NAMES,
  getDateWeekdayInfo,
  createWeekdayBandConfig,
  computeVerticalBands,
  computeWeekendBands,
} from './utils/chart-bands.js';
import {
  highlightCode,
  registerParser,
  unregisterParser,
  isParserRegistered,
  getRegisteredParsers,
  SYNTAX_THEMES,
} from './utils/syntax-highlighter.js';
import {
  CORE_PARSERS,
  EXTRA_PARSERS,
  ALL_PARSERS,
  PARSER_MAP,
  javascriptParser,
  typescriptParser,
  vueParser,
  htmlParser,
  cssParser,
  jsonParser,
  bashParser,
  markdownParser,
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
  diffParser,
  apiParser,
  nanosoundParser,
  NANOSOUND_COMPLETIONS,
} from './parsers/index.js';
import {
  detectLangFromPath,
  normalizeFileStatus,
  middleTruncatePath,
  parseUnifiedDiff,
} from './utils/git-diff.js';
import { detectRenderedGridColumns } from './utils/grid.js';
import {
  findSafeSelectMount,
  computeSelectDropdownLayout,
  getPositionedReferenceEl,
} from './utils/selectPositioning.js';
import { transitions, durations, easings, transitionVariables } from './config/transitions.js';
import './style.css';

export {
  Ripple,
  tooltipDirective,
  tooltipDirective as vTooltip,
  showTooltip,
  hideTooltip,
  tooltipState,
  useDialog,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
  dialogState,
  GlobalTooltip,
  NanoModal,
  NanoDialog,
  ThreeDDonutChart,
  PrecisionScrubber,
  TopologyRadar,
  MutatingHeader,
  NanoSwitch,
  NanoSlider,
  KineticRotator,
  NanoCodeBlock,
  NanoFileList,
  NanoCodeEditor,
  NanoSplitter,
  NanoIcon,
  NanoColorPickerOklch,
  NuMaskedInput,
  NuPinInput,
  NanoGlobe,
  NanoMap,
  NanoKnob,
  NanoSelect,
  NanoTrendChart,
  NanoChannelOsd,
  NanoChannelOsd as ChannelOsd,
  NanoNumberStepper,
  NanoNumberStepper as NanoStepper,
  NanoTabs,
  NanoCheckbox,
  NanoSortableList,
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  reorderArray,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
  WORLD_COUNTRIES_LITE,
  DEFAULT_MAP_LAYERS,
  MAP_LAYERS,
  getMapLayerById,
  resolveTileUrl,
  clampLatitude,
  normalizeLongitude,
  latLonToWorldPixel,
  worldPixelToLatLon,
  latLonToViewportPoint,
  viewportPointToLatLon,
  buildVisibleTileGrid,
  computeMapScaleBar,
  haversineDistanceKm,
  computePolylineDistanceKm,
  computeGeoBounds,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
  registerIcons,
  getAvailableIcons,
  isIconColorable,
  NON_COLORABLE_ICONS,
  BUILTIN_ICONS,
  UI_CONTEXT,
  ALLOWED_CONTEXTS,
  WORST_CASE_PLACEHOLDERS,
  estimateVisualStringWidth,
  renderWorstCaseString,
  extractPlaceholders,
  resolveTranslation,
  validateLocaleSymmetry,
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
  evaluateSplineY,
  cubicHermite,
  sampleKinematics,
  DEFAULT_WEEKDAY_LABELS,
  SHORT_WEEKDAY_NAMES,
  getDateWeekdayInfo,
  createWeekdayBandConfig,
  computeVerticalBands,
  computeWeekendBands,
  highlightCode,
  registerParser,
  unregisterParser,
  isParserRegistered,
  getRegisteredParsers,
  SYNTAX_THEMES,
  CORE_PARSERS,
  EXTRA_PARSERS,
  ALL_PARSERS,
  PARSER_MAP,
  javascriptParser,
  typescriptParser,
  vueParser,
  htmlParser,
  cssParser,
  jsonParser,
  bashParser,
  markdownParser,
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
  diffParser,
  apiParser,
  nanosoundParser,
  NANOSOUND_COMPLETIONS,
  detectLangFromPath,
  normalizeFileStatus,
  middleTruncatePath,
  parseUnifiedDiff,
  detectRenderedGridColumns,
  findSafeSelectMount,
  computeSelectDropdownLayout,
  getPositionedReferenceEl,
  initTheme,
  useTheme,
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
    app.component(`${cp}NanoDialog`, NanoDialog);
    app.component(`${cp}ThreeDDonutChart`, ThreeDDonutChart);
    app.component(`${cp}PrecisionScrubber`, PrecisionScrubber);
    app.component(`${cp}TopologyRadar`, TopologyRadar);
    app.component(`${cp}MutatingHeader`, MutatingHeader);
    app.component(`${cp}NanoSwitch`, NanoSwitch);
    app.component(`${cp}NanoSlider`, NanoSlider);
    app.component(`${cp}KineticRotator`, KineticRotator);
    app.component(`${cp}NanoCodeBlock`, NanoCodeBlock);
    app.component(`${cp}NanoFileList`, NanoFileList);
    app.component(`${cp}NanoCodeEditor`, NanoCodeEditor);
    app.component(`${cp}NanoSplitter`, NanoSplitter);
    app.component(`${cp}NanoIcon`, NanoIcon);
    app.component(`${cp}NanoColorPickerOklch`, NanoColorPickerOklch);
    app.component(`${cp}NuMaskedInput`, NuMaskedInput);
    app.component(`${cp}NuPinInput`, NuPinInput);
    app.component(`${cp}NanoGlobe`, NanoGlobe);
    app.component(`${cp}NanoMap`, NanoMap);
    app.component(`${cp}NanoKnob`, NanoKnob);
    app.component(`${cp}NanoSelect`, NanoSelect);
    app.component(`${cp}NanoTrendChart`, NanoTrendChart);
    app.component(`${cp}NanoChannelOsd`, NanoChannelOsd);
    app.component(`${cp}ChannelOsd`, NanoChannelOsd);
    app.component(`${cp}NanoNumberStepper`, NanoNumberStepper);
    app.component(`${cp}NanoStepper`, NanoNumberStepper);
    app.component(`${cp}NanoTabs`, NanoTabs);
    app.component(`${cp}NanoCheckbox`, NanoCheckbox);
    app.component(`${cp}NanoSortableList`, NanoSortableList);
  },
};
