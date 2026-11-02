import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeVerticalBands,
  createWeekdayBandConfig,
  computeWeekendBands,
  getDateWeekdayInfo,
} from '../../src/utils/chart-bands.js';
import {
  evaluateSplineY,
  buildSplinePath,
} from '../../src/utils/kinetics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('Generic Vertical Bands (X-Axis Domain Agnostic)', () => {
  test('computes merged and single vertical bands on non-date X axes (frequency / algorithmic steps)', () => {
    const freqPoints = [
      { x: 100, key: '20Hz', label: '20Hz' },
      { x: 200, key: '40Hz', label: '40Hz' },
      { x: 300, key: '80Hz', label: '80Hz' },
      { x: 400, key: '250Hz', label: '250Hz' },
      { x: 500, key: '1kHz', label: '1kHz' },
      { x: 600, key: '10kHz', label: '10kHz' },
    ];

    // 1. Merged adjacent bands (indices 0..1 -> 'B1–B2', index 5 -> single 'AIR')
    const merged = computeVerticalBands(freqPoints, 60, 640, {
      mergeAdjacent: true,
      match: (pt, idx) => {
        if (idx === 0) return { match: true, label: 'B1', group: 'bass' };
        if (idx === 1) return { match: true, label: 'B2', group: 'bass' };
        if (idx === 5) return { match: true, label: 'AIR', group: 'air' };
        return false;
      },
    });

    assert.equal(merged.length, 2);
    assert.equal(merged[0].label, 'B1–B2');
    assert.deepEqual(merged[0].keys, ['20Hz', '40Hz']);
    assert.equal(merged[0].dividers.length, 1);
    assert.equal(merged[0].dividerX, 150);

    assert.equal(merged[1].label, 'AIR');
    assert.deepEqual(merged[1].keys, ['10kHz']);
    assert.equal(merged[1].dividers.length, 0);
    assert.equal(merged[1].dividerX, null);

    // 2. Unmerged single-point bands (mergeAdjacent: false -> 'B1', 'B2', 'AIR')
    const unmerged = computeVerticalBands(freqPoints, 60, 640, {
      mergeAdjacent: false,
      match: (pt, idx) => {
        if (idx === 0) return { match: true, label: 'B1', group: 'bass' };
        if (idx === 1) return { match: true, label: 'B2', group: 'bass' };
        if (idx === 5) return { match: true, label: 'AIR', group: 'air' };
        return false;
      },
    });

    assert.equal(unmerged.length, 3);
    assert.equal(unmerged[0].label, 'B1');
    assert.equal(unmerged[1].label, 'B2');
    assert.equal(unmerged[2].label, 'AIR');
  });

  test('supports explicit range definitions by index or key', () => {
    const stepPoints = [
      { x: 50, key: 'N=16' },
      { x: 150, key: 'N=64' },
      { x: 250, key: 'N=256' },
      { x: 350, key: 'N=1024' },
    ];

    const bands = computeVerticalBands(stepPoints, 20, 380, [
      { fromKey: 'N=16', toKey: 'N=64', label: 'L1 CACHE' },
      { index: 3, label: 'DRAM' },
    ]);

    assert.equal(bands.length, 2);
    assert.equal(bands[0].label, 'L1 CACHE');
    assert.equal(bands[0].x, 20);
    assert.equal(bands[0].width, 180);
    assert.deepEqual(bands[0].dividers, [100]);

    assert.equal(bands[1].label, 'DRAM');
    assert.equal(bands[1].x, 300);
    assert.equal(bands[1].width, 80);
  });

  test('supports calendar weekday preset for SB/ND single and SB–ND / PT–ND merged bands', () => {
    const datePoints = [
      { x: 100, date: '2026-10-16' }, // Fri (5)
      { x: 200, date: '2026-10-17' }, // Sat (6)
      { x: 300, date: '2026-10-18' }, // Sun (0)
      { x: 400, date: '2026-10-19' }, // Mon (1)
    ];

    const weekendPl = computeWeekendBands(datePoints, 60, 440, 'pl');
    assert.equal(weekendPl.length, 1);
    assert.equal(weekendPl[0].label, 'SB–ND');
    assert.equal(weekendPl[0].dividerX, 250);
    assert.deepEqual(weekendPl[0].days, [6, 0]);

    // 3-day merged band (Fri + Sat + Sun -> PT–ND with 2 internal dividers)
    const threeDay = computeVerticalBands(
      datePoints,
      60,
      440,
      createWeekdayBandConfig({ lang: 'pl', days: [5, 6, 0], mergeAdjacent: true })
    );
    assert.equal(threeDay.length, 1);
    assert.equal(threeDay[0].label, 'PT–ND');
    assert.deepEqual(threeDay[0].dividers, [150, 250]);

    // Weekday info helper
    const satInfo = getDateWeekdayInfo('2026-10-17', 'pl');
    assert.deepEqual(satInfo, { day: 6, isWeekend: true, shortName: 'Sb' });

    // Multi-day / weekly snapshot interpolation (e.g. Wednesday to Wednesday 7-day intervals)
    const weeklyPoints = [
      { x: 100, date: '2026-09-16' }, // Wed
      { x: 240, date: '2026-09-23' }, // Wed (+7 days -> Sat 09-19 & Sun 09-20 inside interval)
      { x: 380, date: '2026-09-30' }, // Wed (+7 days -> Sat 09-26 & Sun 09-27 inside interval)
    ];
    const weeklyBands = computeWeekendBands(weeklyPoints, 60, 420, 'pl');
    assert.equal(weeklyBands.length, 2);
    assert.equal(weeklyBands[0].label, 'SB–ND');
    assert.deepEqual(weeklyBands[0].dates, ['2026-09-19', '2026-09-20']);
    assert.equal(weeklyBands[1].label, 'SB–ND');
    assert.deepEqual(weeklyBands[1].dates, ['2026-09-26', '2026-09-27']);
    assert.ok(Math.abs(weeklyBands[0].width - weeklyBands[1].width) < 0.05);

    // Mixed weekly + daily sampling on linear calendar X-axis must keep all full SB–ND bands identical in width
    const mixedDates = ['2026-09-30', '2026-10-07', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-31', '2026-11-01', '2026-11-02'];
    const t0 = Date.parse(`${mixedDates[0]}T12:00:00Z`);
    const tN = Date.parse(`${mixedDates[mixedDates.length - 1]}T12:00:00Z`);
    const mixedPoints = mixedDates.map((d) => ({
      date: d,
      key: d,
      x: 64 + ((Date.parse(`${d}T12:00:00Z`) - t0) / (tN - t0)) * 872,
    }));
    const mixedBands = computeWeekendBands(mixedPoints, 64, 936, 'pl');
    const fullWeekends = mixedBands.filter((b) => b.label === 'SB–ND');
    assert.equal(fullWeekends.length, 5);
    for (let i = 1; i < fullWeekends.length; i++) {
      assert.ok(
        Math.abs(fullWeekends[i].width - fullWeekends[0].width) < 0.05,
        `Weekend ${i} width (${fullWeekends[i].width}) must match weekend 0 width (${fullWeekends[0].width})`
      );
    }
  });
});

describe('evaluateSplineY & Kinetic Spline Path Fidelity', () => {
  test('evaluates exact knot Y coordinates and smooth intermediate values along Catmull-Rom spline', () => {
    const pts = [
      { x: 100, y: 200 },
      { x: 200, y: 120 },
      { x: 300, y: 160 },
      { x: 400, y: 80 },
    ];
    const pathD = buildSplinePath(pts, { tension: 0.35 });
    assert.ok(pathD.startsWith('M 100.0 200.0 C'));

    for (const pt of pts) {
      const yAtKnot = evaluateSplineY(pts, pt.x, 0.35);
      assert.ok(Math.abs(yAtKnot - pt.y) < 1e-3);
    }

    const midY = evaluateSplineY(pts, 150, 0.35);
    assert.ok(midY < 200 && midY > 110);
  });
});

describe('.nano-btn-group Active Border Preservation on Next-Sibling Hover', () => {
  test('primitives.css enforces z-index stacking and padding-box clipping on .nano-btn-group items', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/assets/primitives.css'), 'utf8');
    assert.ok(css.includes('background-clip: padding-box;'), 'must clip button background to padding-box');
    assert.ok(css.includes('.nano-btn-group > .nano-btn:hover:not(:disabled)'), 'must define hover z-index rule');
    assert.ok(css.includes('.nano-btn-group > .nano-btn.nano-btn-active'), 'must elevate active button above hovered sibling');
    assert.ok(css.includes('z-index: 2;'), 'active button must have z-index: 2 > hover z-index: 1');
  });
});
