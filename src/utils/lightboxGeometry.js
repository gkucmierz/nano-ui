import { clamp } from './math.js';

const objTag = (v) => Object.prototype.toString.call(v);
const isNum = (v) => objTag(v) === '[object Number]' && Number.isFinite(v);
const isStr = (v) => objTag(v) === '[object String]';

const ROOT_SVG_OPEN_TAG_RE = /<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/i;

const readSvgTagAttr = (openTag, attrName) => {
  const re = new RegExp(`(?<![-\\w:])${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"'=]+))`, 'i');
  const match = openTag.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
};

const setOrReplaceSvgTagAttr = (openTag, attrName, attrValue) => {
  const attrRe = new RegExp(`(?<![-\\w:])${attrName}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>"'=]+)`, 'i');
  if (attrRe.test(openTag)) {
    return openTag.replace(attrRe, `${attrName}="${attrValue}"`);
  }
  return openTag.replace(/(\/?)>$/, ` ${attrName}="${attrValue}"$1>`);
};

const parseExplicitSvgLength = (rawVal) => {
  if (!isStr(rawVal)) return 0;
  const trimmed = rawVal.trim();
  if (!trimmed || trimmed.endsWith('%')) return 0;
  const match = trimmed.match(/^\+?(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Extracts intrinsic `{ width, height, aspectRatio }` from a root `<svg>` tag's
 * `viewBox="minX minY width height"` attribute (supporting whitespace/comma separators,
 * negative `minX`/`minY`, and decimals), falling back to explicit numeric `width` and
 * `height` attributes on `<svg>` (ignoring `%` values such as `width="100%"`), or `null`.
 */
export const parseSvgViewBoxDimensions = (svgMarkup = '') => {
  if (!isStr(svgMarkup) || !svgMarkup) return null;
  const openMatch = svgMarkup.match(ROOT_SVG_OPEN_TAG_RE);
  if (!openMatch) return null;
  const openTag = openMatch[0];

  const rawViewBox = readSvgTagAttr(openTag, 'viewBox');
  if (isStr(rawViewBox) && rawViewBox.trim()) {
    const nums = rawViewBox.trim().match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi);
    if (nums && nums.length >= 4) {
      const minX = Number(nums[0]);
      const minY = Number(nums[1]);
      const width = Number(nums[2]);
      const height = Number(nums[3]);
      if (
        Number.isFinite(minX) &&
        Number.isFinite(minY) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        return {
          width,
          height,
          aspectRatio: width / height,
        };
      }
    }
  }

  const width = parseExplicitSvgLength(readSvgTagAttr(openTag, 'width'));
  const height = parseExplicitSvgLength(readSvgTagAttr(openTag, 'height'));
  if (width > 0 && height > 0) {
    return {
      width,
      height,
      aspectRatio: width / height,
    };
  }

  return null;
};

/**
 * Normalizes inline `<svg>` markup for crisp responsive rendering inside `<NanoLightbox>`:
 * 1. Strips inline `max-width` / `max-height` from the root `<svg>` `style` attribute
 *    (e.g. Mermaid v11's `style="max-width: 694px;"`).
 * 2. Synthesizes `viewBox="0 0 W H"` when missing and explicit numeric `width`/`height` exist.
 * 3. Ensures root `<svg>` has `width="100%"`, `height="100%"`, and `preserveAspectRatio="xMidYMid meet"`.
 * 4. Safely suffixes internal `id="..."` attributes and matching references (`url(#...)`,
 *    `href="#..."`, `xlink:href="#..."`, `aria-labelledby`, and `<style>` `#id` selectors)
 *    with `-${uniqueSuffix}` so `<marker>` arrowheads, gradients, and clipPaths never collide
 *    with inline `<svg>` instances on the underlying document.
 */
/**
 * Strips executable elements (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<audio>`, `<video>`),
 * inline event handlers (`on*`), dangerous SMIL attribute targets, and external/javascript: URLs
 * from raw SVG markup before rendering via `v-html` (while preserving Mermaid `<foreignObject>` HTML labels safely).
 */
export const sanitizeLightboxSvgMarkup = (rawSvg = '') => {
  if (!isStr(rawSvg) || !rawSvg.trim()) return '';
  let clean = rawSvg
    // Strip dangerous executable container tags with content
    .replace(/<\s*(script|iframe|object|embed|applet|audio|video|portal|base|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Strip self-closing or unclosed dangerous tags
    .replace(/<\s*\/?\s*(script|iframe|object|embed|applet|audio|video|portal|base|meta)\b[^>]*\/?>/gi, '')
    // Strip SMIL <set> / <animate*> tags that mutate href / xlink:href / on* attributes
    .replace(/<\s*(?:set|animate|animateTransform|animateMotion)\b[^>]*\battributeName\s*=\s*(?:"\s*(?:(?:xlink:)?href|on\w+)\s*"|'\s*(?:(?:xlink:)?href|on\w+)\s*'|(?:xlink:)?href|on\w+)[^>]*\/?>/gi, '')
    // Strip all inline event handler attributes (onload, onerror, onbegin, onclick, etc.)
    .replace(/\s+(?<![-\w:])on[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"'=]+)/gi, '')
    // Neutralize javascript: / vbscript: / data:text/html inside href, xlink:href, src, action, formaction
    .replace(
      /\s+((?:xlink:)?href|src|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"'=]+))/gi,
      (full, attrName, dq, sq, bare) => {
        const val = String(dq ?? sq ?? bare ?? '').trim();
        const normalizedVal = val.replace(/[\x00-\x20]+/g, '').toLowerCase();
        if (
          normalizedVal.startsWith('javascript:') ||
          normalizedVal.startsWith('vbscript:') ||
          (normalizedVal.startsWith('data:') && !/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(normalizedVal))
        ) {
          return '';
        }
        return full;
      }
    )
    // Neutralize CSS url(javascript:...) / expression(...) inside style attributes or <style>
    .replace(/url\(\s*(['"]?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^)]*\)/gi, 'url(#blocked)');
  return clean;
};

export const normalizeLightboxSvgMarkup = (svgMarkup = '', uniqueSuffix = 'lb') => {
  if (!isStr(svgMarkup) || !svgMarkup.trim()) return '';
  const sanitizedInput = sanitizeLightboxSvgMarkup(svgMarkup);
  const openMatch = sanitizedInput.match(ROOT_SVG_OPEN_TAG_RE);
  if (!openMatch) return '';

  let nextOpenTag = openMatch[0];

  if (!readSvgTagAttr(nextOpenTag, 'viewBox')) {
    const explicitDims = parseSvgViewBoxDimensions(nextOpenTag);
    if (explicitDims && explicitDims.width > 0 && explicitDims.height > 0) {
      nextOpenTag = setOrReplaceSvgTagAttr(
        nextOpenTag,
        'viewBox',
        `0 0 ${explicitDims.width} ${explicitDims.height}`
      );
    }
  }

  const rawStyle = readSvgTagAttr(nextOpenTag, 'style');
  if (isStr(rawStyle)) {
    const keptDecls = rawStyle
      .split(';')
      .map((decl) => decl.trim())
      .filter((decl) => {
        if (!decl) return false;
        const prop = decl.split(':')[0]?.trim().toLowerCase();
        return prop !== 'max-width' && prop !== 'max-height';
      });
    const styleAttrRe = /\s*(?<![-\w:])style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"'=]+)/i;
    if (keptDecls.length > 0) {
      nextOpenTag = nextOpenTag.replace(styleAttrRe, ` style="${keptDecls.join('; ')};"`);
    } else {
      nextOpenTag = nextOpenTag.replace(styleAttrRe, '');
    }
  }

  nextOpenTag = setOrReplaceSvgTagAttr(nextOpenTag, 'width', '100%');
  nextOpenTag = setOrReplaceSvgTagAttr(nextOpenTag, 'height', '100%');
  nextOpenTag = setOrReplaceSvgTagAttr(nextOpenTag, 'preserveAspectRatio', 'xMidYMid meet');

  let normalized =
    sanitizedInput.slice(0, openMatch.index) +
    nextOpenTag +
    sanitizedInput.slice(openMatch.index + openMatch[0].length);

  const safeSuffix = isStr(uniqueSuffix)
    ? uniqueSuffix.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
    : '';

  if (!safeSuffix) {
    return normalized;
  }

  const idAttrRe = /(?<![-\w:])id\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  const declaredIds = new Set();
  for (const m of normalized.matchAll(idAttrRe)) {
    const rawId = (m[1] ?? m[2] ?? '').trim();
    if (rawId) declaredIds.add(rawId);
  }

  if (declaredIds.size === 0) {
    return normalized;
  }

  normalized = normalized.replace(idAttrRe, (full, dq, sq) => {
    const rawId = (dq ?? sq ?? '').trim();
    if (!rawId || !declaredIds.has(rawId)) return full;
    const quote = dq !== undefined ? '"' : "'";
    return `id=${quote}${rawId}-${safeSuffix}${quote}`;
  });

  normalized = normalized.replace(
    /url\(\s*(["']?)#([^)\s"']+)\1\s*\)/gi,
    (full, quote, refId) => (declaredIds.has(refId) ? `url(${quote}#${refId}-${safeSuffix}${quote})` : full)
  );

  normalized = normalized.replace(
    /(?<![-\w:])((?:xlink:)?href)\s*=\s*(?:"(?:#([^"]+))"|'(?:#([^']+))')/gi,
    (full, attrName, dqRef, sqRef) => {
      const refId = (dqRef ?? sqRef ?? '').trim();
      if (!declaredIds.has(refId)) return full;
      const quote = dqRef !== undefined ? '"' : "'";
      return `${attrName}=${quote}#${refId}-${safeSuffix}${quote}`;
    }
  );

  normalized = normalized.replace(
    /(?<![-\w:])(aria-(?:labelledby|describedby))\s*=\s*(?:"([^"]+)"|'([^']+)')/gi,
    (full, attrName, dqVal, sqVal) => {
      const rawVal = dqVal ?? sqVal ?? '';
      const quote = dqVal !== undefined ? '"' : "'";
      const updated = rawVal
        .split(/(\s+)/)
        .map((tok) => (declaredIds.has(tok) ? `${tok}-${safeSuffix}` : tok))
        .join('');
      return `${attrName}=${quote}${updated}${quote}`;
    }
  );

  normalized = normalized.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (full, openStyle, cssBody, closeStyle) => {
      const rewrittenCss = cssBody.replace(/([^{}]+)\{/g, (_selChunk, selectorList) => {
        const updatedSelectors = selectorList.replace(
          /#([A-Za-z_][\w-]*)/g,
          (idMatch, selId) => (declaredIds.has(selId) ? `#${selId}-${safeSuffix}` : idMatch)
        );
        return `${updatedSelectors}{`;
      });
      return `${openStyle}${rewrittenCss}${closeStyle}`;
    }
  );

  return normalized;
};

/**
 * Parses an explicit aspect ratio (`16 / 9`, `"16/9"`, `"16:9"`, `"1.6"`, or `{ width, height }`)
 * into a positive finite `width / height` ratio, or `null` if unspecified/invalid.
 */
export const parseLightboxAspectRatio = (rawAspect, fallbackWidth = 0, fallbackHeight = 0) => {
  if (isNum(rawAspect) && rawAspect > 0) {
    return rawAspect;
  }
  if (isStr(rawAspect)) {
    const trimmed = rawAspect.trim();
    const ratioMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[/:x×]\s*(\d+(?:\.\d+)?)$/i);
    if (ratioMatch) {
      const w = Number(ratioMatch[1]);
      const h = Number(ratioMatch[2]);
      if (w > 0 && h > 0) return w / h;
    }
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum) && asNum > 0) return asNum;
  }
  const fw = Number(fallbackWidth);
  const fh = Number(fallbackHeight);
  if (Number.isFinite(fw) && fw > 0 && Number.isFinite(fh) && fh > 0) {
    return fw / fh;
  }
  return null;
};

/**
 * Computes responsive, margin-aware Lightbox media & stage bounds.
 *
 * - In standard mode (`zoomed === false`): comfortable centered modal framing (`<= 1140x780`).
 * - In expanded screen-fit mode (`zoomed === true`, triggered via `+` button / image click):
 *   expands onto the maximum available viewport area while strictly respecting:
 *   1. Sensible outer viewport margins (`marginX`, `marginY`),
 *   2. Toolbar + caption/pills chrome height (`chromeHeight`), and
 *   3. Exact content `aspectRatio` (`width / height`) whenever known (e.g. raster image
 *      `naturalWidth / naturalHeight`, SVG `viewBox`, or `item.aspectRatio`), contain-fitting
 *      without distortion, stretching, or awkward internal scrollbars.
 */
export const computeLightboxStageGeometry = ({
  viewportWidth = 1440,
  viewportHeight = 900,
  zoomed = false,
  aspectRatio = null,
  naturalWidth = 0,
  naturalHeight = 0,
  hasFooter = true,
  isVector = false,
} = {}) => {
  const vw = Math.max(320, Number(viewportWidth) || 1440);
  const vh = Math.max(280, Number(viewportHeight) || 900);
  const isCompactViewport = vw < 768 || vh < 560;

  const marginX = zoomed
    ? isCompactViewport
      ? 12
      : clamp(Math.round(vw * 0.03), 24, 48)
    : isCompactViewport
      ? 16
      : clamp(Math.round(vw * 0.06), 32, 80);

  const marginY = zoomed
    ? isCompactViewport
      ? 12
      : clamp(Math.round(vh * 0.03), 20, 40)
    : isCompactViewport
      ? 16
      : clamp(Math.round(vh * 0.06), 28, 64);

  const framePaddingX = 28; // 14px left + 14px right
  const chromeHeight = hasFooter ? 124 : 80; // frame top/bottom padding + toolbar (38px) + gaps + footer

  const rawAvailWidth = Math.max(180, vw - marginX * 2 - framePaddingX);
  const rawAvailHeight = Math.max(150, vh - marginY * 2 - chromeHeight);

  const availWidth = zoomed ? rawAvailWidth : Math.min(rawAvailWidth, 1140);
  const availHeight = zoomed ? rawAvailHeight : Math.min(rawAvailHeight, 780);

  const resolvedRatio = parseLightboxAspectRatio(aspectRatio, naturalWidth, naturalHeight);

  if (resolvedRatio && resolvedRatio > 0) {
    let targetWidth = Math.min(availWidth, availHeight * resolvedRatio);
    let targetHeight = targetWidth / resolvedRatio;

    // In non-zoomed mode, avoid upscaling tiny raster images past their intrinsic pixel width
    // when intrinsic raster dimensions are known and smaller than the compact stage.
    // Vector SVGs are resolution-independent and fill the comfortable stage cleanly.
    if (!zoomed && !isVector && naturalWidth > 0 && naturalHeight > 0 && naturalWidth < targetWidth) {
      targetWidth = naturalWidth;
      targetHeight = naturalHeight;
    }

    const mediaWidth = Math.max(120, Math.round(targetWidth));
    const mediaHeight = Math.max(90, Math.round(targetHeight));

    return {
      zoomed: Boolean(zoomed),
      marginX,
      marginY,
      availWidth,
      availHeight,
      aspectRatio: Number(resolvedRatio.toFixed(5)),
      mediaWidth,
      mediaHeight,
      frameMaxWidth: mediaWidth + framePaddingX,
      dialogMaxWidth: vw - marginX * 2,
      dialogMaxHeight: vh - marginY * 2,
    };
  }

  return {
    zoomed: Boolean(zoomed),
    marginX,
    marginY,
    availWidth,
    availHeight,
    aspectRatio: null,
    mediaWidth: zoomed ? availWidth : null,
    mediaHeight: zoomed ? availHeight : null,
    frameMaxWidth: availWidth + framePaddingX,
    dialogMaxWidth: vw - marginX * 2,
    dialogMaxHeight: vh - marginY * 2,
  };
};
