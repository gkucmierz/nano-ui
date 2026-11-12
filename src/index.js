import pkg from '../package.json';
import { initTheme, getZeroFoucScript, getZeroFoucStyle, getZeroFoucHtml } from './theme.js';
import { useTheme, getNextTheme } from './composables/useTheme.js';
import {
  useInertialStabilizer,
  createInertialStabilizerEngine,
  deviceOrientationToQuaternion,
  computeStabilizedWorldQuaternion,
  quatMultiply,
  quatConjugate,
  quatNormalize,
  quatSlerp,
} from './composables/useInertialStabilizer.js';
import Ripple, { computeRippleGeometry } from './directives/ripple.js';
import {
  NANO_UI_SOUND_PRESETS,
  CONTROL_ACOUSTIC_MASS_PROFILES,
  resolveControlAcousticMass,
  configureNanoUiSound,
  getNanoUiSoundConfig,
  resetNanoUiSoundConfig,
  useNanoUiSound,
  resolveComponentSoundConfig,
  playNanoUiSound,
  computeKnobDetentCrossings,
  computeSliderAcousticEvents,
} from './utils/sound-controller.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import { buildTooltipBubbleGeometry } from './utils/tooltipGeometry.js';
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
import NanoWelcomeHud from './components/NanoWelcomeHud.vue';
import NanoNumberStepper from './components/NanoNumberStepper.vue';
import NanoTabs from './components/NanoTabs.vue';
import NanoCheckbox from './components/NanoCheckbox.vue';
import NanoSortableList from './components/NanoSortableList.vue';
import NanoDatePicker from './components/NanoDatePicker.vue';
import NanoSecretPipe from './components/NanoSecretPipe.vue';
import NanoCoverFlow from './components/NanoCoverFlow.vue';
import NanoCollapsible from './components/NanoCollapsible.vue';
import NanoDropzone from './components/NanoDropzone.vue';
import NanoTree from './components/NanoTree.vue';
import NanoFieldset from './components/NanoFieldset.vue';
import NanoLightbox from './components/NanoLightbox.vue';
import {
  UNIX_TREE_GLYPHS,
  matchesTreeNodeQuery,
  filterUnixTreeNodes,
  collectExpandableTreeIds,
  flattenUnixTree,
  formatUnixAsciiTree,
} from './utils/unixTree.js';
import {
  DROPZONE_MODES,
  formatDropzoneBytes,
  matchesAcceptPattern,
  validateDroppedFiles,
  createDropzoneStateMachine,
} from './utils/dropzoneState.js';
import {
  shouldPreventModalBackgroundScroll,
  lockModalBackgroundScroll,
  unlockModalBackgroundScroll,
  getActiveModalScrollLockCount,
  resetModalScrollLocks,
} from './utils/modalScrollLock.js';
import {
  computeBoundedCenterScroll,
  computeCenteredScrollLeft,
  computeCenteredScrollTop,
  computeBoundedCenterScroll2D,
  measureChildRelativeScrollGeometry,
  scrollElementToBoundedCenter,
  cancelBoundedCenterScroll,
} from './utils/boundedCenterScroll.js';
import {
  computeAvailableFillHeight,
  resolveFillHeightBoundary,
  measureElementFillHeight,
  useFillHeight,
  fillHeightDirective,
} from './utils/fillHeight.js';
import {
  DEFAULT_REARM_MOVE_THRESHOLD_PX,
  NANO_TRI_BORDER_STATES,
  resolveCoupledItemIds,
  resolveTriStateBorder,
  resolveTriStateBorderClasses,
  createCoupledSelectionMachine,
  useCoupledSelection,
} from './utils/coupledSelection.js';
import {
  NON_TEXT_INPUT_TYPES,
  isEditableTextTarget,
  isNativeControlConflict,
  parseKeyCombo,
  createKeyController,
  getGlobalKeyController,
  stepWrappedIndex,
  isGroupOptionActive,
  isInteractiveGroupOptionElement,
  getGroupInteractiveChildren,
  resolveInteractiveDomGroup,
  stepInteractiveDomGroup,
} from './utils/key-controller.js';
import {
  saveElementScrollPosition,
  readElementScrollPosition,
  restoreElementScroll,
  scrollPersistDirective,
} from './utils/scrollPersist.js';
import {
  SLIDER_THUMB_OVERHANG_BY_SIZE,
  getSliderThumbOverhangPx,
  resolveSliderSafeInsets,
} from './utils/sliderPositioning.js';
import {
  resolveCollapsibleConfig,
  evaluateSplitterSnapCollapse,
  computeVirtualCollapsedPaneStyles,
  resolveSplitterHitboxSizePx,
  computeSplitterProximityField,
} from './utils/splitterCollapse.js';
import {
  COVERFLOW_ORIENTATIONS,
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
} from './utils/coverflow.js';
import { secretPipeDirective } from './directives/secretPipe.js';
import { sanitizeSecretPaste, createSecretByteBuffer } from './utils/secretPipe.js';
import {
  PHI,
  INV_PHI,
  INV_PHI2,
  INV_PHI3,
  INV_PHI4,
  BAUHAUS_PHI_EXACT_TARGETS,
  BAUHAUS_PHI_2D_SPEC,
  NANO_UI_SONIC_LOGO_NSD,
  MATH_FORMULA_SWEEP_BANK,
  projectOrthographic3D,
  buildExtrudedSolid3D,
  computeLogoPerfectionScalar,
  computeFloating3DArtifacts,
  computeOrbitingMathTokens3D,
  computeStagePointerField,
  computeBauhausPhiScene3D,
} from './utils/bauhausPhiLogo.js';
import {
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  WEEKDAY_MONDAY_FIRST,
  formatIsoDate,
  parseIsoDate,
  getTodayIso,
  addDaysToIso,
  formatDisplayDate,
  isIsoDateDisabled,
  buildCalendarMonthGrid,
} from './utils/datepicker.js';
import {
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  reorderArray,
  mutualRange,
  sumRange,
  diffRange,
  xorRange,
  measureRange,
  computeSharedArea2D,
  resolveSortableSlotByArea,
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
  projectRetainedTilesToViewport,
  computeMapScaleBar,
  haversineDistanceKm,
  computePolylineDistanceKm,
  computeGeoBounds,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
  normalizeMapPolygons,
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
import {
  clamp,
  countStepDecimals,
  quantizeStepValue,
  normalizeAngle,
  shortestAngleDiff,
} from './utils/math.js';
import {
  NANO_COLOR_PRESETS,
  NANO_ACCENT_PRESETS,
  pickNanoPresetByPort,
  isNanoColorPreset,
  resolveNanoColor,
  getPerceivedLightness,
  getContrastTextColor,
  pickBestContrastColor,
  adjustLightness,
  getWcagContrastRatio,
  parseColor,
  rgbToOklch,
  oklchToLinearRgb,
  isOklchInSrgbGamut,
  getMaxOklchChroma,
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
  highlightGlsl,
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
  glslParser,
  GLSL_COMPLETIONS,
} from './parsers/index.js';
import {
  detectLangFromPath,
  detectMediaTypeFromPath,
  extractSvgIntrinsicDimensions,
  formatFileSizeBytes,
  normalizeFileStatus,
  normalizeSvgPreviewMarkup,
  middleTruncatePath,
  parseUnifiedDiff,
  PREVIEW_MEDIA_TYPES,
  resolveEditorViewMode,
} from './utils/git-diff.js';
import {
  compileNsdPreview,
  extractEmbeddedNsdSnippets,
} from './utils/nsd-preview.js';
import { detectRenderedGridColumns } from './utils/grid.js';
import {
  findSafeSelectMount,
  findSafeAncestorMount,
  computeSelectDropdownLayout,
  computeAdaptiveCardExpansion,
  getPositionedReferenceEl,
  clampFloatingBox2D,
  measureSafeStageBounds,
} from './utils/selectPositioning.js';
import {
  naturalSearch,
  computeMonospaceFittedFontSize,
  fitSvgTextSize,
  fitHtmlTextSize,
  fitCardContentToHeight,
  fitTextDirective,
} from './utils/fitText.js';
import {
  CHANNEL_OSD_SHAPES,
  resolveChannelOsdMaxDigits,
  resolveChannelOsdBox,
} from './utils/channelOsdLayout.js';
import {
  easeInOutCubic,
  computeSphericalLabelOpacity,
  computeSolarCosZenith,
  computeSolarIrradiance,
  computeSolarTwilightOpacity,
  buildSphericalCapSvgPath,
  buildSolarTerminatorSvgPrimitives,
  lonLatToWorldUnitVec3,
  slerpWorldUnitVec3,
  TIMEZONE_SPINE_LAT_KNOTS,
  POLITICAL_TIMEZONE_SPINE_DELTAS,
  TIMEZONE_ANOMALY_HOTSPOTS,
  smoothTimezoneBoundarySpineLonLat,
  buildTimezoneBoundarySpineVec3,
  buildSphericalTimezoneBands,
  buildSphericalVariableWidthLinePolygon,
} from './utils/globe-geometry.js';
import { transitions, durations, easings, transitionVariables } from './config/transitions.js';
import {
  MUTATING_HEADER_META_KEY,
  MUTATING_HEADER_SPREAD_PRESETS,
  DEFAULT_HEADER_TIER_WIDTHS,
  resolveOptimalHeaderTier,
  pickAdaptiveHeaderLabel,
  normalizeHeaderSpread,
  parseFloatingVerticalMargins,
  computeHeaderCompressionMeta,
  useMutatingHeaderMeta,
} from './utils/mutatingHeader.js';
import {
  STORAGE_MODES,
  normalizeStorageMode,
  sanitizePrefixSegment,
  toAcronym,
  DEFAULT_ACRONYM_DICTIONARY,
  expandAcronymKey,
  detectHostAppPrefix,
  buildHierarchicalKey,
  createMemoryStorageAdapter,
  createStorageController,
  getGlobalStorageController,
  configureGlobalStorage,
  getScopedStorageController,
} from './utils/storage-controller.js';
import './style.css';

export {
  Ripple,
  Ripple as vRipple,
  computeRippleGeometry,
  NANO_UI_SOUND_PRESETS,
  CONTROL_ACOUSTIC_MASS_PROFILES,
  resolveControlAcousticMass,
  configureNanoUiSound,
  getNanoUiSoundConfig,
  resetNanoUiSoundConfig,
  useNanoUiSound,
  resolveComponentSoundConfig,
  playNanoUiSound,
  computeKnobDetentCrossings,
  computeSliderAcousticEvents,
  tooltipDirective,
  tooltipDirective as vTooltip,
  showTooltip,
  hideTooltip,
  tooltipState,
  buildTooltipBubbleGeometry,
  useDialog,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
  dialogState,
  GlobalTooltip,
  GlobalTooltip as NanoTooltip,
  NanoModal,
  NanoDialog,
  ThreeDDonutChart,
  PrecisionScrubber,
  TopologyRadar,
  MutatingHeader,
  MUTATING_HEADER_META_KEY,
  MUTATING_HEADER_SPREAD_PRESETS,
  DEFAULT_HEADER_TIER_WIDTHS,
  resolveOptimalHeaderTier,
  pickAdaptiveHeaderLabel,
  normalizeHeaderSpread,
  parseFloatingVerticalMargins,
  computeHeaderCompressionMeta,
  useMutatingHeaderMeta,
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
  NanoWelcomeHud,
  NanoWelcomeHud as WelcomeHud,
  NanoNumberStepper,
  NanoNumberStepper as NanoStepper,
  NanoTabs,
  NanoCheckbox,
  NanoSortableList,
  NanoDatePicker,
  NanoDatePicker as NanoCalendar,
  NanoSecretPipe,
  NanoSecretPipe as NanoPasswordTunnel,
  NanoCoverFlow,
  NanoCoverFlow as CoverFlow,
  NanoCoverFlow as NanoCarousel,
  NanoCollapsible,
  NanoCollapsible as NanoAccordion,
  NanoDropzone,
  DROPZONE_MODES,
  formatDropzoneBytes,
  matchesAcceptPattern,
  validateDroppedFiles,
  createDropzoneStateMachine,
  NanoTree,
  NanoFieldset,
  NanoLightbox,
  UNIX_TREE_GLYPHS,
  matchesTreeNodeQuery,
  filterUnixTreeNodes,
  collectExpandableTreeIds,
  flattenUnixTree,
  formatUnixAsciiTree,
  shouldPreventModalBackgroundScroll,
  lockModalBackgroundScroll,
  unlockModalBackgroundScroll,
  getActiveModalScrollLockCount,
  resetModalScrollLocks,
  computeBoundedCenterScroll,
  computeCenteredScrollLeft,
  computeCenteredScrollTop,
  computeBoundedCenterScroll2D,
  measureChildRelativeScrollGeometry,
  scrollElementToBoundedCenter,
  cancelBoundedCenterScroll,
  computeAvailableFillHeight,
  resolveFillHeightBoundary,
  measureElementFillHeight,
  useFillHeight,
  fillHeightDirective,
  fillHeightDirective as vFillHeight,
  DEFAULT_REARM_MOVE_THRESHOLD_PX,
  NANO_TRI_BORDER_STATES,
  resolveCoupledItemIds,
  resolveTriStateBorder,
  resolveTriStateBorderClasses,
  createCoupledSelectionMachine,
  useCoupledSelection,
  NON_TEXT_INPUT_TYPES,
  isEditableTextTarget,
  isNativeControlConflict,
  parseKeyCombo,
  createKeyController,
  getGlobalKeyController,
  stepWrappedIndex,
  isGroupOptionActive,
  isInteractiveGroupOptionElement,
  getGroupInteractiveChildren,
  resolveInteractiveDomGroup,
  stepInteractiveDomGroup,
  saveElementScrollPosition,
  readElementScrollPosition,
  restoreElementScroll,
  scrollPersistDirective,
  scrollPersistDirective as vScrollPersist,
  resolveCollapsibleConfig,
  evaluateSplitterSnapCollapse,
  computeVirtualCollapsedPaneStyles,
  resolveSplitterHitboxSizePx,
  computeSplitterProximityField,
  COVERFLOW_ORIENTATIONS,
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
  secretPipeDirective,
  secretPipeDirective as vSecretPipe,
  sanitizeSecretPaste,
  createSecretByteBuffer,
  PHI,
  INV_PHI,
  INV_PHI2,
  INV_PHI3,
  INV_PHI4,
  BAUHAUS_PHI_EXACT_TARGETS,
  BAUHAUS_PHI_2D_SPEC,
  NANO_UI_SONIC_LOGO_NSD,
  MATH_FORMULA_SWEEP_BANK,
  projectOrthographic3D,
  buildExtrudedSolid3D,
  computeLogoPerfectionScalar,
  computeFloating3DArtifacts,
  computeOrbitingMathTokens3D,
  computeStagePointerField,
  computeBauhausPhiScene3D,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  WEEKDAY_MONDAY_FIRST,
  formatIsoDate,
  parseIsoDate,
  getTodayIso,
  addDaysToIso,
  formatDisplayDate,
  isIsoDateDisabled,
  buildCalendarMonthGrid,
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  reorderArray,
  mutualRange,
  sumRange,
  diffRange,
  xorRange,
  measureRange,
  computeSharedArea2D,
  resolveSortableSlotByArea,
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
  projectRetainedTilesToViewport,
  computeMapScaleBar,
  haversineDistanceKm,
  computePolylineDistanceKm,
  computeGeoBounds,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
  normalizeMapPolygons,
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
  clamp,
  countStepDecimals,
  quantizeStepValue,
  normalizeAngle,
  shortestAngleDiff,
  NANO_COLOR_PRESETS,
  NANO_ACCENT_PRESETS,
  pickNanoPresetByPort,
  isNanoColorPreset,
  resolveNanoColor,
  getPerceivedLightness,
  getContrastTextColor,
  pickBestContrastColor,
  adjustLightness,
  getWcagContrastRatio,
  parseColor,
  rgbToOklch,
  oklchToLinearRgb,
  isOklchInSrgbGamut,
  getMaxOklchChroma,
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
  highlightGlsl,
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
  glslParser,
  GLSL_COMPLETIONS,
  detectLangFromPath,
  detectMediaTypeFromPath,
  extractSvgIntrinsicDimensions,
  formatFileSizeBytes,
  normalizeFileStatus,
  normalizeSvgPreviewMarkup,
  middleTruncatePath,
  parseUnifiedDiff,
  PREVIEW_MEDIA_TYPES,
  resolveEditorViewMode,
  compileNsdPreview,
  extractEmbeddedNsdSnippets,
  detectRenderedGridColumns,
  findSafeSelectMount,
  findSafeAncestorMount,
  computeSelectDropdownLayout,
  computeAdaptiveCardExpansion,
  getPositionedReferenceEl,
  clampFloatingBox2D,
  measureSafeStageBounds,
  SLIDER_THUMB_OVERHANG_BY_SIZE,
  getSliderThumbOverhangPx,
  resolveSliderSafeInsets,
  naturalSearch,
  computeMonospaceFittedFontSize,
  fitSvgTextSize,
  fitHtmlTextSize,
  fitCardContentToHeight,
  fitTextDirective,
  fitTextDirective as vFitText,
  CHANNEL_OSD_SHAPES,
  resolveChannelOsdMaxDigits,
  resolveChannelOsdBox,
  easeInOutCubic,
  computeSphericalLabelOpacity,
  computeSolarCosZenith,
  computeSolarIrradiance,
  computeSolarTwilightOpacity,
  buildSphericalCapSvgPath,
  buildSolarTerminatorSvgPrimitives,
  lonLatToWorldUnitVec3,
  slerpWorldUnitVec3,
  TIMEZONE_SPINE_LAT_KNOTS,
  POLITICAL_TIMEZONE_SPINE_DELTAS,
  TIMEZONE_ANOMALY_HOTSPOTS,
  smoothTimezoneBoundarySpineLonLat,
  buildTimezoneBoundarySpineVec3,
  buildSphericalTimezoneBands,
  buildSphericalVariableWidthLinePolygon,
  initTheme,
  useTheme,
  getNextTheme,
  useInertialStabilizer,
  createInertialStabilizerEngine,
  deviceOrientationToQuaternion,
  computeStabilizedWorldQuaternion,
  quatMultiply,
  quatConjugate,
  quatNormalize,
  quatSlerp,
  getZeroFoucScript,
  getZeroFoucStyle,
  getZeroFoucHtml,
  transitions,
  durations,
  easings,
  transitionVariables,
  STORAGE_MODES,
  normalizeStorageMode,
  sanitizePrefixSegment,
  toAcronym,
  DEFAULT_ACRONYM_DICTIONARY,
  expandAcronymKey,
  detectHostAppPrefix,
  buildHierarchicalKey,
  createMemoryStorageAdapter,
  createStorageController,
  getGlobalStorageController,
  configureGlobalStorage,
  getScopedStorageController,
};

export const version = pkg.version;

export const nanoCompilerOptions = {
  isPreTag: tag => tag === 'pre' || tag === 'NanoCodeBlock' || tag === 'nano-code-block',
};

export default {
  version: pkg.version,
  install(app, { directivePrefix = '', componentPrefix = '', appPrefix = '', storageMode, sound } = {}) {
    if (appPrefix || storageMode !== undefined) {
      configureGlobalStorage({ appPrefix, defaultMode: storageMode });
    }
    if (sound !== undefined) {
      configureNanoUiSound(sound);
    }
    const dp = directivePrefix ? `${directivePrefix}-` : '';
    const cp = componentPrefix ? `${componentPrefix}` : '';

    app.directive(`${dp}ripple`, Ripple);
    app.directive(`${dp}tooltip`, tooltipDirective);
    app.directive(`${dp}secret-pipe`, secretPipeDirective);
    app.directive(`${dp}fill-height`, fillHeightDirective);
    app.directive(`${dp}fit-text`, fitTextDirective);
    app.directive(`${dp}scroll-persist`, scrollPersistDirective);

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
    app.component(`${cp}NanoWelcomeHud`, NanoWelcomeHud);
    app.component(`${cp}WelcomeHud`, NanoWelcomeHud);
    app.component(`${cp}NanoNumberStepper`, NanoNumberStepper);
    app.component(`${cp}NanoStepper`, NanoNumberStepper);
    app.component(`${cp}NanoTabs`, NanoTabs);
    app.component(`${cp}NanoCheckbox`, NanoCheckbox);
    app.component(`${cp}NanoSortableList`, NanoSortableList);
    app.component(`${cp}NanoDatePicker`, NanoDatePicker);
    app.component(`${cp}NanoCalendar`, NanoDatePicker);
    app.component(`${cp}NanoSecretPipe`, NanoSecretPipe);
    app.component(`${cp}NanoPasswordTunnel`, NanoSecretPipe);
    app.component(`${cp}NanoCoverFlow`, NanoCoverFlow);
    app.component(`${cp}CoverFlow`, NanoCoverFlow);
    app.component(`${cp}NanoCarousel`, NanoCoverFlow);
    app.component(`${cp}NanoCollapsible`, NanoCollapsible);
    app.component(`${cp}NanoAccordion`, NanoCollapsible);
    app.component(`${cp}NanoDropzone`, NanoDropzone);
    app.component(`${cp}NanoTree`, NanoTree);
    app.component(`${cp}NanoFieldset`, NanoFieldset);
    app.component(`${cp}NanoLightbox`, NanoLightbox);
  },
};
