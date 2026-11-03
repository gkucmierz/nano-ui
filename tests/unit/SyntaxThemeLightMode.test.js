import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileStyle } from '@vue/compiler-sfc';
import { SYNTAX_THEMES, highlightCode } from '../../src/utils/syntax-highlighter.js';
import { getWcagContrastRatio } from '../../src/utils/colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');
const syntaxCssPath = path.join(srcDir, 'assets', 'syntax-themes.css');

const walkVueFiles = (dir) => {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkVueFiles(fullPath));
    } else if (entry.name.endsWith('.vue')) {
      results.push(fullPath);
    }
  }
  return results;
};

/**
 * Parses `syntax-themes.css` into dark and light variable maps for each theme ID.
 */
const parseSyntaxThemesCss = (cssText) => {
  const darkThemes = {};
  const lightThemes = {};

  const blockRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = blockRegex.exec(cssText)) !== null) {
    const rawSelector = match[1].trim();
    const body = match[2].trim();

    const vars = {};
    const propRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let propMatch;
    while ((propMatch = propRegex.exec(body)) !== null) {
      vars[propMatch[1].trim()] = propMatch[2].trim();
    }
    if (Object.keys(vars).length === 0) continue;

    for (const theme of SYNTAX_THEMES) {
      const attrToken = `[data-syntax-theme="${theme.id}"]`;
      if (!rawSelector.includes(attrToken)) continue;

      const isLight = rawSelector.includes('data-theme="light"');
      if (isLight) {
        lightThemes[theme.id] = { ...(lightThemes[theme.id] || {}), ...vars };
      } else {
        darkThemes[theme.id] = { ...(darkThemes[theme.id] || {}), ...vars };
      }
    }
  }

  return { darkThemes, lightThemes };
};

const REQUIRED_HL_TOKENS = [
  '--nano-code-bg',
  '--nano-code-header-bg',
  '--hl-keyword',
  '--hl-string',
  '--hl-number',
  '--hl-boolean',
  '--hl-comment',
  '--hl-tag',
  '--hl-attr',
  '--hl-func',
  '--hl-prop',
  '--hl-var',
  '--hl-type',
  '--hl-builtin',
  '--hl-punct',
  '--hl-params',
  '--hl-symbol',
  '--hl-operator',
];

describe('Global Syntax Highlighting & Scoped Light/Dark Theme Architecture', () => {
  test('no Vue SFC <style scoped> in src/ compiles to dead :root[data-v-*] or [data-theme][data-v-*] selectors', () => {
    const vueFiles = walkVueFiles(srcDir);
    assert.ok(vueFiles.length > 0, 'Should discover .vue files in src/');

    for (const file of vueFiles) {
      const relPath = path.relative(rootDir, file);
      const content = fs.readFileSync(file, 'utf8');
      const { descriptor } = parse(content);

      for (const style of descriptor.styles) {
        if (!style.scoped) continue;
        const compiled = compileStyle({
          source: style.content,
          filename: relPath,
          id: 'data-v-audit',
          scoped: true,
        });

        assert.equal(compiled.errors.length, 0, `${relPath} should compile scoped CSS without errors`);

        const deadRootScopeRegex = /(:root|html|\[data-theme[^\]]*\])\[data-v-audit\]/;
        assert.equal(
          deadRootScopeRegex.test(compiled.code),
          false,
          `${relPath} contains a dead scoped root selector (:root / html / [data-theme] directly before :deep() attaches [data-v-*] to <html>, which never matches)`
        );
      }
    }
  });

  test('NanoCodeEditor and NanoCodeBlock delegate all .hljs-* colors to var(--hl-*) CSS custom properties', () => {
    for (const compName of ['NanoCodeEditor.vue', 'NanoCodeBlock.vue']) {
      const filePath = path.join(srcDir, 'components', compName);
      const sfc = fs.readFileSync(filePath, 'utf8');
      const { descriptor } = parse(sfc);
      const styleContent = descriptor.styles.map((s) => s.content).join('\n');

      assert.match(
        descriptor.template.content,
        /:data-syntax-theme=/,
        `${compName} must bind :data-syntax-theme on its root element`
      );

      const hljsRuleRegex = /:deep\(\.hljs-[^)]+\)[^{]*\{([^}]+)\}/g;
      let match;
      let count = 0;
      while ((match = hljsRuleRegex.exec(styleContent)) !== null) {
        count++;
        const ruleBody = match[1];
        if (/color\s*:/.test(ruleBody)) {
          assert.match(
            ruleBody,
            /color\s*:\s*var\(--hl-/,
            `${compName} .hljs-* rule must use var(--hl-*) instead of hardcoded hex: ${ruleBody.trim()}`
          );
        }
      }
      assert.ok(count >= 10, `${compName} should define scoped fallback .hljs-* rules backed by var(--hl-*)`);
    }
  });

  test('all 8 SYNTAX_THEMES define complete, distinct Dark and Light Mode palettes in syntax-themes.css', () => {
    const cssText = fs.readFileSync(syntaxCssPath, 'utf8');
    const { darkThemes, lightThemes } = parseSyntaxThemesCss(cssText);

    const lightSignatures = new Set();
    const darkSignatures = new Set();

    for (const theme of SYNTAX_THEMES) {
      const dark = darkThemes[theme.id];
      const light = lightThemes[theme.id];

      assert.ok(dark, `Missing Dark Mode CSS block for [data-syntax-theme="${theme.id}"]`);
      assert.ok(light, `Missing Light Mode CSS block for [data-theme="light"] [data-syntax-theme="${theme.id}"]`);

      for (const token of REQUIRED_HL_TOKENS) {
        assert.ok(dark[token], `Theme "${theme.id}" (dark) is missing ${token}`);
        assert.ok(light[token], `Theme "${theme.id}" (light) is missing ${token}`);
      }

      const darkSig = REQUIRED_HL_TOKENS.map((k) => dark[k]).join('|');
      const lightSig = REQUIRED_HL_TOKENS.map((k) => light[k]).join('|');

      assert.equal(
        darkSignatures.has(darkSig),
        false,
        `Theme "${theme.id}" (dark) duplicates another theme's token signature`
      );
      assert.equal(
        lightSignatures.has(lightSig),
        false,
        `Theme "${theme.id}" (light) duplicates another theme's token signature`
      );

      darkSignatures.add(darkSig);
      lightSignatures.add(lightSig);
    }
  });

  test('every Light Mode syntax theme differentiates core token categories (number, boolean, attr, func, keyword, builtin, symbol) and meets WCAG contrast', () => {
    const cssText = fs.readFileSync(syntaxCssPath, 'utf8');
    const { lightThemes } = parseSyntaxThemesCss(cssText);

    const coreRoles = [
      '--hl-keyword',
      '--hl-string',
      '--hl-number',
      '--hl-boolean',
      '--hl-attr',
      '--hl-func',
      '--hl-builtin',
      '--hl-symbol',
    ];

    for (const theme of SYNTAX_THEMES) {
      const light = lightThemes[theme.id];
      const bg = light['--nano-code-bg'];

      const distinctCoreColors = new Set(coreRoles.map((role) => light[role].toLowerCase()));
      assert.ok(
        distinctCoreColors.size >= 7,
        `Light Mode theme "${theme.id}" collapses too many core syntax tokens into the same color (found ${distinctCoreColors.size} unique colors across ${coreRoles.length} core roles)`
      );

      assert.notEqual(
        light['--hl-number'].toLowerCase(),
        light['--hl-attr'].toLowerCase(),
        `Light Mode theme "${theme.id}" must not use the exact same color for --hl-number and --hl-attr`
      );
      assert.notEqual(
        light['--hl-number'].toLowerCase(),
        light['--hl-boolean'].toLowerCase(),
        `Light Mode theme "${theme.id}" must not use the exact same color for --hl-number and --hl-boolean`
      );

      for (const role of coreRoles) {
        const tokenHex = light[role];
        const ratio = getWcagContrastRatio(tokenHex, bg);
        assert.ok(
          ratio >= 4.0,
          `Light Mode theme "${theme.id}" token ${role} (${tokenHex}) has insufficient contrast (${ratio.toFixed(2)}:1) against ${bg}`
        );
      }
    }
  });

  test('nanosound parser highlights all tokens in sounds/retro-laser-pew.nsd including fm:, q:, ripple:, symbols, and operators', () => {
    const snippet = `# NanoSound Algebraic DSL (.nsd) — Procedural Laser & Harmonic Chime
seq(
  0ms: saw(glide(1900Hz, 110Hz, exp, 120ms)) * lpf(2800Hz, q:1.8) * expDecay(45ms),
  65ms: 0.75 * sin(880Hz, fm:2.0*0.35) * cheby(3200Hz, ripple:1.5) * adsr(2ms, 28ms, 0.5, 90ms)
)`;
    const html = highlightCode(snippet, 'nanosound');

    assert.match(html, /<span class="hljs-symbol">0ms<\/span>/);
    assert.match(html, /<span class="hljs-attr">q<\/span>/);
    assert.match(html, /<span class="hljs-attr">fm<\/span>/);
    assert.match(html, /<span class="hljs-attr">ripple<\/span>/);
    assert.match(html, /<span class="hljs-literal">exp<\/span>/);
    assert.match(html, /<span class="hljs-built_in">lpf<\/span>/);
    assert.match(html, /<span class="hljs-operator">\*<\/span>/);
  });
});
