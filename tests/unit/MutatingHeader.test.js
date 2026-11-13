import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MUTATING_HEADER_SPREAD_PRESETS,
  DEFAULT_HEADER_TIER_WIDTHS,
  resolveOptimalHeaderTier,
  pickHeaderTierCandidate,
  pickAdaptiveHeaderLabel,
  normalizeHeaderSpread,
  parseFloatingVerticalMargins,
  computeHeaderCompressionMeta,
} from '../../src/utils/mutatingHeader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mutatingHeaderVuePath = path.resolve(__dirname, '../../src/components/MutatingHeader.vue');

describe('MutatingHeader — Symmetric Centering, Inner Spread & Priority+ Compression Meta', () => {
  test('normalizeHeaderSpread should normalize 0..100 percentages and 0..1 ratios cleanly', () => {
    assert.deepEqual(normalizeHeaderSpread(0), { spreadPercent: 0, spreadRatio: 0 });
    assert.deepEqual(normalizeHeaderSpread(50), { spreadPercent: 50, spreadRatio: 0.5 });
    assert.deepEqual(normalizeHeaderSpread(0.33), { spreadPercent: 33, spreadRatio: 0.33 });
    assert.deepEqual(normalizeHeaderSpread(150), { spreadPercent: 100, spreadRatio: 1 });
    assert.deepEqual(normalizeHeaderSpread(-20), { spreadPercent: 0, spreadRatio: 0 });
    assert.ok(MUTATING_HEADER_SPREAD_PRESETS.includes(33));
    assert.ok(MUTATING_HEADER_SPREAD_PRESETS.includes(66));
  });

  test('parseFloatingVerticalMargins should extract top and bottom margins while keeping horizontal margins auto', () => {
    assert.deepEqual(parseFloatingVerticalMargins('12px auto 0 auto'), {
      top: '12px',
      bottom: '0',
    });
    assert.deepEqual(parseFloatingVerticalMargins('16px 24px'), {
      top: '16px',
      bottom: '16px',
    });
  });

  test('computeHeaderCompressionMeta should compute Priority+ progressive folding tiers (0..3)', () => {
    const spacious = computeHeaderCompressionMeta({
      containerWidth: 1200,
      contentWidth: 680,
      isStuck: false,
      spreadPercent: 0,
    });
    assert.equal(spacious.compressionLevel, 0);
    assert.equal(spacious.densityTier, 'spacious');
    assert.equal(spacious.freeSpacePx, 520);
    assert.equal(spacious.isSubtitleFolded, false);

    const comfortable = computeHeaderCompressionMeta({
      containerWidth: 920,
      contentWidth: 700,
      isStuck: true,
      spreadPercent: 33,
    });
    assert.equal(comfortable.compressionLevel, 1);
    assert.equal(comfortable.densityTier, 'comfortable');
    assert.equal(comfortable.isSubtitleFolded, true);
    assert.equal(comfortable.isSecondaryNavFolded, false);

    const compact = computeHeaderCompressionMeta({
      containerWidth: 740,
      contentWidth: 650,
      isStuck: true,
      spreadPercent: 66,
    });
    assert.equal(compact.compressionLevel, 2);
    assert.equal(compact.densityTier, 'compact');
    assert.equal(compact.isSecondaryNavFolded, true);

    const critical = computeHeaderCompressionMeta({
      containerWidth: 520,
      contentWidth: 540,
      isStuck: true,
      spreadPercent: 100,
    });
    assert.equal(critical.compressionLevel, 3);
    assert.equal(critical.densityTier, 'critical');
    assert.equal(critical.overflowPx, 20);
    assert.equal(critical.isUtilityMenuFolded, true);
    assert.equal(critical.isActionsCompact, true);
  });

  test('resolveOptimalHeaderTier and pickAdaptiveHeaderLabel should use naturalSearch to select non-overlapping tiers', () => {
    assert.deepEqual(DEFAULT_HEADER_TIER_WIDTHS, [1040, 860, 680, 520]);

    const t0 = resolveOptimalHeaderTier({ containerWidth: 1120 });
    assert.equal(t0.tierIndex, 0);
    assert.equal(t0.fits, true);

    const t1 = resolveOptimalHeaderTier({ containerWidth: 920 });
    assert.equal(t1.tierIndex, 1);
    assert.equal(t1.fits, true);

    const t2 = resolveOptimalHeaderTier({ containerWidth: 740 });
    assert.equal(t2.tierIndex, 2);
    assert.equal(t2.fits, true);

    const t3 = resolveOptimalHeaderTier({ containerWidth: 560 });
    assert.equal(t3.tierIndex, 3);
    assert.equal(t3.fits, true);

    const ctaCandidates = ['Domena na sprzedaż / wynajem', 'Oferta domeny', 'Oferta'];
    assert.equal(pickAdaptiveHeaderLabel(ctaCandidates, 260).label, 'Domena na sprzedaż / wynajem');
    assert.equal(pickAdaptiveHeaderLabel(ctaCandidates, 150).label, 'Oferta domeny');
    assert.equal(pickAdaptiveHeaderLabel(ctaCandidates, 90).label, 'Oferta');

    // Dual-signature support: positional (width, { requiredWidths, safetyGapPx }) + pickHeaderTierCandidate
    const pos0 = resolveOptimalHeaderTier(1400, { requiredWidths: [1340, 1120, 910, 700], safetyGapPx: 16 });
    assert.equal(pos0.tierIndex, 0);
    const pos2 = resolveOptimalHeaderTier(960, { requiredWidths: [1340, 1120, 910, 700], safetyGapPx: 16 });
    assert.equal(pos2.tierIndex, 2);
    assert.equal(pickHeaderTierCandidate(ctaCandidates, 0), 'Domena na sprzedaż / wynajem');
    assert.equal(pickHeaderTierCandidate(ctaCandidates, 2), 'Oferta');
    assert.equal(pickHeaderTierCandidate(ctaCandidates, 99), 'Oferta');
    assert.equal(pickHeaderTierCandidate([], 0), '');
  });

  test('MutatingHeader.vue should preserve margin-left: auto and margin-right: auto in both floating and is-stuck states', () => {
    const sfc = fs.readFileSync(mutatingHeaderVuePath, 'utf8');
    assert.ok(sfc.includes('margin-left: auto;'));
    assert.ok(sfc.includes('margin-right: auto;'));
    assert.ok(sfc.includes(':data-compression-level="headerMeta.compressionLevel"'));
    assert.ok(sfc.includes(':meta="headerMeta"'));
  });
});
