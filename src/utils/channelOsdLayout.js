import { naturalSearch } from './fitText.js';

export const CHANNEL_OSD_SHAPES = Object.freeze(['rect', 'square']);

/**
 * Resolves the effective digit sequence capacity for `<NanoChannelOsd>`.
 * Defaults to the decimal digit length of `max` (minimum 2 for classic 01..99 tuners)
 * unless an explicit positive `maxDigits` prop is supplied.
 *
 * @param {Object} params
 * @param {number} [params.max=99] Maximum valid channel number
 * @param {number} [params.maxDigits] Optional explicit digit buffer length
 * @returns {number}
 */
export function resolveChannelOsdMaxDigits({ max = 99, maxDigits } = {}) {
  const explicit = Math.trunc(Number(maxDigits) || 0);
  if (explicit > 0) return explicit;
  const safeMax = Math.max(1, Math.trunc(Number(max) || 99));
  return Math.max(2, String(safeMax).length);
}

/**
 * Computes deterministic, subpixel-crisp (`2px` quantized) container dimensions and
 * typography tokens for `<NanoChannelOsd>` using `naturalSearch` (exponential galloping
 * + binary bisection in O(log N)).
 *
 * Supports two geometric strategies for 3+ digit channels (`> 99`) and subtitles:
 * - `'rect'` (default): keeps vertical height compact (`height = baseSize`) and widens
 *   horizontally (`aspect-ratio >= 1:1`) so 3–5 digit channels (`016`, `1024`) and
 *   subtitles breathe without obscuring vertical viewport space.
 * - `'square'`: expands both width and height uniformly (`width === height >= baseSize`,
 *   strict `1:1` aspect ratio) so the glass badge remains an exact square at any digit count.
 *
 * For 1–2 digit channels (`max <= 99`) without wide subtitles, both modes resolve to the
 * exact same `baseSize x baseSize` (`1:1`) square for 100% backward compatibility.
 *
 * @param {Object} params
 * @param {number} [params.size=140] Base HUD size in pixels (clamped >= 72)
 * @param {string|number} [params.displayText=''] Currently displayed digit/channel string
 * @param {number} [params.max=99] Maximum valid channel number
 * @param {number} [params.maxDigits] Optional explicit digit capacity
 * @param {string} [params.subtitle=''] Optional channel title/subtitle below digits
 * @param {'rect'|'square'} [params.shape='rect'] Expansion geometry ('rect' or 'square')
 * @param {boolean} [params.stabilizeCapacity=true] Lock width to `maxDigits` capacity so typing 1 -> 12 -> 128 has CLS = 0
 * @param {number} [params.maxWidthPx=560] Upper horizontal safety ceiling in pixels
 * @returns {{
 *   widthPx: number,
 *   heightPx: number,
 *   fontSizePx: number,
 *   borderRadiusPx: number,
 *   effectiveDigits: number,
 *   aspectRatio: number,
 *   shape: 'rect' | 'square'
 * }}
 */
export function resolveChannelOsdBox({
  size = 140,
  displayText = '',
  max = 99,
  maxDigits,
  subtitle = '',
  shape = 'rect',
  stabilizeCapacity = true,
  maxWidthPx = 560,
} = {}) {
  const rawSize = Math.max(72, Number(size) || 140);
  // Quantize to even pixels so translate(-50%, -50%) never lands on a half-pixel blur
  const baseSize = Math.round(rawSize / 2) * 2;
  const resolvedShape = shape === 'square' ? 'square' : 'rect';

  const cleanSub = String(subtitle || '').trim();
  const hasSubtitle = cleanSub.length > 0;

  const capacityDigits = resolveChannelOsdMaxDigits({ max, maxDigits });
  const textLen = String(displayText ?? '').trim().length;
  const effectiveDigits = Math.max(
    2,
    stabilizeCapacity ? Math.max(capacityDigits, textLen) : textLen
  );

  const fontSizePx = Math.round(baseSize * (hasSubtitle ? 0.56 : 0.6));
  const borderRadiusPx = Math.round(baseSize * 0.17);

  // Tabular Inter/system-ui 600 weight advance at letter-spacing: -0.03em is ~0.57 * fontSize.
  // Optical side padding is 0.15 * baseSize per side (0.30 * baseSize total), so 2 digits
  // require ~0.984 * baseSize <= baseSize (exact 1:1 square), while 3+ digits smoothly widen.
  const digitAdvancePx = fontSizePx * 0.57;
  const horizontalPadPx = baseSize * (effectiveDigits > 2 ? 0.34 : 0.3);
  const digitsRequiredWidth = Math.ceil(effectiveDigits * digitAdvancePx + horizontalPadPx);

  // Bounded subtitle breathing floor (only widens gently up to 1.58x in 'rect' or 1.35x in 'square'
  // when 3+ digits or a meaningful subtitle is present, preventing long titles from spanning screen)
  let subtitleFloorPx = 0;
  if (hasSubtitle && (effectiveDigits > 2 || cleanSub.length > 14)) {
    const capFactor = resolvedShape === 'rect' ? 1.56 : 1.32;
    const estimatedSubPx = Math.round(cleanSub.length * 7.1 + baseSize * 0.24);
    subtitleFloorPx = Math.min(Math.round(baseSize * capFactor), estimatedSubPx);
  }

  const targetWidthPx = Math.max(baseSize, digitsRequiredWidth, subtitleFloorPx);
  const upperCap = Math.max(baseSize, Math.round((Number(maxWidthPx) || 560) / 2) * 2);
  const maxSteps = Math.max(2, Math.ceil((upperCap - baseSize) / 2) + 2);

  // Use naturalSearch over 2px-quantized natural steps n >= 1: candidateWidth(n) = baseSize + (n - 1) * 2
  const fittingStep = naturalSearch(
    (n) => {
      const candidateW = baseSize + (n - 1) * 2;
      return candidateW >= targetWidthPx || candidateW >= upperCap;
    },
    true,
    maxSteps
  );

  const widthPx = Math.min(upperCap, baseSize + Math.max(0, fittingStep - 1) * 2);
  const heightPx = resolvedShape === 'square' ? widthPx : baseSize;

  return {
    widthPx,
    heightPx,
    fontSizePx,
    borderRadiusPx,
    effectiveDigits,
    aspectRatio: Number((widthPx / heightPx).toFixed(3)),
    shape: resolvedShape,
  };
}
