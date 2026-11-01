/**
 * @file src/utils/chart-bands.js
 * Domain-agnostic vertical band calculator for Nano UI 2D charts,
 * plus optional calendar/weekday preset helpers.
 *
 * The core `computeVerticalBands` engine makes ZERO assumptions about what the X-axis represents
 * (it can be array indices, frequencies, algorithmic complexity steps, categories, quarters, or timestamps).
 *
 * Supports:
 *  - Single-point labels (e.g. 'SB', 'ND', 'Q1', 'PEAK') when a band spans 1 point or `mergeAdjacent: false`
 *  - Combined 2+ point labels (e.g. 'SB–ND', 'PT–ND', 'Q1–Q3') when adjacent matching points are merged
 *  - Multiple internal dashed dividers (`dividers: number[]` + `dividerX` first divider for backward compatibility)
 *  - Explicit range bands (`bands: [{ fromIndex, toIndex, label, color }, { fromKey, toKey, label }]`)
 *  - Generic predicate matcher (`match: (point, index, points) => boolean | string | { match, label, group, color }`)
 *  - Optional calendar weekday preset (`createWeekdayBandConfig`, `computeWeekendBands`, `getDateWeekdayInfo`)
 */

export const DEFAULT_WEEKDAY_LABELS = {
  pl: {
    0: 'ND',
    1: 'PN',
    2: 'WT',
    3: 'ŚR',
    4: 'CZ',
    5: 'PT',
    6: 'SB',
  },
  en: {
    0: 'SUN',
    1: 'MON',
    2: 'TUE',
    3: 'WED',
    4: 'THU',
    5: 'FRI',
    6: 'SAT',
  },
};

export const SHORT_WEEKDAY_NAMES = {
  pl: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/**
 * Resolves the canonical key of a generic chart point.
 */
const resolvePointKey = (pt, idx) => {
  if (!pt || typeof pt !== 'object') return String(idx);
  return String(pt.key ?? pt.xKey ?? pt.date ?? pt.id ?? pt.label ?? idx);
};

/**
 * Returns localized short weekday badge for a `YYYY-MM-DD` date string
 * and whether it falls on a highlighted weekday (default Saturday=6 or Sunday=0).
 *
 * @param {string} dateStr - ISO date string `YYYY-MM-DD`
 * @param {string} [lang='pl'] - Locale ('pl' | 'en')
 * @param {number[]} [highlightDays=[6, 0]] - UTC weekday indices considered highlighted
 * @returns {{ day: number, isWeekend: boolean, shortName: string, upperLabel: string }}
 */
export const getDateWeekdayInfo = (dateStr, lang = 'pl', highlightDays = [6, 0]) => {
  const cleanDate = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return { day: -1, isWeekend: false, shortName: '' };
  }
  const d = new Date(`${cleanDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return { day: -1, isWeekend: false, shortName: '' };
  }
  const day = d.getUTCDay();
  const localeKey = lang === 'en' ? 'en' : 'pl';
  const shortName = SHORT_WEEKDAY_NAMES[localeKey][day] || '';
  return {
    day,
    isWeekend: Array.isArray(highlightDays) ? highlightDays.includes(day) : day === 6 || day === 0,
    shortName,
  };
};

/**
 * Creates a weekday vertical band configuration object for time-series charts where X points carry a date.
 *
 * @param {Object} [options]
 * @param {string} [options.lang='pl'] - 'pl' | 'en'
 * @param {number[]} [options.days=[6, 0]] - UTC weekday numbers to highlight (6=Sat, 0=Sun)
 * @param {boolean} [options.mergeAdjacent=true] - Merge consecutive matching days (e.g. SB + ND -> SB–ND)
 * @param {Record<number|string, string>} [options.singleLabels] - Override map per weekday index
 * @param {string|Function} [options.mergedLabel] - Custom merged label or formatter
 * @param {string} [options.separator='–'] - Separator for merged labels
 * @param {string} [options.dateField] - Optional property name holding the date string
 * @returns {Object} Generic band config compatible with `computeVerticalBands`
 */
export const createWeekdayBandConfig = (options = {}) => {
  if (options && options._isWeekdayConfig) return options;
  const opts = typeof options === 'string' ? { lang: options } : options || {};
  const lang = opts.lang === 'en' ? 'en' : 'pl';
  const targetDays = Array.isArray(opts.days) ? opts.days : [6, 0];
  const defaultMap = DEFAULT_WEEKDAY_LABELS[lang];
  const singleLabels = { ...defaultMap, ...(opts.singleLabels || {}) };
  const userMatcher = typeof opts.match === 'function'
    ? opts.match
    : typeof opts.matcher === 'function'
      ? opts.matcher
      : null;

  return {
    ...opts,
    _isWeekdayConfig: true,
    lang,
    days: targetDays,
    mergeAdjacent: opts.mergeAdjacent !== false,
    separator: opts.separator ?? '–',
    match: (pt, idx, points) => {
      const rawDate = opts.dateField ? pt?.[opts.dateField] : (pt?.date ?? pt?.key ?? pt?.xKey ?? '');
      const cleanDate = String(rawDate || '').slice(0, 10);
      const d = /^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ? new Date(`${cleanDate}T12:00:00Z`) : null;
      const day = d && !Number.isNaN(d.getTime()) ? d.getUTCDay() : -1;

      let isMatch = targetDays.includes(day);
      let label = singleLabels[day] || '';
      let color = null;
      let group = 'weekday';

      if (userMatcher) {
        const res = userMatcher(pt, idx, day, points);
        if (typeof res === 'boolean') {
          isMatch = res;
        } else if (typeof res === 'string') {
          isMatch = Boolean(res);
          label = res;
        } else if (res && typeof res === 'object') {
          isMatch = Boolean(res.match);
          if (res.label !== undefined) label = res.label;
          if (res.color !== undefined) color = res.color;
          if (res.group !== undefined) group = res.group;
        }
      }

      return {
        match: isMatch,
        label,
        color,
        group,
        meta: { day, date: pt?.date ?? cleanDate },
      };
    },
  };
};

/**
 * Computes configurable vertical rectangular bands on any 2D chart plane.
 *
 * Works with:
 * 1. Explicit range bands (`options.bands` or passing an Array as `options`):
 *    `[{ fromIndex: 2, toIndex: 4, label: 'PEAK', color: '...' }, { fromKey: '100Hz', toKey: '1kHz', label: 'MID' }]`
 * 2. Generic point predicate (`options.match` / `options.matcher` / `point.band`):
 *    Evaluates each X-axis point cell, supports single-point labels (`'SB'`, `'ND'`, `'Q1'`) and
 *    automatic merging of 2+ consecutive matching points (`'SB–ND'`, `'Q1–Q2'`) with internal dashed `dividers`.
 * 3. Calendar weekday preset (when `options` is `'pl'`/`'en'`, `{ preset: 'weekend' }`, `{ days: [...] }`, or points have `.date` and no custom `match`/`bands` is given).
 *
 * @param {Array<{ x: number, [key: string]: any }>} points - Chart points with SVG `x` coordinate
 * @param {number} leftBound - Left X boundary of plot area
 * @param {number} rightBound - Right X boundary of plot area
 * @param {Object|Array|string} [options] - Band configuration, array of explicit band definitions, or preset locale
 * @returns {Array<{
 *   key: string,
 *   x: number,
 *   width: number,
 *   labelX: number,
 *   dividerX: number | null,
 *   dividers: number[],
 *   label: string,
 *   unitLabels: string[],
 *   keys: string[],
 *   indices: number[],
 *   days: number[],
 *   dates: string[],
 *   color: string | null,
 *   isClippedLeft: boolean,
 *   isClippedRight: boolean
 * }>}
 */
export const computeVerticalBands = (points, leftBound, rightBound, options = {}) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  const n = points.length;

  // Precompute cell boundaries for every point index
  const cellBounds = points.map((pt, idx) => {
    const rawLeft = idx === 0 ? leftBound : (points[idx - 1].x + pt.x) / 2;
    const rawRight = idx === n - 1 ? rightBound : (pt.x + points[idx + 1].x) / 2;
    return {
      idx,
      pt,
      key: resolvePointKey(pt, idx),
      x: pt.x,
      leftX: Math.max(leftBound, rawLeft),
      rightX: Math.min(rightBound, rawRight),
    };
  });

  // Mode 1: Explicit array of band definitions
  const explicitBands = Array.isArray(options)
    ? options
    : Array.isArray(options?.bands)
      ? options.bands
      : null;

  if (explicitBands) {
    const separator = options?.separator ?? '–';
    return explicitBands
      .map((def, bIdx) => {
        if (!def) return null;
        if (typeof def.fromX === 'number' && typeof def.toX === 'number') {
          const x0 = Math.max(leftBound, Math.min(def.fromX, def.toX));
          const x1 = Math.min(rightBound, Math.max(def.fromX, def.toX));
          const width = Math.max(2, x1 - x0);
          const dividers = Array.isArray(def.dividers)
            ? def.dividers.map((d) => Number(Number(d).toFixed(2)))
            : [];
          return {
            key: def.key || `band-${bIdx}`,
            x: Number(x0.toFixed(2)),
            width: Number(width.toFixed(2)),
            labelX: Number((x0 + width / 2).toFixed(2)),
            dividerX: dividers[0] ?? null,
            dividers,
            label: def.label ?? '',
            unitLabels: def.label ? [def.label] : [],
            keys: [],
            indices: [],
            days: [],
            dates: [],
            color: def.color || null,
            isClippedLeft: false,
            isClippedRight: false,
          };
        }

        let startIdx = -1;
        let endIdx = -1;

        if (typeof def.index === 'number') {
          startIdx = def.index;
          endIdx = def.index;
        } else if (typeof def.fromIndex === 'number' || typeof def.toIndex === 'number') {
          startIdx = typeof def.fromIndex === 'number' ? def.fromIndex : def.toIndex;
          endIdx = typeof def.toIndex === 'number' ? def.toIndex : startIdx;
        } else if (def.key !== undefined || def.fromKey !== undefined || def.toKey !== undefined) {
          const fromK = String(def.fromKey ?? def.key);
          const toK = String(def.toKey ?? def.fromKey ?? def.key);
          startIdx = cellBounds.findIndex((c) => c.key === fromK);
          endIdx = cellBounds.findIndex((c) => c.key === toK);
          if (startIdx !== -1 && endIdx === -1) endIdx = startIdx;
        }

        if (startIdx < 0 || endIdx < 0) return null;
        const s = Math.max(0, Math.min(n - 1, Math.min(startIdx, endIdx)));
        const e = Math.max(0, Math.min(n - 1, Math.max(startIdx, endIdx)));

        const x0 = cellBounds[s].leftX;
        const x1 = cellBounds[e].rightX;
        const width = Math.max(2, x1 - x0);
        const spanCells = cellBounds.slice(s, e + 1);
        const showDividers = def.dividers !== false;
        const dividers = Array.isArray(def.dividers)
          ? def.dividers.map((d) => Number(Number(d).toFixed(2)))
          : showDividers
            ? spanCells.slice(1).map((c) => Number(c.leftX.toFixed(2)))
            : [];

        const unitLabels = spanCells
          .map((c) => c.pt?.bandLabel ?? c.pt?.label ?? '')
          .filter(Boolean);

        let label = def.label ?? '';
        if (!label && unitLabels.length > 0) {
          label = unitLabels.length === 1
            ? unitLabels[0]
            : `${unitLabels[0]}${separator}${unitLabels[unitLabels.length - 1]}`;
        }

        return {
          key: def.key || cellBounds[s].key,
          x: Number(x0.toFixed(2)),
          width: Number(width.toFixed(2)),
          labelX: Number((x0 + width / 2).toFixed(2)),
          dividerX: dividers[0] ?? null,
          dividers,
          label,
          unitLabels,
          keys: spanCells.map((c) => c.key),
          indices: spanCells.map((c) => c.idx),
          days: [],
          dates: spanCells.map((c) => c.pt?.date ?? c.key),
          color: def.color || null,
          isClippedLeft: false,
          isClippedRight: false,
        };
      })
      .filter(Boolean);
  }

  // Determine whether to use the weekday preset or generic point matcher
  const isStringLocale = typeof options === 'string';
  const rawOpts = isStringLocale ? { lang: options, preset: 'weekend' } : (options || {});
  const hasCustomMatch = typeof rawOpts.match === 'function' || typeof rawOpts.matcher === 'function';
  const hasExplicitWeekdayOpts =
    isStringLocale ||
    rawOpts.preset === 'weekend' ||
    rawOpts.preset === 'weekday' ||
    Array.isArray(rawOpts.days) ||
    rawOpts.lang !== undefined ||
    (!hasCustomMatch && points.some((pt) => typeof pt?.date === 'string'));

  const effectiveOpts =
    hasExplicitWeekdayOpts && (!hasCustomMatch || rawOpts.days || rawOpts.lang || isStringLocale)
      ? createWeekdayBandConfig(rawOpts)
      : rawOpts;

  const mergeAdjacent = effectiveOpts.mergeAdjacent !== false;
  const separator = effectiveOpts.separator ?? '–';
  const matchFn = typeof effectiveOpts.match === 'function'
    ? effectiveOpts.match
    : typeof effectiveOpts.matcher === 'function'
      ? effectiveOpts.matcher
      : null;
  const getLabelFn = typeof effectiveOpts.getLabel === 'function' ? effectiveOpts.getLabel : null;
  const singleLabelsMap = effectiveOpts.singleLabels || {};
  const targetDays = Array.isArray(effectiveOpts.days) ? effectiveOpts.days : null;

  const evaluatedCells = cellBounds.map((cell) => {
    const { pt, idx } = cell;
    let isMatch = false;
    let unitLabel = '';
    let color = null;
    let group = 'default';
    let meta = {};

    if (matchFn) {
      const mRes = matchFn(pt, idx, points);
      if (typeof mRes === 'boolean') {
        isMatch = mRes;
      } else if (typeof mRes === 'string') {
        isMatch = Boolean(mRes);
        unitLabel = mRes;
      } else if (mRes && typeof mRes === 'object') {
        isMatch = Boolean(mRes.match);
        if (mRes.label !== undefined && mRes.label !== null) unitLabel = String(mRes.label);
        if (mRes.color) color = mRes.color;
        if (mRes.group) group = String(mRes.group);
        if (mRes.meta) meta = mRes.meta;
      }
    } else if (pt && pt.band !== undefined && pt.band !== false && pt.band !== null) {
      isMatch = true;
      if (typeof pt.band === 'string') {
        unitLabel = pt.band;
      } else if (typeof pt.band === 'object') {
        isMatch = pt.band.match !== false;
        unitLabel = pt.band.label || '';
        color = pt.band.color || null;
        group = pt.band.group || 'default';
      }
    }

    if (isMatch && !unitLabel) {
      if (getLabelFn) {
        unitLabel = String(getLabelFn(pt, idx) || '');
      } else if (singleLabelsMap[cell.key] !== undefined) {
        unitLabel = String(singleLabelsMap[cell.key]);
      } else if (singleLabelsMap[idx] !== undefined) {
        unitLabel = String(singleLabelsMap[idx]);
      } else if (pt?.bandLabel) {
        unitLabel = String(pt.bandLabel);
      }
    }

    return {
      ...cell,
      isMatch,
      unitLabel,
      color,
      group,
      day: meta.day !== undefined ? meta.day : -1,
      date: meta.date !== undefined ? meta.date : (pt?.date ?? cell.key),
    };
  });

  const rawBands = [];
  let current = null;

  for (const cell of evaluatedCells) {
    if (!cell.isMatch) {
      if (current) {
        rawBands.push(current);
        current = null;
      }
      continue;
    }

    const canMerge =
      current &&
      mergeAdjacent &&
      current.color === cell.color &&
      current.group === cell.group;

    if (!canMerge) {
      if (current) rawBands.push(current);
      current = {
        key: cell.key,
        x: cell.leftX,
        rightX: cell.rightX,
        width: Math.max(2, cell.rightX - cell.leftX),
        dividers: [],
        unitLabels: [cell.unitLabel],
        keys: [cell.key],
        indices: [cell.idx],
        days: cell.day !== -1 ? [cell.day] : [],
        dates: [cell.date],
        color: cell.color,
        group: cell.group,
        startIdx: cell.idx,
        endIdx: cell.idx,
      };
    } else {
      current.dividers.push(cell.leftX);
      current.rightX = cell.rightX;
      current.width = Math.max(2, current.rightX - current.x);
      current.unitLabels.push(cell.unitLabel);
      current.keys.push(cell.key);
      current.indices.push(cell.idx);
      if (cell.day !== -1) current.days.push(cell.day);
      current.dates.push(cell.date);
      current.endIdx = cell.idx;
    }
  }

  if (current) {
    rawBands.push(current);
  }

  const mergedLabelOpt = effectiveOpts.mergedLabel ?? effectiveOpts.formatMergedLabel;

  return rawBands.map((b) => {
    let label = '';
    const validLabels = b.unitLabels.filter(Boolean);
    const spanCount = b.indices.length;

    if (spanCount === 1) {
      label = validLabels[0] || '';
    } else if (typeof mergedLabelOpt === 'function') {
      label = mergedLabelOpt(validLabels, b.days.length ? b.days : b.indices, b.dates);
    } else if (typeof mergedLabelOpt === 'string' && mergedLabelOpt.length > 0) {
      label = mergedLabelOpt;
    } else if (validLabels.length >= 2) {
      const first = validLabels[0];
      const last = validLabels[validLabels.length - 1];
      label = first === last ? first : `${first}${separator}${last}`;
    } else {
      label = validLabels[0] || '';
    }

    const x = Number(b.x.toFixed(2));
    const width = Number(b.width.toFixed(2));
    const labelX = Number((b.x + b.width / 2).toFixed(2));
    const dividers = b.dividers.map((dx) => Number(dx.toFixed(2)));
    const dividerX = dividers.length > 0 ? dividers[0] : null;

    const isClippedLeft = Boolean(
      targetDays &&
      targetDays.length > 1 &&
      b.startIdx === 0 &&
      b.days.length === 1 &&
      b.days[0] === targetDays[targetDays.length - 1]
    );
    const isClippedRight = Boolean(
      targetDays &&
      targetDays.length > 1 &&
      b.endIdx === n - 1 &&
      b.days.length === 1 &&
      b.days[0] === targetDays[0]
    );

    return {
      key: b.key,
      x,
      width,
      labelX,
      dividerX,
      dividers,
      label,
      unitLabels: b.unitLabels,
      keys: b.keys,
      indices: b.indices,
      days: b.days,
      dates: b.dates,
      color: b.color || null,
      isClippedLeft,
      isClippedRight,
    };
  });
};

/**
 * Drop-in backward-compatible weekend (Saturday & Sunday) band helper.
 */
export const computeWeekendBands = (points, leftBound, rightBound, lang = 'pl') =>
  computeVerticalBands(points, leftBound, rightBound, createWeekdayBandConfig({ lang, days: [6, 0], mergeAdjacent: true }));
