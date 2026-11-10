import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNEL_OSD_SHAPES,
  resolveChannelOsdMaxDigits,
  resolveChannelOsdBox,
} from '../../src/utils/channelOsdLayout.js';

describe('NanoChannelOsd naturalSearch Multi-Digit Geometry', () => {
  test('infers maxDigits from max with minimum of 2 unless explicitly overridden', () => {
    assert.deepEqual(CHANNEL_OSD_SHAPES, ['rect', 'square']);
    assert.equal(resolveChannelOsdMaxDigits({ max: 13 }), 2);
    assert.equal(resolveChannelOsdMaxDigits({ max: 99 }), 2);
    assert.equal(resolveChannelOsdMaxDigits({ max: 128 }), 3);
    assert.equal(resolveChannelOsdMaxDigits({ max: 1024 }), 4);
    assert.equal(resolveChannelOsdMaxDigits({ max: 99, maxDigits: 5 }), 5);
  });

  test('preserves exact 1:1 square for classic 1-2 digit channels (<= 99)', () => {
    const rect2 = resolveChannelOsdBox({ size: 140, displayText: '12', max: 99, shape: 'rect' });
    const sq2 = resolveChannelOsdBox({ size: 140, displayText: '12', max: 99, shape: 'square' });

    assert.equal(rect2.widthPx, 140);
    assert.equal(rect2.heightPx, 140);
    assert.equal(rect2.aspectRatio, 1);

    assert.equal(sq2.widthPx, 140);
    assert.equal(sq2.heightPx, 140);
    assert.equal(sq2.aspectRatio, 1);
  });

  test('widens horizontally via naturalSearch in shape="rect" while keeping height = size for 3+ digits', () => {
    const m3 = resolveChannelOsdBox({
      size: 152,
      displayText: '016',
      max: 128,
      subtitle: 'Relatywistyczna Kratownica',
      shape: 'rect',
    });

    assert.equal(m3.heightPx, 152);
    assert.ok(m3.widthPx >= 200, `Expected 3-digit width >= 200px, got ${m3.widthPx}`);
    assert.equal(m3.widthPx % 2, 0, 'Width must be quantized to even pixels to prevent half-pixel blur');
    assert.ok(m3.aspectRatio > 1.25);

    const m4 = resolveChannelOsdBox({
      size: 152,
      displayText: '1024',
      max: 1024,
      shape: 'rect',
    });
    assert.equal(m4.heightPx, 152);
    assert.ok(m4.widthPx > m3.heightPx);
  });

  test('expands uniformly 1:1 via naturalSearch in shape="square" for 3+ digits', () => {
    const sq3 = resolveChannelOsdBox({
      size: 152,
      displayText: '016',
      max: 128,
      subtitle: 'Relatywistyczna Kratownica',
      shape: 'square',
    });

    assert.equal(sq3.widthPx, sq3.heightPx);
    assert.ok(sq3.widthPx >= 196, `Expected expanded square side >= 196px, got ${sq3.widthPx}`);
    assert.equal(sq3.aspectRatio, 1);
  });

  test('guarantees CLS = 0 across 1st, 2nd, and 3rd typed digit when stabilizeCapacity is true', () => {
    const d1 = resolveChannelOsdBox({ size: 152, displayText: '0', max: 128, shape: 'rect', stabilizeCapacity: true });
    const d2 = resolveChannelOsdBox({ size: 152, displayText: '01', max: 128, shape: 'rect', stabilizeCapacity: true });
    const d3 = resolveChannelOsdBox({ size: 152, displayText: '016', max: 128, shape: 'rect', stabilizeCapacity: true });

    assert.equal(d1.widthPx, d2.widthPx);
    assert.equal(d2.widthPx, d3.widthPx);
  });
});
