// Ecosystem Shared Preferences Engine (@gkucmierz/nano-ui)
// Tier 1 (Same-Site *.7u.pl + 7u.pl): 64B First-Party Cookie `7u_prefs` (0.01ms Zero-FOUC) + `7u.pl/_prefs-bridge.html` iframe sync.
// Tier 2 (External Standalone eTLD+1s: serce.app, milowice.pl, instacode.app, screeny.pl, lol-inspector.app):
//   - Zero-FOUC URL Hash Handoff (`#7u_p=v1.dark.pl.1.<ts36>`) preserving 100% Cloudflare Edge cache & zero Referer leaks,
//     auto-cleaned before first paint via `history.replaceState`.
//   - Optional explicit Top-Level Handshake Bounce (`https://7u.pl/_prefs-bridge.html?sync_return=...`) against strict allowlist.

export const ECOSYSTEM_PREFS_COOKIE = '7u_prefs';
export const ECOSYSTEM_PREFS_HASH_PARAM = '7u_p';
export const ECOSYSTEM_PREFS_LS_KEY = '7u_ecosystem_prefs_v1';
export const ECOSYSTEM_ROOT_DOMAIN = '7u.pl';
export const ECOSYSTEM_BRIDGE_URL = 'https://7u.pl/_prefs-bridge.html';

export const ECOSYSTEM_EXTERNAL_DOMAINS = Object.freeze([
  'serce.app',
  'milowice.pl',
  'instacode.app',
  'screeny.pl',
  'lol-inspector.app',
]);

const VALID_THEMES = new Set(['dark', 'light']);
const VALID_SIDES = new Set(['left', 'right']);
const LANG_RE = /^[a-z]{2,5}$/;

const isPlainRecord = (val) => Boolean(val) && Object.prototype.toString.call(val) === '[object Object]';

const extractCandidateUrlString = (candidate) => {
  if (Object.prototype.toString.call(candidate) === '[object String]') return candidate;
  if (globalThis.MessageEvent && candidate instanceof globalThis.MessageEvent) {
    return candidate.origin || '';
  }
  if (candidate === globalThis) {
    return globalThis.location?.href ?? '';
  }
  return candidate?.href ?? candidate?.origin ?? '';
};

const matchesOwnedDomain = (hostname, domain) => {
  const host = String(hostname || '').toLowerCase();
  const base = String(domain || '').toLowerCase();
  return Boolean(host && base && (host === base || host.endsWith(`.${base}`)));
};

export const classifyEcosystemHost = (hostname = '') => {
  const host = String(hostname || '').toLowerCase().replace(/:\d+$/, '');
  if (!host) return { kind: 'unknown', registrableDomain: '' };
  if (matchesOwnedDomain(host, ECOSYSTEM_ROOT_DOMAIN)) {
    return { kind: '7u-same-site', registrableDomain: ECOSYSTEM_ROOT_DOMAIN };
  }
  for (const ext of ECOSYSTEM_EXTERNAL_DOMAINS) {
    if (matchesOwnedDomain(host, ext)) {
      return { kind: 'ecosystem-external', registrableDomain: ext };
    }
  }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.loc')) {
    return { kind: 'local-dev', registrableDomain: host };
  }
  return { kind: 'unknown', registrableDomain: '' };
};

/**
 * Validates web origins and sites using the modern `Origin` API (`Origin.from` / `isSameSite`)
 * when available, falling back to `new URL()` with explicit `'null'` opaque-origin rejection.
 */
export const isTrustedEcosystemOrigin = (candidate, { allowExternal = true, allowLocal = false } = {}) => {
  try {
    const allowedRoots = [
      `https://${ECOSYSTEM_ROOT_DOMAIN}`,
      ...(allowExternal ? ECOSYSTEM_EXTERNAL_DOMAINS.map((d) => `https://${d}`) : []),
    ];

    if ('Origin' in globalThis && globalThis.Origin?.from) {
      let parsedOrigin;
      try {
        parsedOrigin = globalThis.Origin.from(candidate);
      } catch {
        if (globalThis.MessageEvent && candidate instanceof globalThis.MessageEvent) {
          parsedOrigin = globalThis.Origin.from(candidate.origin);
        } else {
          throw new TypeError('Invalid origin candidate');
        }
      }
      if (!parsedOrigin || parsedOrigin.opaque) return false;
      for (const rootUrl of allowedRoots) {
        if (parsedOrigin.isSameSite(globalThis.Origin.from(rootUrl))) {
          return true;
        }
      }
      if (allowLocal) {
        const raw = extractCandidateUrlString(candidate);
        if (raw) {
          const u = new URL(raw);
          if (u.origin !== 'null' && classifyEcosystemHost(u.hostname).kind === 'local-dev') {
            return true;
          }
        }
      }
      return false;
    }

    const raw = extractCandidateUrlString(candidate);
    if (!raw || raw === 'null') return false;
    const url = new URL(raw);
    if (url.origin === 'null') return false;

    const hostInfo = classifyEcosystemHost(url.hostname);
    if (hostInfo.kind === 'local-dev') return Boolean(allowLocal);
    if (url.protocol !== 'https:') return false;
    if (hostInfo.kind === '7u-same-site') return true;
    if (allowExternal && hostInfo.kind === 'ecosystem-external') return true;
    return false;
  } catch {
    return false;
  }
};

export const normalizeEcosystemPrefs = (input = {}, fallbackNow = Date.now()) => {
  const src = isPlainRecord(input) ? input : {};
  const theme = VALID_THEMES.has(src.theme) ? src.theme : 'dark';
  const rawLang = String(src.lang || 'pl').trim().toLowerCase();
  const lang = LANG_RE.test(rawLang) ? rawLang : 'pl';
  const sound = src.sound === false || src.sound === 0 || src.sound === '0' ? false : true;
  const side = VALID_SIDES.has(src.side) ? src.side : 'left';
  const updatedAt = Number.isFinite(Number(src.updatedAt)) && Number(src.updatedAt) > 0
    ? Math.floor(Number(src.updatedAt))
    : Math.floor(fallbackNow);

  return {
    version: 'v1',
    theme,
    lang,
    sound,
    side,
    updatedAt,
  };
};

/**
 * Compact <= 64-byte token used for both `Domain=.7u.pl` cookie and `#7u_p=` cross-domain handoff:
 * Format: `v1.<theme>.<lang>.<1|0>.<l|r>.<updatedAtSecBase36>` (e.g. `v1.dark.pl.1.l.tr8k2` = 20 bytes!)
 */
export const encodeEcosystemPrefsToken = (prefs = {}) => {
  const norm = normalizeEcosystemPrefs(prefs);
  const tsSec36 = Math.max(0, Math.floor(norm.updatedAt / 1000)).toString(36);
  const sideCode = norm.side === 'right' ? 'r' : 'l';
  return `v1.${norm.theme}.${norm.lang}.${norm.sound ? '1' : '0'}.${sideCode}.${tsSec36}`;
};

export const decodeEcosystemPrefsToken = (rawToken = '') => {
  const clean = decodeURIComponent(String(rawToken || '').trim());
  if (!clean) return null;

  // Support compact dot format: v1.dark.pl.1.l.tr8k2
  if (clean.startsWith('v1.')) {
    const parts = clean.split('.');
    if (parts.length < 3) return null;
    const [, theme, lang, soundBit = '1', sideCode = 'l', ts36 = '0'] = parts;
    if (!VALID_THEMES.has(theme) || !LANG_RE.test(lang)) return null;
    const sec = parseInt(ts36, 36);
    return normalizeEcosystemPrefs({
      theme,
      lang,
      sound: soundBit !== '0',
      side: sideCode === 'r' ? 'right' : 'left',
      updatedAt: Number.isFinite(sec) && sec > 0 ? sec * 1000 : 0,
    }, 0);
  }

  // Also support key-value legacy spec format: v1:theme=dark:lang=pl:side=left
  if (clean.startsWith('v1:')) {
    const segments = clean.slice(3).split(':');
    const kv = {};
    for (const seg of segments) {
      const eq = seg.indexOf('=');
      if (eq > 0) {
        kv[seg.slice(0, eq)] = seg.slice(eq + 1);
      }
    }
    if (!VALID_THEMES.has(kv.theme)) return null;
    return normalizeEcosystemPrefs({
      theme: kv.theme,
      lang: kv.lang || 'pl',
      sound: kv.sound !== '0' && kv.sound !== 'false',
      side: kv.side || 'left',
      updatedAt: Number(kv.ts) || 0,
    }, 0);
  }

  return null;
};

export const buildEcosystemCookieString = (prefs, { hostname = '', secure = true, maxAgeSec = 31536000 } = {}) => {
  const token = encodeEcosystemPrefsToken(prefs);
  const hostInfo = classifyEcosystemHost(hostname);
  const attrs = [
    `${ECOSYSTEM_PREFS_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`,
    'SameSite=Lax',
  ];
  if (hostInfo.kind === '7u-same-site' || hostInfo.kind === 'ecosystem-external') {
    attrs.push(`Domain=.${hostInfo.registrableDomain}`);
  }
  if (secure && hostInfo.kind !== 'local-dev') {
    attrs.push('Secure');
  }
  return attrs.join('; ');
};

export const readEcosystemPrefsFromCookieHeader = (cookieString = '') => {
  const raw = String(cookieString || '');
  if (!raw) return null;
  const parts = raw.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${ECOSYSTEM_PREFS_COOKIE}=`)) {
      return decodeEcosystemPrefsToken(trimmed.slice(ECOSYSTEM_PREFS_COOKIE.length + 1));
    }
  }
  return null;
};

export const resolveLwwEcosystemPrefs = (localPrefs, incomingPrefs) => {
  if (!localPrefs && !incomingPrefs) return null;
  if (!localPrefs) return normalizeEcosystemPrefs(incomingPrefs);
  if (!incomingPrefs) return normalizeEcosystemPrefs(localPrefs);
  const a = normalizeEcosystemPrefs(localPrefs, 0);
  const b = normalizeEcosystemPrefs(incomingPrefs, 0);
  return b.updatedAt >= a.updatedAt ? b : a;
};

/**
 * Decorates cross-eTLD+1 ecosystem links (e.g. `7u.pl` -> `https://serce.app`, `https://milowice.pl`,
 * `https://instacode.app`) with `#7u_p=<token>` so target standalone domains adopt theme & language
 * before first paint (0ms FOUC) while keeping Cloudflare Edge HTML cache 100% intact.
 */
export const decorateEcosystemUrl = (href, prefs, { currentHostname = '' } = {}) => {
  try {
    const url = new URL(String(href || ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return String(href || '');

    const targetClass = classifyEcosystemHost(url.hostname);
    if (targetClass.kind !== '7u-same-site' && targetClass.kind !== 'ecosystem-external') {
      return String(href || '');
    }

    const sourceClass = classifyEcosystemHost(currentHostname);
    // Same-site *.7u.pl <-> *.7u.pl already shares `Domain=.7u.pl` cookie; only decorate when crossing eTLD+1!
    if (
      sourceClass.registrableDomain &&
      sourceClass.registrableDomain === targetClass.registrableDomain
    ) {
      return url.toString();
    }

    const token = encodeEcosystemPrefsToken(prefs);
    const rawHash = url.hash ? url.hash.slice(1) : '';
    if (!rawHash) {
      url.hash = `${ECOSYSTEM_PREFS_HASH_PARAM}=${token}`;
    } else if (rawHash.includes(`${ECOSYSTEM_PREFS_HASH_PARAM}=`)) {
      url.hash = rawHash.replace(
        new RegExp(`(^|[&?])${ECOSYSTEM_PREFS_HASH_PARAM}=[^&]*`),
        `$1${ECOSYSTEM_PREFS_HASH_PARAM}=${token}`
      );
    } else {
      url.hash = `${rawHash}&${ECOSYSTEM_PREFS_HASH_PARAM}=${token}`;
    }
    return url.toString();
  } catch {
    return String(href || '');
  }
};

export const extractAndStripEcosystemHash = (rawUrlString = '') => {
  try {
    const url = new URL(String(rawUrlString || ''));
    let extractedToken = null;

    if (url.searchParams.has(ECOSYSTEM_PREFS_HASH_PARAM)) {
      extractedToken = url.searchParams.get(ECOSYSTEM_PREFS_HASH_PARAM);
      url.searchParams.delete(ECOSYSTEM_PREFS_HASH_PARAM);
    }

    const rawHash = url.hash ? url.hash.slice(1) : '';
    if (rawHash) {
      const prefix = `${ECOSYSTEM_PREFS_HASH_PARAM}=`;
      if (rawHash.startsWith(prefix) && !rawHash.includes('&')) {
        extractedToken = rawHash.slice(prefix.length);
        url.hash = '';
      } else if (rawHash.includes(`&${prefix}`)) {
        const idx = rawHash.indexOf(`&${prefix}`);
        const rest = rawHash.slice(idx + 1 + prefix.length);
        const amp = rest.indexOf('&');
        extractedToken = amp >= 0 ? rest.slice(0, amp) : rest;
        const cleanedHash = rawHash.slice(0, idx) + (amp >= 0 ? rest.slice(amp) : '');
        url.hash = cleanedHash ? `#${cleanedHash}` : '';
      }
    }

    return {
      prefs: extractedToken ? decodeEcosystemPrefsToken(extractedToken) : null,
      cleanUrl: `${url.pathname}${url.search}${url.hash}`,
      fullCleanUrl: url.toString(),
    };
  } catch {
    return { prefs: null, cleanUrl: '', fullCleanUrl: String(rawUrlString || '') };
  }
};

export const buildEcosystemSyncBounceUrl = (returnUrl, { bridgeUrl = ECOSYSTEM_BRIDGE_URL } = {}) => {
  if (!isTrustedEcosystemOrigin(returnUrl, { allowExternal: true })) {
    return '';
  }
  const bridge = new URL(bridgeUrl);
  bridge.searchParams.set('sync_return', String(returnUrl));
  return bridge.toString();
};
