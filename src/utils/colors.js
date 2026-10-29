import { normalizeAngle } from './math.js';

const toStringTag = (val) => Object.prototype.toString.call(val);
const isString = (val) => toStringTag(val) === '[object String]';
const isObject = (val) => val !== null && toStringTag(val) === '[object Object]';

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

/**
 * Converts a single sRGB channel in [0, 1] to linear-light sRGB.
 *
 * @param {number} c - Normalized sRGB channel in [0, 1]
 * @returns {number} Linear-light value in [0, 1]
 */
export const srgbToLinear = (c) => {
  const v = clamp(c, 0, 1);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/**
 * Converts a single linear-light channel in [0, 1] to gamma-encoded sRGB.
 *
 * @param {number} c - Linear-light channel
 * @returns {number} Normalized sRGB value in [0, 1]
 */
export const linearToSrgb = (c) => {
  const v = clamp(c, 0, 1);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
};

/**
 * Converts 8-bit sRGB channels (0-255) to OKLCH { l, c, h } using Björn Ottosson's Oklab model.
 *
 * @param {number} r255 - Red [0, 255]
 * @param {number} g255 - Green [0, 255]
 * @param {number} b255 - Blue [0, 255]
 * @returns {{ l: number, c: number, h: number }}
 */
export const rgbToOklch = (r255, g255, b255) => {
  const r = srgbToLinear(r255 / 255);
  const g = srgbToLinear(g255 / 255);
  const b = srgbToLinear(b255 / 255);

  const lCone = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const mCone = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const sCone = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(lCone);
  const mRoot = Math.cbrt(mCone);
  const sRoot = Math.cbrt(sCone);

  const L = clamp(0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot, 0, 1);
  const a = 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot;
  const bOk = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot;

  const C = Math.max(0, Math.sqrt(a * a + bOk * bOk));
  const H = C < 1e-6 ? 0 : normalizeAngle((Math.atan2(bOk, a) * 180) / Math.PI);

  return { l: L, c: C, h: H };
};

/**
 * Converts OKLCH { l, c, h } to 8-bit sRGB { r, g, b }.
 *
 * @param {number} l - Perceptual lightness in [0, 1]
 * @param {number} c - Chroma >= 0
 * @param {number} h - Hue angle in degrees [0, 360)
 * @returns {{ r: number, g: number, b: number }}
 */
export const oklchToRgb = (l, c, h) => {
  const L = clamp(l, 0, 1);
  const C = Math.max(0, c);
  const hRad = (normalizeAngle(h) * Math.PI) / 180;

  const a = C * Math.cos(hRad);
  const bOk = C * Math.sin(hRad);

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * bOk;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * bOk;
  const sRoot = L - 0.0894841775 * a - 1.2914855480 * bOk;

  const lCone = lRoot * lRoot * lRoot;
  const mCone = mRoot * mRoot * mRoot;
  const sCone = sRoot * sRoot * sRoot;

  const rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  const gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  const bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.7076147010 * sCone;

  return {
    r: Math.round(linearToSrgb(rLin) * 255),
    g: Math.round(linearToSrgb(gLin) * 255),
    b: Math.round(linearToSrgb(bLin) * 255),
  };
};

/**
 * Converts HSL { h, s, l } (h in [0, 360), s & l in [0, 1]) to 8-bit sRGB { r, g, b }.
 *
 * @param {number} h - Hue in degrees
 * @param {number} s - Saturation in [0, 1]
 * @param {number} l - Lightness in [0, 1]
 * @returns {{ r: number, g: number, b: number }}
 */
export const hslToRgb = (h, s, l) => {
  const hue = normalizeAngle(h);
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
};

/**
 * Parses a color string or object in HEX (3/4/6/8 chars), RGB/RGBA, HSL/HSLA, or OKLCH format
 * into a unified representation containing both 8-bit sRGB and OKLCH coordinates.
 *
 * @param {string|Object} color - Input color value
 * @returns {{ r: number, g: number, b: number, l: number, c: number, h: number } | null}
 */
export const parseColor = (color) => {
  if (!color) return null;

  if (isObject(color)) {
    if (Number.isFinite(color.l) && Number.isFinite(color.c) && Number.isFinite(color.h)) {
      const l = clamp(color.l, 0, 1);
      const c = Math.max(0, color.c);
      const h = normalizeAngle(color.h);
      const rgb = oklchToRgb(l, c, h);
      return { ...rgb, l, c, h };
    }
    if (Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) {
      const r = clamp(Math.round(color.r), 0, 255);
      const g = clamp(Math.round(color.g), 0, 255);
      const b = clamp(Math.round(color.b), 0, 255);
      const oklch = rgbToOklch(r, g, b);
      return { r, g, b, ...oklch };
    }
    return null;
  }

  if (!isString(color)) return null;
  const raw = color.trim();
  if (!raw) return null;

  // 1. HEX (#rgb, #rgba, #rrggbb, #rrggbbaa)
  const hexMatch = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    let r = 0;
    let g = 0;
    let b = 0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    const oklch = rgbToOklch(r, g, b);
    return { r, g, b, ...oklch };
  }

  // 2. OKLCH: oklch(L C H) or oklch(L, C, H)
  const oklchMatch = raw.match(/^oklch\(\s*([^\s,/)]+)[\s,]+([^\s,/)]+)[\s,]+([^\s,/)]+)/i);
  if (oklchMatch) {
    const lRaw = oklchMatch[1];
    const cRaw = oklchMatch[2];
    const hRaw = oklchMatch[3];

    let l = parseFloat(lRaw);
    if (lRaw.endsWith('%')) l /= 100;

    let c = parseFloat(cRaw);
    if (cRaw.endsWith('%')) c = (c * 0.4) / 100;

    let h = parseFloat(hRaw);
    if (hRaw.endsWith('rad')) {
      h = (h * 180) / Math.PI;
    } else if (hRaw.endsWith('turn')) {
      h *= 360;
    }

    if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) return null;
    const normL = clamp(l, 0, 1);
    const normC = Math.max(0, c);
    const normH = normalizeAngle(h);
    const rgb = oklchToRgb(normL, normC, normH);
    return { ...rgb, l: normL, c: normC, h: normH };
  }

  // 3. RGB / RGBA: rgb(r, g, b) or rgb(r g b)
  const rgbMatch = raw.match(/^rgba?\(\s*([^\s,/)]+)[\s,]+([^\s,/)]+)[\s,]+([^\s,/)]+)/i);
  if (rgbMatch) {
    const parseChannel = (token) => {
      const val = parseFloat(token);
      if (!Number.isFinite(val)) return NaN;
      return token.endsWith('%') ? clamp(Math.round((val / 100) * 255), 0, 255) : clamp(Math.round(val), 0, 255);
    };
    const r = parseChannel(rgbMatch[1]);
    const g = parseChannel(rgbMatch[2]);
    const b = parseChannel(rgbMatch[3]);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
    const oklch = rgbToOklch(r, g, b);
    return { r, g, b, ...oklch };
  }

  // 4. HSL / HSLA: hsl(h, s%, l%) or hsl(h s% l%)
  const hslMatch = raw.match(/^hsla?\(\s*([^\s,/)]+)[\s,]+([^\s,/)]+)[\s,]+([^\s,/)]+)/i);
  if (hslMatch) {
    let h = parseFloat(hslMatch[1]);
    if (hslMatch[1].endsWith('rad')) {
      h = (h * 180) / Math.PI;
    } else if (hslMatch[1].endsWith('turn')) {
      h *= 360;
    }
    const sRaw = hslMatch[2];
    const lRaw = hslMatch[3];
    let s = parseFloat(sRaw);
    if (sRaw.endsWith('%') || s > 1) s /= 100;
    let l = parseFloat(lRaw);
    if (lRaw.endsWith('%') || l > 1) l /= 100;

    if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
    const rgb = hslToRgb(h, s, l);
    const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
    return { ...rgb, ...oklch };
  }

  return null;
};

/**
 * Formats parsed color or raw color into a 6-character HEX string (#rrggbb).
 *
 * @param {string|Object} color - Input color
 * @returns {string}
 */
export const formatHex = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return '#000000';
  const toHexByte = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHexByte(parsed.r)}${toHexByte(parsed.g)}${toHexByte(parsed.b)}`;
};

/**
 * Formats parsed color or raw color into a CSS rgb(r, g, b) string.
 *
 * @param {string|Object} color - Input color
 * @returns {string}
 */
export const formatRgb = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return 'rgb(0, 0, 0)';
  return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
};

/**
 * Formats parsed color or raw color into a CSS oklch(L C H) string.
 *
 * @param {string|Object} color - Input color
 * @returns {string}
 */
export const formatOklch = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return 'oklch(0 0 0)';
  const l = Number(parsed.l.toFixed(3));
  const c = Number(parsed.c.toFixed(3));
  const h = Number(parsed.h.toFixed(1));
  return `oklch(${l} ${c} ${h})`;
};

/**
 * Computes standardized perceptual lightness L in [0, 1] using the Oklab/OKLCH color space.
 * Supports HEX (#rgb, #rrggbb), RGB, HSL, and OKLCH inputs.
 *
 * @param {string|Object} color - Input color
 * @returns {number} Perceptual lightness in [0, 1]
 */
export const getPerceivedLightness = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return 0;
  return clamp(parsed.l, 0, 1);
};

/**
 * Computes relative luminance Y in [0, 1] according to WCAG 2.1.
 *
 * @param {string|Object} color - Input color
 * @returns {number} Relative luminance in [0, 1]
 */
export const getRelativeLuminance = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return 0;
  const r = srgbToLinear(parsed.r / 255);
  const g = srgbToLinear(parsed.g / 255);
  const b = srgbToLinear(parsed.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Computes the WCAG 2.1 contrast ratio between two colors in [1, 21].
 *
 * @param {string|Object} c1 - First color
 * @param {string|Object} c2 - Second color
 * @returns {number} Contrast ratio >= 1
 */
export const getWcagContrastRatio = (c1, c2) => {
  const y1 = getRelativeLuminance(c1);
  const y2 = getRelativeLuminance(c2);
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Computes perceived brightness in [0, 1] using Darel Rex Finley's HSP model.
 *
 * @param {string|Object} color - Input color
 * @returns {number} HSP brightness in [0, 1]
 */
export const getHspBrightness = (color) => {
  const parsed = parseColor(color);
  if (!parsed) return 0;
  const { r, g, b } = parsed;
  return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b) / 255;
};

/**
 * Returns the optimal contrasting text color (`light` or `dark`) for a given background color.
 *
 * @param {string|Object} bgColor - Background color (HEX, RGB, HSL, OKLCH)
 * @param {Object} [options]
 * @param {string} [options.light='#ffffff'] - Light text token
 * @param {string} [options.dark='#0b0f17'] - Dark text token
 * @param {number} [options.threshold=0.62] - Lightness threshold in [0, 1]
 * @param {'oklch'|'wcag'|'hsp'} [options.model='oklch'] - Contrast evaluation model
 * @returns {string} Selected text color (`light` or `dark`)
 */
export const getContrastTextColor = (bgColor, options = {}) => {
  const {
    light = '#ffffff',
    dark = '#0b0f17',
    threshold = 0.62,
    model = 'oklch',
  } = options || {};

  if (model === 'wcag') {
    const lightRatio = getWcagContrastRatio(bgColor, light);
    const darkRatio = getWcagContrastRatio(bgColor, dark);
    return darkRatio >= lightRatio ? dark : light;
  }

  if (model === 'hsp') {
    const hsp = getHspBrightness(bgColor);
    const hasCustomThreshold = isObject(options) && Object.prototype.hasOwnProperty.call(options, 'threshold');
    const effThreshold = threshold > 1 ? threshold / 255 : (hasCustomThreshold ? threshold : 0.5);
    return hsp >= effThreshold ? dark : light;
  }

  const l = getPerceivedLightness(bgColor);
  return l >= threshold ? dark : light;
};

/**
 * Selects the color with the highest contrast against `bgColor` from `candidatePalette`.
 *
 * @param {string|Object} bgColor - Background color
 * @param {Array<string>} candidatePalette - Array of candidate text/foreground colors
 * @param {Object} [options]
 * @param {number} [options.minRatio=0] - Optional minimum WCAG contrast ratio (e.g. 4.5 for AA, 7.0 for AAA)
 * @param {string|null} [options.fallback=undefined] - Fallback color when no candidate meets minRatio
 * @returns {string|null} Best contrasting color from the palette
 */
export const pickBestContrastColor = (bgColor, candidatePalette = [], options = {}) => {
  const { minRatio = 0, fallback = undefined } = options || {};
  if (!Array.isArray(candidatePalette) || candidatePalette.length === 0) {
    return fallback !== undefined ? fallback : getContrastTextColor(bgColor);
  }

  const bgL = getPerceivedLightness(bgColor);
  let bestColor = candidatePalette[0];
  let bestRatio = -1;
  let bestDeltaL = -1;

  for (let i = 0; i < candidatePalette.length; i++) {
    const candidate = candidatePalette[i];
    if (!parseColor(candidate)) continue;

    const ratio = getWcagContrastRatio(bgColor, candidate);
    const deltaL = Math.abs(getPerceivedLightness(candidate) - bgL);

    if (ratio > bestRatio + 1e-6 || (Math.abs(ratio - bestRatio) <= 1e-6 && deltaL > bestDeltaL)) {
      bestRatio = ratio;
      bestDeltaL = deltaL;
      bestColor = candidate;
    }
  }

  if (minRatio > 0 && bestRatio < minRatio) {
    return fallback !== undefined ? fallback : getContrastTextColor(bgColor);
  }

  return bestColor;
};

/**
 * Adjusts perceptual lightness L in OKLCH by `deltaL` while preserving Hue (H) and Chroma (C).
 *
 * @param {string|Object} color - Input color
 * @param {number} deltaL - Lightness shift in [-1, 1]
 * @param {Object} [options]
 * @param {'oklch'|'hex'|'rgb'} [options.format='oklch'] - Output color format
 * @returns {string} Adjusted color string
 */
export const adjustLightness = (color, deltaL = 0, { format = 'oklch' } = {}) => {
  const parsed = parseColor(color);
  if (!parsed) return format === 'hex' ? '#000000' : format === 'rgb' ? 'rgb(0, 0, 0)' : 'oklch(0 0 0)';

  const nextL = clamp(parsed.l + (Number.isFinite(deltaL) ? deltaL : 0), 0, 1);
  const adjusted = { l: nextL, c: parsed.c, h: parsed.h };

  if (format === 'hex') return formatHex(adjusted);
  if (format === 'rgb') return formatRgb(adjusted);
  return formatOklch(adjusted);
};
