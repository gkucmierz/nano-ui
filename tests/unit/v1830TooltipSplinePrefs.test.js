import test from 'node:test';
import assert from 'node:assert/strict';
import {
  showTooltip,
  hideTooltip,
  tooltipState,
  isActiveTooltipTarget,
  recordTooltipPointerPosition,
  recordTooltipKeyActivity,
  shouldSuppressSyntheticMouseLeave,
} from '../../src/composables/useTooltip.js';
import { tooltipDirective } from '../../src/directives/tooltip.js';
import {
  computeMonotoneTangents,
  buildMonotoneSplinePath,
  evaluateMonotoneSplineY,
  evaluateSplineY,
} from '../../src/utils/kinetics.js';
import {
  encodeEcosystemPrefsToken,
  decodeEcosystemPrefsToken,
  buildEcosystemCookieString,
  readEcosystemPrefsFromCookieHeader,
  isTrustedEcosystemOrigin,
  decorateEcosystemUrl,
  extractAndStripEcosystemHash,
  resolveLwwEcosystemPrefs,
  buildEcosystemSyncBounceUrl,
} from '../../src/utils/ecosystemPrefs.js';

const createMockButton = (rect = { left: 100, top: 40, right: 180, bottom: 76, width: 80, height: 36 }) => {
  const attrs = new Map();
  const listeners = new Map();
  return {
    nodeType: 1,
    isConnected: true,
    hasAttribute: (k) => attrs.has(k),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) ?? null,
    getBoundingClientRect: () => ({ ...rect }),
    matches: () => false,
    contains: () => false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    _listeners: listeners,
  };
};

test('v-tooltip stays visible on stationary pointer during T/L keypress and updates text live', () => {
  const hoveredBtn = createMockButton();
  const siblingIcon = createMockButton({ left: 200, top: 40, right: 236, bottom: 76, width: 36, height: 36 });

  tooltipDirective.mounted(hoveredBtn, { value: 'Motyw jasny [T]' });
  tooltipDirective.mounted(siblingIcon, { value: 'Ikona' });

  const now = Date.now() - 5000;
  recordTooltipPointerPosition(140, 58);
  showTooltip(hoveredBtn, 'Motyw jasny [T]');
  assert.equal(tooltipState.isVisible, true);
  assert.equal(isActiveTooltipTarget(hoveredBtn), true);

  // 1. Unmounting an unrelated v-if icon during theme switch must NOT hide active tooltip
  tooltipDirective.unmounted(siblingIcon);
  assert.equal(tooltipState.isVisible, true);

  // 2. Pressing `T` causes OS cursor auto-hide -> synthetic mouseleave at stationary coordinates (140, 58)
  recordTooltipKeyActivity('t', now);
  assert.equal(
    shouldSuppressSyntheticMouseLeave(hoveredBtn, { clientX: 140, clientY: 58 }, { now: now + 35, lastKeyAt: now }),
    true
  );

  // 3. Reactive label update (`L` language change or `T` label flip) updates text even if :hover is false
  tooltipDirective.updated(hoveredBtn, { value: 'Light theme [T]' });
  assert.equal(tooltipState.isVisible, true);
  assert.equal(tooltipState.text, 'Light theme [T]');
  assert.equal(hoveredBtn.getAttribute('aria-label'), 'Light theme [T]');

  // 4. Real mouse movement outside the button rect does NOT suppress mouseleave
  assert.equal(
    shouldSuppressSyntheticMouseLeave(hoveredBtn, { clientX: 25, clientY: 10 }, { now: now + 50, lastKeyAt: now }),
    false
  );

  // 5. Pressing Escape dismisses tooltip immediately (WCAG 1.4.13)
  recordTooltipKeyActivity('Escape', now + 100);
  assert.equal(tooltipState.isVisible, false);
  hideTooltip();
});

test('NanoTrendChart Fritsch-Carlson monotone spline eliminates Catmull-Rom overshoot on step jumps', () => {
  const stepSeries = [
    { x: 0, y: 200 },
    { x: 60, y: 200 },
    { x: 120, y: 200 },
    { x: 180, y: 100 },
    { x: 240, y: 100 },
    { x: 300, y: 100 },
  ];

  // Classic Catmull-Rom bulges past [100, 200] around the step jump:
  const catmullBeforeStep = evaluateSplineY(stepSeries, 105, 0.35);
  assert.ok(catmullBeforeStep > 200, 'Catmull-Rom exhibits expected overshoot before step jump');

  // Fritsch-Carlson monotone Hermite spline stays strictly inside [100, 200] everywhere:
  const tangents = computeMonotoneTangents(stepSeries);
  for (let x = 0; x <= 300; x += 2) {
    const y = evaluateMonotoneSplineY(stepSeries, x, tangents);
    assert.ok(y >= 100 - 1e-9 && y <= 200 + 1e-9, `Monotone spline overshot at x=${x}: y=${y}`);
  }
  const svgPath = buildMonotoneSplinePath(stepSeries, { tangents, groundY: 260 });
  assert.match(svgPath, /^M 0\.00 200\.00 C /);
  assert.match(svgPath, /L 0\.00 260\.00 Z$/);
});

test('ecosystemPrefs encodes <=64B cookies, validates origins safely, and hands off prefs to external domains', () => {
  const pastTs = Date.now() - 120_000;
  const olderTs = pastTs - 60_000;

  const token = encodeEcosystemPrefsToken({ theme: 'light', lang: 'en', sound: false, side: 'right', updatedAt: pastTs });
  assert.ok(Buffer.byteLength(token, 'utf8') <= 64);

  const decoded = decodeEcosystemPrefsToken(token);
  assert.equal(decoded.theme, 'light');
  assert.equal(decoded.lang, 'en');
  assert.equal(decoded.sound, false);
  assert.equal(decoded.side, 'right');

  // Legacy spec format compatibility
  const legacy = decodeEcosystemPrefsToken('v1:theme=dark:lang=pl:side=left');
  assert.equal(legacy.theme, 'dark');
  assert.equal(legacy.lang, 'pl');

  // Cookie scoping: Domain=.7u.pl on *.7u.pl vs Domain=.serce.app on serce.app
  const cookie7u = buildEcosystemCookieString(decoded, { hostname: 'mem-index.7u.pl' });
  assert.match(cookie7u, /Domain=\.7u\.pl/);
  assert.match(cookie7u, /SameSite=Lax/);
  assert.match(cookie7u, /Secure/);
  assert.equal(readEcosystemPrefsFromCookieHeader(cookie7u).theme, 'light');

  const cookieSerce = buildEcosystemCookieString(decoded, { hostname: 'serce.app' });
  assert.match(cookieSerce, /Domain=\.serce\.app/);

  // Strict origin validation (rejects opaque "null", http downgrade, and suffix spoofing)
  assert.equal(isTrustedEcosystemOrigin('https://7u.pl'), true);
  assert.equal(isTrustedEcosystemOrigin('https://analytics.7u.pl'), true);
  assert.equal(isTrustedEcosystemOrigin('https://serce.app'), true);
  assert.equal(isTrustedEcosystemOrigin('https://milowice.pl'), true);
  assert.equal(isTrustedEcosystemOrigin('https://instacode.app'), true);
  assert.equal(isTrustedEcosystemOrigin('null'), false);
  assert.equal(isTrustedEcosystemOrigin('http://7u.pl'), false);
  assert.equal(isTrustedEcosystemOrigin('https://7u.pl.evil.example'), false);
  assert.equal(isTrustedEcosystemOrigin('https://serce.app', { allowExternal: false }), false);

  // Cross-eTLD+1 link decoration (#7u_p=...) preserves existing route hashes & skips same-site links
  const sameSiteHref = decorateEcosystemUrl('https://heart.7u.pl/', decoded, { currentHostname: '7u.pl' });
  assert.equal(sameSiteHref, 'https://heart.7u.pl/');

  const crossSiteHref = decorateEcosystemUrl('https://serce.app/#help', decoded, { currentHostname: '7u.pl' });
  assert.match(crossSiteHref, /^https:\/\/serce\.app\/#help&7u_p=v1\.light\.en\.0\.r\./);

  const stripped = extractAndStripEcosystemHash(crossSiteHref);
  assert.equal(stripped.cleanUrl, '/#help');
  assert.equal(stripped.prefs.theme, 'light');
  assert.equal(stripped.prefs.lang, 'en');

  // LWW conflict resolution
  const merged = resolveLwwEcosystemPrefs(
    { theme: 'dark', lang: 'pl', updatedAt: olderTs },
    { theme: 'light', lang: 'de', updatedAt: pastTs }
  );
  assert.equal(merged.theme, 'light');
  assert.equal(merged.lang, 'de');

  assert.match(
    buildEcosystemSyncBounceUrl('https://milowice.pl/mapa'),
    /^https:\/\/7u\.pl\/_prefs-bridge\.html\?sync_return=https%3A%2F%2Fmilowice\.pl%2Fmapa$/
  );
  assert.equal(buildEcosystemSyncBounceUrl('https://evil.example/phish'), '');
});
