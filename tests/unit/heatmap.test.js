import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc';
import {
  HEATMAP_SCALES,
  HEATMAP_PALETTES,
  HEATMAP_ZERO_COLOR_DARK,
  HEATMAP_ZERO_COLOR_LIGHT,
  HEATMAP_DARK_L_MIN,
  HEATMAP_DARK_L_MAX,
  HEATMAP_LIGHT_L_MAX,
  HEATMAP_LIGHT_L_MIN,
  isHeatmapZeroValue,
  computeHeatmapScale,
  resolveHeatmapCellOklch,
  resolveHeatmapCellColor,
  resolveHeatmapCellRgb,
  resolveHeatmapTextColor,
  buildHeatmapColorLut,
  computeGaussianDensityGrid,
  normalizeHeatmapMatrixData,
  formatHeatmapCompactValue,
} from '../../src/utils/heatmapScale.js';
import {
  parseColor,
  isOklchInSrgbGamut,
  getWcagContrastRatio,
} from '../../src/utils/colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('heatmapScale — Zero-Value Invariant & Monotonic OKLCH Ramp', () => {
  it('enforces Zero-Value Invariant across 0, null, undefined, NaN, and negative inputs', () => {
    assert.deepEqual(HEATMAP_SCALES, ['log1p', 'p95', 'sqrt', 'linear']);
    assert.equal(isHeatmapZeroValue(0), true);
    assert.equal(isHeatmapZeroValue(-5), true);
    assert.equal(isHeatmapZeroValue(null), true);
    assert.equal(isHeatmapZeroValue(undefined), true);
    assert.equal(isHeatmapZeroValue(Number.NaN), true);
    assert.equal(isHeatmapZeroValue(''), true);
    assert.equal(isHeatmapZeroValue(1), false);
    assert.equal(isHeatmapZeroValue(0.001), false);

    const scale = computeHeatmapScale([0, null, Number.NaN, 20, 80, 150]);
    assert.equal(scale.normalize(0), 0);
    assert.equal(scale.normalize(null), 0);
    assert.equal(scale.normalize(undefined), 0);
    assert.equal(scale.normalize(Number.NaN), 0);
    assert.ok(scale.normalize(20) > 0, 'strictly positive values must normalize > 0');

    for (const palette of HEATMAP_PALETTES) {
      for (const isDark of [true, false]) {
        const zeroColor = resolveHeatmapCellColor(0, { palette, isDark, isZero: true });
        const lowestPositiveColor = resolveHeatmapCellColor(0, { palette, isDark, isZero: false });
        assert.notEqual(
          zeroColor,
          lowestPositiveColor,
          `Zero-Value Invariant violated for palette=${palette} isDark=${isDark}`
        );
        assert.equal(
          zeroColor,
          isDark ? HEATMAP_ZERO_COLOR_DARK : HEATMAP_ZERO_COLOR_LIGHT
        );
      }
    }
  });

  it('guarantees strictly monotonic OKLCH lightness (0.24->0.86 dark, 0.93->0.44 light) and sRGB gamut safety', () => {
    const steps = 25;
    for (const palette of HEATMAP_PALETTES) {
      let prevDarkL = -1;
      let prevLightL = 2;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const darkCss = resolveHeatmapCellColor(t, { palette, isDark: true, isZero: false });
        const lightCss = resolveHeatmapCellColor(t, { palette, isDark: false, isZero: false });

        const darkParsed = parseColor(darkCss);
        const lightParsed = parseColor(lightCss);
        assert.ok(darkParsed, `Failed to parse dark CSS color: ${darkCss}`);
        assert.ok(lightParsed, `Failed to parse light CSS color: ${lightCss}`);

        assert.ok(
          darkParsed.l > prevDarkL,
          `Dark mode L must strictly increase (${palette} at t=${t}: ${darkParsed.l} <= ${prevDarkL})`
        );
        assert.ok(
          lightParsed.l < prevLightL,
          `Light mode L must strictly decrease (${palette} at t=${t}: ${lightParsed.l} >= ${prevLightL})`
        );

        prevDarkL = darkParsed.l;
        prevLightL = lightParsed.l;

        const darkOklch = resolveHeatmapCellOklch(t, { palette, isDark: true, isZero: false });
        const lightOklch = resolveHeatmapCellOklch(t, { palette, isDark: false, isZero: false });
        assert.equal(
          isOklchInSrgbGamut(darkOklch.l, darkOklch.c, darkOklch.h, 0.002),
          true,
          `Dark OKLCH out of sRGB gamut for ${palette} at t=${t}`
        );
        assert.equal(
          isOklchInSrgbGamut(lightOklch.l, lightOklch.c, lightOklch.h, 0.002),
          true,
          `Light OKLCH out of sRGB gamut for ${palette} at t=${t}`
        );

        // Verify WCAG AA >= 4.5:1 text contrast on every cell intensity
        const darkFg = resolveHeatmapTextColor(t, { palette, isDark: true, isZero: false });
        const lightFg = resolveHeatmapTextColor(t, { palette, isDark: false, isZero: false });
        assert.ok(
          getWcagContrastRatio(darkCss, darkFg) >= 4.5,
          `WCAG AA contrast < 4.5 in dark mode for ${palette} at t=${t}`
        );
        assert.ok(
          getWcagContrastRatio(lightCss, lightFg) >= 4.5,
          `WCAG AA contrast < 4.5 in light mode for ${palette} at t=${t}`
        );
      }

      const startDark = parseColor(resolveHeatmapCellColor(0, { palette, isDark: true, isZero: false }));
      const endDark = parseColor(resolveHeatmapCellColor(1, { palette, isDark: true, isZero: false }));
      assert.ok(Math.abs(startDark.l - HEATMAP_DARK_L_MIN) < 1e-3);
      assert.ok(Math.abs(endDark.l - HEATMAP_DARK_L_MAX) < 1e-3);

      const startLight = parseColor(resolveHeatmapCellColor(0, { palette, isDark: false, isZero: false }));
      const endLight = parseColor(resolveHeatmapCellColor(1, { palette, isDark: false, isZero: false }));
      assert.ok(Math.abs(startLight.l - HEATMAP_LIGHT_L_MAX) < 1e-3);
      assert.ok(Math.abs(endLight.l - HEATMAP_LIGHT_L_MIN) < 1e-3);
    }
  });
});

describe('heatmapScale — Pareto / Heavy-Tailed Outlier Resilience & Quantization', () => {
  it('prevents a 10,000x viral spike from flattening normal 20..150 baseline traffic under log1p and p95', () => {
    const baselineAndSpike = [
      0, 0, 20, 28, 35, 42, 55, 68, 75, 88, 96, 110, 125, 138, 145, 150, 10000,
    ];

    const linear = computeHeatmapScale(baselineAndSpike, { scale: 'linear' });
    const sqrt = computeHeatmapScale(baselineAndSpike, { scale: 'sqrt' });
    const log1p = computeHeatmapScale(baselineAndSpike, { scale: 'log1p' });
    const p95 = computeHeatmapScale(baselineAndSpike, { scale: 'p95', clampPercentile: 0.95 });

    // Under naive linear scale, 150 / 10000 = 0.015 (flattened to < 2% of ramp!)
    assert.ok(linear.normalize(150) < 0.02);

    // Under sqrt, spread improves over linear
    assert.ok(sqrt.normalize(150) > linear.normalize(150));

    // Under log1p, normal baseline [20..150] retains rich perceptual contrast (> 0.20 spread and > 0.30 midpoint)
    assert.ok(log1p.normalize(20) > 0.3, `Expected log1p(20) > 0.3, got ${log1p.normalize(20)}`);
    assert.ok(log1p.normalize(150) > 0.5, `Expected log1p(150) > 0.5, got ${log1p.normalize(150)}`);
    assert.ok(log1p.normalize(150) - log1p.normalize(20) > 0.2);
    assert.equal(log1p.normalize(10000), 1);

    // Under p95, effectiveMax clamps at normal upper baseline (<= 150), completely isolating the 10,000 spike
    assert.equal(p95.effectiveMax, 150);
    assert.equal(p95.max, 10000);
    assert.ok(Math.abs(p95.normalize(75) - 0.5) < 1e-6);
    assert.equal(p95.normalize(150), 1);
    assert.equal(p95.normalize(10000), 1);
  });

  it('supports GitHub-style discrete bucket quantization (buckets = 5) while keeping 0 strictly separate', () => {
    const sc = computeHeatmapScale([0, 5, 25, 80, 200, 600], {
      scale: 'log1p',
      buckets: 5,
    });
    assert.equal(sc.normalize(0), 0);
    const levels = [5, 25, 80, 200, 600].map(v => sc.normalize(v));
    for (const lv of levels) {
      assert.ok(
        [0.2, 0.4, 0.6, 0.8, 1].some(step => Math.abs(lv - step) < 1e-6),
        `Bucketed level ${lv} must snap to {0.2, 0.4, 0.6, 0.8, 1.0}`
      );
    }
    assert.equal(sc.normalize(600), 1);
  });

  it('handles empty or all-zero datasets deterministically without NaN', () => {
    const empty = computeHeatmapScale([0, 0, null, undefined, Number.NaN]);
    assert.equal(empty.min, 0);
    assert.equal(empty.max, 0);
    assert.equal(empty.effectiveMax, 0);
    assert.equal(empty.normalize(0), 0);
    assert.equal(empty.normalize(100), 0);
    assert.deepEqual(empty.ticks, [0]);
  });
});

describe('computeGaussianDensityGrid & Matrix Normalization', () => {
  it('returns a pure zero grid with max = 0 when points = [] (Zero Synthetic Data)', () => {
    const res = computeGaussianDensityGrid([], { cols: 24, rows: 16, radius: 2.4 });
    assert.equal(res.cols, 24);
    assert.equal(res.rows, 16);
    assert.equal(res.max, 0);
    assert.equal(res.min, 0);
    assert.equal(res.pointCount, 0);
    assert.equal(res.totalWeight, 0);
    assert.equal(res.cells.every(v => v === 0), true);
  });

  it('accumulates deterministic 2D Gaussian KDE peaks around real [0..1] coordinates', () => {
    const res = computeGaussianDensityGrid(
      [
        { x: 0.5, y: 0.5, weight: 4 },
        { x: 0.5, y: 0.5, weight: 2 },
      ],
      { cols: 21, rows: 21, radius: 2.0 }
    );
    assert.equal(res.pointCount, 2);
    assert.equal(res.totalWeight, 6);
    // Exact center cell (10, 10) must hold the global maximum = 6.0
    assert.ok(Math.abs(res.grid[10][10] - 6) < 1e-9);
    assert.equal(res.max, res.grid[10][10]);
    // Corners far from center decay near zero
    assert.ok(res.grid[0][0] < 0.001);
    // Symmetric radially
    assert.ok(Math.abs(res.grid[10][8] - res.grid[8][10]) < 1e-9);
  });

  it('normalizes 2D arrays, sparse { rowId, colId, value } records, and keyed maps identically', () => {
    const rows = [{ id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }];
    const cols = [{ id: 'h0', label: '00' }, { id: 'h1', label: '01' }];

    const fromMatrix = normalizeHeatmapMatrixData(rows, cols, [
      [0, 12],
      [30, 8],
    ]);
    const fromRecords = normalizeHeatmapMatrixData(rows, cols, [
      { rowId: 'mon', colId: 'h0', value: 0 },
      { rowId: 'mon', colId: 'h1', value: 12 },
      { rowId: 'tue', colId: 'h0', value: 30 },
      { rowId: 'tue', colId: 'h1', value: 8 },
    ]);
    const fromDict = normalizeHeatmapMatrixData(rows, cols, {
      'mon::h1': 12,
      tue: { h0: 30, h1: 8 },
    });

    assert.deepEqual(fromMatrix.values2D, [[0, 12], [30, 8]]);
    assert.deepEqual(fromRecords.values2D, [[0, 12], [30, 8]]);
    assert.deepEqual(fromDict.values2D, [[null, 12], [30, 8]]);
    assert.deepEqual(fromMatrix.rowTotals, [12, 38]);
    assert.deepEqual(fromMatrix.colTotals, [30, 20]);
    assert.equal(fromMatrix.grandTotal, 50);

    const lut = buildHeatmapColorLut({ palette: 'cyan-ruby', isDark: true });
    assert.equal(lut.length, 256 * 3);
    const rgb = resolveHeatmapCellRgb(0.5, { palette: 'emerald', isDark: true });
    assert.ok(rgb.r >= 0 && rgb.r <= 255);
    assert.equal(formatHeatmapCompactValue(12400), '12k');
  });
});

describe('NanoHeatmap SFC, Package Exports & CSS-HOVER-01 Stationary Invariant', () => {
  it('exports NanoHeatmap and all heatmapScale utilities from src/index.js', () => {
    const indexSrc = fs.readFileSync(path.join(rootDir, 'src/index.js'), 'utf8');
    const requiredSymbols = [
      'NanoHeatmap',
      'HEATMAP_SCALES',
      'HEATMAP_PALETTES',
      'computeHeatmapScale',
      'resolveHeatmapCellColor',
      'resolveHeatmapTextColor',
      'computeGaussianDensityGrid',
      'normalizeHeatmapMatrixData',
    ];
    for (const sym of requiredSymbols) {
      assert.match(indexSrc, new RegExp(`\\b${sym}\\b`), `src/index.js must export ${sym}`);
    }
    assert.match(
      indexSrc,
      /app\.component\(`\$\{cp\}NanoHeatmap`,\s*NanoHeatmap\)/,
      'NanoHeatmap must be registered in Vue plugin install()'
    );
  });

  it('compiles NanoHeatmap.vue cleanly and forbids transform scale/translate on :hover (CSS-HOVER-01 / CLS=0)', () => {
    const sfcPath = path.join(rootDir, 'src/components/NanoHeatmap.vue');
    const source = fs.readFileSync(sfcPath, 'utf8');
    const { descriptor, errors } = parse(source, { filename: 'NanoHeatmap.vue' });
    assert.equal(errors.length, 0, 'NanoHeatmap.vue must parse without SFC errors');

    const compiledScript = compileScript(descriptor, { id: 'nano-heatmap-test' });
    assert.ok(compiledScript.content.includes('useCoupledSelection'));

    const compiledTemplate = compileTemplate({
      source: descriptor.template.content,
      filename: 'NanoHeatmap.vue',
      id: 'nano-heatmap-test',
    });
    assert.equal(compiledTemplate.errors.length, 0, 'Template must compile with zero errors');
    assert.match(descriptor.template.content, /role="grid"/);
    assert.match(descriptor.template.content, /role="gridcell"/);
    assert.match(descriptor.template.content, /<canvas\b/);

    for (const styleBlock of descriptor.styles) {
      const compiledCss = compileStyle({
        source: styleBlock.content,
        filename: 'NanoHeatmap.vue',
        id: 'data-v-heatmaptest',
        scoped: Boolean(styleBlock.scoped),
      });
      assert.equal(compiledCss.errors.length, 0, 'Scoped CSS must compile cleanly');
      assert.doesNotMatch(
        styleBlock.content,
        /transform\s*:\s*[^;]*(scale|translate)/i,
        'NanoHeatmap CSS must never use transform scale/translate (CLS = 0 & CSS-HOVER-01)'
      );
    }
  });
});
