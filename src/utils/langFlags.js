/**
 * Deterministic Zero-Dependency Vector SVG Flag & ISO 639-1 Language Registry (`24x18` viewBox).
 *
 * Eliminates broken OS regional-indicator flag emojis (`🇵🇱` rendering as raw ASCII `PL` on Windows
 * and inflating button line-heights on macOS/iOS/Android) while providing crisp geometric vector
 * shapes, native endonyms, and pure SVG markup generation.
 */

const objTag = (v) => Object.prototype.toString.call(v);
const isObj = (v) => v !== null && objTag(v) === '[object Object]';

export const LANG_CODE_ALIASES = Object.freeze({
  ua: 'uk',
  jp: 'ja',
  gb: 'en',
  uk_gb: 'en',
  us: 'en',
  br: 'pt',
  cz: 'cs',
  se: 'sv',
  dk: 'da',
  gr: 'el',
  cn: 'zh',
  tw: 'zh',
  kr: 'ko',
  il: 'he',
  sa: 'ar',
  in: 'hi',
  vn: 'vi',
  ee: 'et',
});

const hStripe3 = (c1, c2, c3) => [
  { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 6, fill: c1 } },
  { tag: 'rect', attrs: { x: 0, y: 6, width: 24, height: 6, fill: c2 } },
  { tag: 'rect', attrs: { x: 0, y: 12, width: 24, height: 6, fill: c3 } },
];

const vStripe3 = (c1, c2, c3) => [
  { tag: 'rect', attrs: { x: 0, y: 0, width: 8, height: 18, fill: c1 } },
  { tag: 'rect', attrs: { x: 8, y: 0, width: 8, height: 18, fill: c2 } },
  { tag: 'rect', attrs: { x: 16, y: 0, width: 8, height: 18, fill: c3 } },
];

const nordicCross = (bg, cross, inner = null) => {
  const shapes = [
    { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: bg } },
    { tag: 'rect', attrs: { x: 7, y: 0, width: 4, height: 18, fill: cross } },
    { tag: 'rect', attrs: { x: 0, y: 7, width: 24, height: 4, fill: cross } },
  ];
  if (inner) {
    shapes.push(
      { tag: 'rect', attrs: { x: 8, y: 0, width: 2, height: 18, fill: inner } },
      { tag: 'rect', attrs: { x: 0, y: 8, width: 24, height: 2, fill: inner } }
    );
  }
  return shapes;
};

export const LANG_FLAG_REGISTRY = Object.freeze({
  pl: {
    code: 'pl',
    countryCode: 'PL',
    nativeLabel: 'Polski',
    englishLabel: 'Polish',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 9, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 9, width: 24, height: 9, fill: '#dc143c' } },
    ],
  },
  en: {
    code: 'en',
    countryCode: 'GB',
    nativeLabel: 'English',
    englishLabel: 'English',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#012169' } },
      {
        tag: 'path',
        attrs: {
          d: 'M0 0L24 18M24 0L0 18',
          stroke: '#ffffff',
          'stroke-width': 3.6,
        },
      },
      {
        tag: 'path',
        attrs: {
          d: 'M0 0L24 18M24 0L0 18',
          stroke: '#c8102e',
          'stroke-width': 1.8,
        },
      },
      { tag: 'rect', attrs: { x: 9.2, y: 0, width: 5.6, height: 18, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 6.2, width: 24, height: 5.6, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 10.4, y: 0, width: 3.2, height: 18, fill: '#c8102e' } },
      { tag: 'rect', attrs: { x: 0, y: 7.4, width: 24, height: 3.2, fill: '#c8102e' } },
    ],
  },
  es: {
    code: 'es',
    countryCode: 'ES',
    nativeLabel: 'Español',
    englishLabel: 'Spanish',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 4.5, fill: '#aa151b' } },
      { tag: 'rect', attrs: { x: 0, y: 4.5, width: 24, height: 9, fill: '#f1bf00' } },
      { tag: 'rect', attrs: { x: 0, y: 13.5, width: 24, height: 4.5, fill: '#aa151b' } },
      { tag: 'rect', attrs: { x: 5.2, y: 6.8, width: 2.6, height: 4.4, rx: 0.9, fill: '#aa151b' } },
    ],
  },
  pt: {
    code: 'pt',
    countryCode: 'PT',
    nativeLabel: 'Português',
    englishLabel: 'Portuguese',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 9.6, height: 18, fill: '#046a38' } },
      { tag: 'rect', attrs: { x: 9.6, y: 0, width: 14.4, height: 18, fill: '#da291c' } },
      { tag: 'circle', attrs: { cx: 9.6, cy: 9, r: 3.4, fill: '#ffe900' } },
      { tag: 'circle', attrs: { cx: 9.6, cy: 9, r: 1.9, fill: '#da291c' } },
    ],
  },
  de: {
    code: 'de',
    countryCode: 'DE',
    nativeLabel: 'Deutsch',
    englishLabel: 'German',
    shapes: hStripe3('#111827', '#dd0000', '#ffce00'),
  },
  fr: {
    code: 'fr',
    countryCode: 'FR',
    nativeLabel: 'Français',
    englishLabel: 'French',
    shapes: vStripe3('#002654', '#ffffff', '#ed2939'),
  },
  uk: {
    code: 'uk',
    countryCode: 'UA',
    nativeLabel: 'Українська',
    englishLabel: 'Ukrainian',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 9, fill: '#0057b7' } },
      { tag: 'rect', attrs: { x: 0, y: 9, width: 24, height: 9, fill: '#ffd700' } },
    ],
  },
  ja: {
    code: 'ja',
    countryCode: 'JP',
    nativeLabel: '日本語',
    englishLabel: 'Japanese',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#ffffff' } },
      { tag: 'circle', attrs: { cx: 12, cy: 9, r: 5.2, fill: '#bc002d' } },
    ],
  },
  it: {
    code: 'it',
    countryCode: 'IT',
    nativeLabel: 'Italiano',
    englishLabel: 'Italian',
    shapes: vStripe3('#009246', '#ffffff', '#ce2b37'),
  },
  nl: {
    code: 'nl',
    countryCode: 'NL',
    nativeLabel: 'Nederlands',
    englishLabel: 'Dutch',
    shapes: hStripe3('#ae1c28', '#ffffff', '#21468b'),
  },
  cs: {
    code: 'cs',
    countryCode: 'CZ',
    nativeLabel: 'Čeština',
    englishLabel: 'Czech',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 9, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 9, width: 24, height: 9, fill: '#d7141a' } },
      { tag: 'polygon', attrs: { points: '0,0 11.5,9 0,18', fill: '#11457e' } },
    ],
  },
  sk: {
    code: 'sk',
    countryCode: 'SK',
    nativeLabel: 'Slovenčina',
    englishLabel: 'Slovak',
    shapes: [
      ...hStripe3('#ffffff', '#0b4ea2', '#ee1c25'),
      { tag: 'rect', attrs: { x: 4.5, y: 4.5, width: 4.6, height: 6.6, rx: 1.8, fill: '#ee1c25', stroke: '#ffffff', 'stroke-width': 0.8 } },
    ],
  },
  sv: {
    code: 'sv',
    countryCode: 'SE',
    nativeLabel: 'Svenska',
    englishLabel: 'Swedish',
    shapes: nordicCross('#006aa7', '#fecc02'),
  },
  no: {
    code: 'no',
    countryCode: 'NO',
    nativeLabel: 'Norsk',
    englishLabel: 'Norwegian',
    shapes: nordicCross('#ba0c2f', '#ffffff', '#00205b'),
  },
  da: {
    code: 'da',
    countryCode: 'DK',
    nativeLabel: 'Dansk',
    englishLabel: 'Danish',
    shapes: nordicCross('#c8102e', '#ffffff'),
  },
  fi: {
    code: 'fi',
    countryCode: 'FI',
    nativeLabel: 'Suomi',
    englishLabel: 'Finnish',
    shapes: nordicCross('#ffffff', '#003580'),
  },
  el: {
    code: 'el',
    countryCode: 'GR',
    nativeLabel: 'Ελληνικά',
    englishLabel: 'Greek',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#0d5eaf' } },
      { tag: 'rect', attrs: { x: 0, y: 2, width: 24, height: 2, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 6, width: 24, height: 2, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 10, width: 24, height: 2, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 14, width: 24, height: 2, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 0, width: 10, height: 10, fill: '#0d5eaf' } },
      { tag: 'rect', attrs: { x: 4, y: 0, width: 2, height: 10, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 4, width: 10, height: 2, fill: '#ffffff' } },
    ],
  },
  ro: {
    code: 'ro',
    countryCode: 'RO',
    nativeLabel: 'Română',
    englishLabel: 'Romanian',
    shapes: vStripe3('#002b7f', '#fcd116', '#ce1126'),
  },
  hu: {
    code: 'hu',
    countryCode: 'HU',
    nativeLabel: 'Magyar',
    englishLabel: 'Hungarian',
    shapes: hStripe3('#ce2939', '#ffffff', '#477050'),
  },
  bg: {
    code: 'bg',
    countryCode: 'BG',
    nativeLabel: 'Български',
    englishLabel: 'Bulgarian',
    shapes: hStripe3('#ffffff', '#00966e', '#d62612'),
  },
  hr: {
    code: 'hr',
    countryCode: 'HR',
    nativeLabel: 'Hrvatski',
    englishLabel: 'Croatian',
    shapes: [
      ...hStripe3('#ff0000', '#ffffff', '#171796'),
      { tag: 'rect', attrs: { x: 9.8, y: 5.5, width: 4.4, height: 5.2, rx: 1.2, fill: '#ff0000', stroke: '#ffffff', 'stroke-width': 0.8 } },
    ],
  },
  lt: {
    code: 'lt',
    countryCode: 'LT',
    nativeLabel: 'Lietuvių',
    englishLabel: 'Lithuanian',
    shapes: hStripe3('#fdb913', '#006a44', '#c1272d'),
  },
  lv: {
    code: 'lv',
    countryCode: 'LV',
    nativeLabel: 'Latviešu',
    englishLabel: 'Latvian',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#9e3039' } },
      { tag: 'rect', attrs: { x: 0, y: 7.2, width: 24, height: 3.6, fill: '#ffffff' } },
    ],
  },
  et: {
    code: 'et',
    countryCode: 'EE',
    nativeLabel: 'Eesti',
    englishLabel: 'Estonian',
    shapes: hStripe3('#0072ce', '#111827', '#ffffff'),
  },
  tr: {
    code: 'tr',
    countryCode: 'TR',
    nativeLabel: 'Türkçe',
    englishLabel: 'Turkish',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#e30a17' } },
      { tag: 'circle', attrs: { cx: 9.6, cy: 9, r: 4.4, fill: '#ffffff' } },
      { tag: 'circle', attrs: { cx: 10.8, cy: 9, r: 3.5, fill: '#e30a17' } },
      { tag: 'polygon', attrs: { points: '14.2,9 17.2,7.9 15.4,10.5 15.4,7.5 17.2,10.1', fill: '#ffffff' } },
    ],
  },
  ko: {
    code: 'ko',
    countryCode: 'KR',
    nativeLabel: '한국어',
    englishLabel: 'Korean',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#ffffff' } },
      { tag: 'circle', attrs: { cx: 12, cy: 9, r: 4.4, fill: '#cd2e3a' } },
      { tag: 'path', attrs: { d: 'M7.6 9A4.4 4.4 0 0 0 16.4 9A2.2 2.2 0 0 1 12 9A2.2 2.2 0 0 0 7.6 9Z', fill: '#0047a0' } },
    ],
  },
  zh: {
    code: 'zh',
    countryCode: 'CN',
    nativeLabel: '中文',
    englishLabel: 'Chinese',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#de2910' } },
      { tag: 'circle', attrs: { cx: 5.5, cy: 5.2, r: 2.3, fill: '#ffde00' } },
      { tag: 'circle', attrs: { cx: 9.8, cy: 2.6, r: 0.8, fill: '#ffde00' } },
      { tag: 'circle', attrs: { cx: 11.2, cy: 4.4, r: 0.8, fill: '#ffde00' } },
      { tag: 'circle', attrs: { cx: 11.0, cy: 6.7, r: 0.8, fill: '#ffde00' } },
      { tag: 'circle', attrs: { cx: 9.6, cy: 8.3, r: 0.8, fill: '#ffde00' } },
    ],
  },
  ar: {
    code: 'ar',
    countryCode: 'SA',
    nativeLabel: 'العربية',
    englishLabel: 'Arabic',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#006c35' } },
      { tag: 'rect', attrs: { x: 5, y: 11.6, width: 14, height: 1.6, rx: 0.8, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 6.5, y: 6.4, width: 11, height: 2.6, rx: 1.1, fill: '#ffffff' } },
    ],
  },
  hi: {
    code: 'hi',
    countryCode: 'IN',
    nativeLabel: 'हिन्दी',
    englishLabel: 'Hindi',
    shapes: [
      ...hStripe3('#ff9933', '#ffffff', '#138808'),
      { tag: 'circle', attrs: { cx: 12, cy: 9, r: 2.1, fill: 'none', stroke: '#000080', 'stroke-width': 0.9 } },
      { tag: 'circle', attrs: { cx: 12, cy: 9, r: 0.6, fill: '#000080' } },
    ],
  },
  he: {
    code: 'he',
    countryCode: 'IL',
    nativeLabel: 'עברית',
    englishLabel: 'Hebrew',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#ffffff' } },
      { tag: 'rect', attrs: { x: 0, y: 2.2, width: 24, height: 2.2, fill: '#0038b8' } },
      { tag: 'rect', attrs: { x: 0, y: 13.6, width: 24, height: 2.2, fill: '#0038b8' } },
      { tag: 'polygon', attrs: { points: '12,5.6 15,10.8 9,10.8', fill: 'none', stroke: '#0038b8', 'stroke-width': 1.1 } },
      { tag: 'polygon', attrs: { points: '12,12.4 15,7.2 9,7.2', fill: 'none', stroke: '#0038b8', 'stroke-width': 1.1 } },
    ],
  },
  vi: {
    code: 'vi',
    countryCode: 'VN',
    nativeLabel: 'Tiếng Việt',
    englishLabel: 'Vietnamese',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#da251d' } },
      { tag: 'polygon', attrs: { points: '12,4.2 13.3,8.1 17.4,8.1 14.1,10.5 15.3,14.4 12,12 8.7,14.4 9.9,10.5 6.6,8.1 10.7,8.1', fill: '#ffff00' } },
    ],
  },
  id: {
    code: 'id',
    countryCode: 'ID',
    nativeLabel: 'Bahasa Indonesia',
    englishLabel: 'Indonesian',
    shapes: [
      { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 9, fill: '#ce1126' } },
      { tag: 'rect', attrs: { x: 0, y: 9, width: 24, height: 9, fill: '#ffffff' } },
    ],
  },
});

const FALLBACK_GLOBE_SHAPES = Object.freeze([
  { tag: 'rect', attrs: { x: 0, y: 0, width: 24, height: 18, fill: '#1e293b' } },
  { tag: 'circle', attrs: { cx: 12, cy: 9, r: 5.5, fill: 'none', stroke: '#38bdf8', 'stroke-width': 1.2 } },
  { tag: 'ellipse', attrs: { cx: 12, cy: 9, rx: 2.6, ry: 5.5, fill: 'none', stroke: '#38bdf8', 'stroke-width': 1 } },
  { tag: 'line', attrs: { x1: 6.5, y1: 9, x2: 17.5, y2: 9, stroke: '#38bdf8', 'stroke-width': 1 } },
]);

/**
 * Normalizes an ISO 639-1 / BCP-47 / ISO 3166-1 code (`"pl-PL"` -> `"pl"`, `"UA"` -> `"uk"`).
 *
 * @param {string} raw
 * @returns {string}
 */
export const normalizeLangCode = (raw) => {
  if (!raw) return 'en';
  const base = String(raw)
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  if (!base) return 'en';
  return LANG_CODE_ALIASES[base] || base;
};

/**
 * Resolves full language + SVG flag metadata for a code or option object.
 *
 * @param {string|Object} codeOrItem
 * @returns {{ code: string, short: string, countryCode: string, nativeLabel: string, englishLabel: string, shapes: Array<{ tag: string, attrs: Object }>, isFallback: boolean }}
 */
export const resolveLangMeta = (codeOrItem) => {
  const itemObj = isObj(codeOrItem) ? codeOrItem : null;
  const rawCode = itemObj
    ? itemObj.code || itemObj.value || itemObj.id || 'en'
    : codeOrItem || 'en';
  const cleanRaw = String(rawCode).trim().toLowerCase().split(/[-_]/)[0] || 'en';
  const registryKey = normalizeLangCode(rawCode);
  const reg = LANG_FLAG_REGISTRY[registryKey] || null;

  const code = itemObj ? cleanRaw : (reg ? reg.code : cleanRaw);
  const short = String(itemObj?.short || code).toUpperCase();

  return {
    code,
    short,
    countryCode: itemObj?.countryCode || reg?.countryCode || short,
    nativeLabel: itemObj?.nativeLabel || itemObj?.label || reg?.nativeLabel || short,
    englishLabel: itemObj?.englishLabel || reg?.englishLabel || short,
    shapes: reg ? reg.shapes : FALLBACK_GLOBE_SHAPES,
    isFallback: !reg,
  };
};

/**
 * Normalizes an array of language strings (`['pl', 'en']`) or objects into canonical entries.
 *
 * @param {Array<string|Object>} languages
 * @returns {Array<ReturnType<typeof resolveLangMeta>>}
 */
export const normalizeLangOptions = (languages) => {
  if (!Array.isArray(languages) || languages.length === 0) {
    return [resolveLangMeta('pl'), resolveLangMeta('en')];
  }
  const seen = new Set();
  const out = [];
  for (const entry of languages) {
    const meta = resolveLangMeta(entry);
    if (!seen.has(meta.code)) {
      seen.add(meta.code);
      out.push(meta);
    }
  }
  return out;
};

const escapeXmlAttr = (val) =>
  String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Pure string renderer returning a standalone `<svg viewBox="0 0 24 18">` flag string.
 *
 * @param {string|Object} codeOrItem
 * @param {{ width?: number, height?: number, radius?: number, clipId?: string }} [opts]
 * @returns {string}
 */
export const renderLangFlagSvg = (
  codeOrItem,
  { width = 20, height = 15, radius = 3, clipId = '' } = {}
) => {
  const meta = resolveLangMeta(codeOrItem);
  const w = Math.max(8, Number(width) || 20);
  const h = Math.max(6, Number(height) || 15);
  const r = Math.max(0, Number(radius) || 0);
  const resolvedClipId = clipId || `nano-flag-clip-${meta.code}`;

  const shapesMarkup = meta.shapes
    .map(({ tag, attrs }) => {
      const attrPairs = Object.entries(attrs || {})
        .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
        .join(' ');
      return `<${tag} ${attrPairs} />`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18" width="${w}" height="${h}" aria-hidden="true" focusable="false">`,
    `<defs><clipPath id="${escapeXmlAttr(resolvedClipId)}"><rect x="0" y="0" width="24" height="18" rx="${r}" /></clipPath></defs>`,
    `<g clip-path="url(#${escapeXmlAttr(resolvedClipId)})">${shapesMarkup}</g>`,
    `<rect x="0.5" y="0.5" width="23" height="17" rx="${Math.max(0, r - 0.4)}" fill="none" stroke="rgba(148,163,184,0.38)" stroke-width="1" />`,
    `</svg>`,
  ].join('');
};
