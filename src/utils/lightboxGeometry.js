import { clamp } from './math.js';

const objTag = (v) => Object.prototype.toString.call(v);
const isNum = (v) => objTag(v) === '[object Number]' && Number.isFinite(v);
const isStr = (v) => objTag(v) === '[object String]';

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
    if (!zoomed && naturalWidth > 0 && naturalHeight > 0 && naturalWidth < targetWidth) {
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
