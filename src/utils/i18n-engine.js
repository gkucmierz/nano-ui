/**
 * @file i18n-engine.js
 * Strict Line-Aligned i18n Engine, Sanitizer & Spatial Budget Validator.
 * Extracted and generalized from lol-inspector for ecosystem-wide bilingual/multilingual apps.
 *
 * Enforces:
 *  1. Separate locale files per language (e.g. locales/en.json, locales/pl.json, optional locales/meta.json)
 *  2. 1:1 Line-Number & Structural Symmetry (identical line count, identical key on every line i+1)
 *  3. Anti-XSS HTML Markup Sanitizer (forbids raw <tag> markup inside locale strings)
 *  4. Case Strategy Parity (ALL UPPERCASE / all lowercase consistency across locales)
 *  5. Placeholder Variable Parity ({count}, {name}, etc. must match on every line)
 *  6. Spatial Constraint Budgets (UI_CONTEXT + maxLen via worst-case placeholder expansion)
 */

export const UI_CONTEXT = {
  NAV_TAB: 'NAV_TAB',
  HEADER_BTN: 'HEADER_BTN',
  PILL: 'PILL',
  BADGE: 'BADGE',
  ACTION_BTN: 'ACTION_BTN',
  DIALOG_BTN: 'DIALOG_BTN',
  DIALOG_TITLE: 'DIALOG_TITLE',
  MODAL_TAB: 'MODAL_TAB',
  TABLE_TH: 'TABLE_TH',
  TOAST: 'TOAST',
  TOOLTIP_LABEL: 'TOOLTIP_LABEL',
};

export const ALLOWED_CONTEXTS = Object.values(UI_CONTEXT);

export const WORST_CASE_PLACEHOLDERS = {
  count: '99',
  number: '99',
  minutes: '45',
  words: '12,500',
  chars: '85,000',
  kda: '4.25',
  ratio: '4.25',
  percent: '100%',
  wr: '100%',
  time: '25:30',
  duration: '25:30',
  gold: '15.5k',
  name: 'LongDocumentName.md',
  file: 'LongDocumentName.md',
  text: 'DELETE',
};

/**
 * Interpolates {key} placeholders with realistic worst-case strings for spatial budget checks.
 * @param {string} str
 * @param {Record<string, string>} [customPlaceholders]
 * @returns {string}
 */
export function renderWorstCaseString(str, customPlaceholders = {}) {
  if (!str || typeof str !== 'string') return '';
  const map = { ...WORST_CASE_PLACEHOLDERS, ...customPlaceholders };
  return str.replace(/\{(\w+)\}/g, (_, key) => (map[key] !== undefined ? map[key] : 'XXXX'));
}

/**
 * Extracts sorted unique {placeholder} variable names from a template string.
 * @param {string} str
 * @returns {string[]}
 */
export function extractPlaceholders(str) {
  if (!str || typeof str !== 'string') return [];
  const found = new Set();
  const re = /\{(\w+)\}/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    found.add(m[1]);
  }
  return [...found].sort();
}

export function isAllUpperCase(str) {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.replace(/\{[^}]+\}/g, '');
  const letters = cleaned.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase();
}

export function isAllLowerCase(str) {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.replace(/\{[^}]+\}/g, '');
  const letters = cleaned.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
  if (letters.length < 2) return false;
  return letters === letters.toLowerCase();
}

/**
 * Validates 1:1 line-number alignment, key symmetry, HTML sanitization, case parity,
 * placeholder parity, and optional meta.json spatial constraints across two raw JSON strings.
 *
 * @param {object} options
 * @param {string} options.baseText - Raw text of base locale file (e.g. en.json)
 * @param {string} options.targetText - Raw text of target locale file (e.g. pl.json)
 * @param {string} [options.metaText] - Optional raw text of meta.json
 * @param {string} [options.baseLabel='en.json']
 * @param {string} [options.targetLabel='pl.json']
 * @returns {{ valid: boolean, errors: Array<{ line: number, message: string }>, lineCount: number }}
 */
export function validateLocaleSymmetry({
  baseText,
  targetText,
  metaText = null,
  baseLabel = 'en.json',
  targetLabel = 'pl.json',
} = {}) {
  const baseLines = String(baseText ?? '').replace(/\r\n/g, '\n').split('\n');
  const targetLines = String(targetText ?? '').replace(/\r\n/g, '\n').split('\n');
  const metaLines = metaText ? String(metaText).replace(/\r\n/g, '\n').split('\n') : null;
  const errors = [];

  if (baseLines.length !== targetLines.length) {
    errors.push({
      line: 0,
      message: `Mismatch in line counts: ${baseLabel} has ${baseLines.length} lines, ${targetLabel} has ${targetLines.length} lines.`,
    });
    return { valid: false, errors, lineCount: baseLines.length };
  }

  if (metaLines && metaLines.length !== baseLines.length) {
    errors.push({
      line: 0,
      message: `Mismatch in line counts: ${baseLabel} has ${baseLines.length} lines, meta.json has ${metaLines.length} lines.`,
    });
    return { valid: false, errors, lineCount: baseLines.length };
  }

  const htmlRegex = /<[a-z/][^>]*>/i;

  for (let i = 0; i < baseLines.length; i++) {
    const lineNum = i + 1;
    const bLine = baseLines[i];
    const tLine = targetLines[i];

    const bKeyMatch = bLine.match(/^\s*"([^"]+)"\s*:/);
    const tKeyMatch = tLine.match(/^\s*"([^"]+)"\s*:/);

    if (bKeyMatch && tKeyMatch) {
      if (bKeyMatch[1] !== tKeyMatch[1]) {
        errors.push({
          line: lineNum,
          message: `Key mismatch: ${baseLabel} has "${bKeyMatch[1]}", ${targetLabel} has "${tKeyMatch[1]}"`,
        });
      }
    } else if (bKeyMatch || tKeyMatch) {
      errors.push({
        line: lineNum,
        message: `Structure mismatch: one locale file has a key on line ${lineNum}, the other does not.`,
      });
    }

    if (metaLines) {
      const mLine = metaLines[i];
      const mKeyMatch = mLine.match(/^\s*"([^"]+)"\s*:/);
      if (bKeyMatch && mKeyMatch) {
        if (bKeyMatch[1] !== mKeyMatch[1]) {
          errors.push({
            line: lineNum,
            message: `Key mismatch: ${baseLabel} has "${bKeyMatch[1]}", meta.json has "${mKeyMatch[1]}"`,
          });
        }
      } else if (bKeyMatch || mKeyMatch) {
        errors.push({
          line: lineNum,
          message: `Structure mismatch between ${baseLabel} and meta.json at line ${lineNum}`,
        });
      }
    }

    const bValMatch = bLine.match(/:\s*"((?:[^"\\]|\\.)*)"/);
    const tValMatch = tLine.match(/:\s*"((?:[^"\\]|\\.)*)"/);

    if (bValMatch && tValMatch) {
      const bVal = bValMatch[1];
      const tVal = tValMatch[1];

      // 1. Case Strategy Parity
      if (isAllUpperCase(bVal) && !isAllUpperCase(tVal)) {
        errors.push({
          line: lineNum,
          message: `Case mismatch: ${baseLabel} is ALL UPPERCASE ("${bVal}"), but ${targetLabel} is not ("${tVal}").`,
        });
      }
      if (isAllLowerCase(bVal) && !isAllLowerCase(tVal)) {
        errors.push({
          line: lineNum,
          message: `Case mismatch: ${baseLabel} is all lowercase ("${bVal}"), but ${targetLabel} is not ("${tVal}").`,
        });
      }

      // 2. Anti-XSS HTML Markup Sanitizer
      if (htmlRegex.test(bVal)) {
        errors.push({
          line: lineNum,
          message: `HTML Markup detected in ${baseLabel}: "${bVal}". Use {param} interpolation instead.`,
        });
      }
      if (htmlRegex.test(tVal)) {
        errors.push({
          line: lineNum,
          message: `HTML Markup detected in ${targetLabel}: "${tVal}". Use {param} interpolation instead.`,
        });
      }

      // 3. Placeholder Variable Parity ({count}, {minutes}, etc.)
      const bPlaceholders = extractPlaceholders(bVal);
      const tPlaceholders = extractPlaceholders(tVal);
      if (bPlaceholders.join(',') !== tPlaceholders.join(',')) {
        errors.push({
          line: lineNum,
          message: `Placeholder mismatch: ${baseLabel} has {${bPlaceholders.join('}, {')}}, ${targetLabel} has {${tPlaceholders.join('}, {')}}.`,
        });
      }

      // 4. Spatial Constraints & Allowed Contexts (meta.json)
      if (metaLines) {
        const mLine = metaLines[i];
        const contextMatch = mLine.match(/"context":\s*"([^"]+)"/);
        if (contextMatch && !ALLOWED_CONTEXTS.includes(contextMatch[1])) {
          errors.push({
            line: lineNum,
            message: `Invalid UI context "${contextMatch[1]}". Allowed: [${ALLOWED_CONTEXTS.join(', ')}]`,
          });
        }
        const maxLenMatch = mLine.match(/"maxLen":\s*(\d+)/);
        if (maxLenMatch) {
          const maxLen = Number(maxLenMatch[1]);
          const renderedB = renderWorstCaseString(bVal);
          const renderedT = renderWorstCaseString(tVal);
          if (renderedB.length > maxLen) {
            errors.push({
              line: lineNum,
              message: `Spatial constraint exceeded in ${baseLabel}: "${bVal}" -> ${renderedB.length} chars (max: ${maxLen}).`,
            });
          }
          if (renderedT.length > maxLen) {
            errors.push({
              line: lineNum,
              message: `Spatial constraint exceeded in ${targetLabel}: "${tVal}" -> ${renderedT.length} chars (max: ${maxLen}).`,
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    lineCount: baseLines.length,
  };
}

/**
 * Estimates proportional visual character width without DOM/Canvas.
 * @param {string} str
 * @returns {number}
 */
export function estimateVisualStringWidth(str) {
  if (!str || typeof str !== 'string') return 0;
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (/[iIl1.,':;]/.test(ch)) w += 0.4;
    else if (/[fjt]/i.test(ch)) w += 0.6;
    else if (/[WM@%]/.test(ch)) w += 1.6;
    else if (/[A-ZĄĆĘŁŃÓŚŹŻ]/.test(ch)) w += 1.2;
    else w += 1.0;
  }
  return w;
}

/**
 * Translates a dot-separated key path from a nested locales dictionary with fallback and {param} interpolation.
 * @param {Record<string, object>} dict - e.g. { en: enDict, pl: plDict }
 * @param {string} lang - Active language code ('en' | 'pl')
 * @param {string} keyPath - Dot-separated path e.g. 'nav.openFile'
 * @param {Record<string, string|number>} [params] - Optional interpolation params
 * @param {string} [fallbackLang='en']
 * @returns {string}
 */
export function resolveTranslation(dict, lang, keyPath, params = {}, fallbackLang = 'en') {
  if (!keyPath || typeof keyPath !== 'string') return '';
  const keys = keyPath.split('.');
  let current = dict && typeof dict === 'object' && Object.hasOwn(dict, lang) ? dict[lang] : undefined;

  for (const k of keys) {
    if (current && typeof current === 'object' && Object.hasOwn(current, k)) {
      current = current[k];
    } else {
      let fb = dict && typeof dict === 'object' && Object.hasOwn(dict, fallbackLang) ? dict[fallbackLang] : undefined;
      for (const fbKey of keys) {
        if (fb && typeof fb === 'object' && Object.hasOwn(fb, fbKey)) {
          fb = fb[fbKey];
        } else {
          return keyPath;
        }
      }
      current = fb;
      break;
    }
  }

  if (typeof current !== 'string') return keyPath;

  let text = current;
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const [k, v] of Object.entries(params)) {
      const replacement = v !== undefined && v !== null ? String(v) : '';
      text = text.replaceAll(`{${k}}`, () => replacement);
    }
  }
  return text;
}
