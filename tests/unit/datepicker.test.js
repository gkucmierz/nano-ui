import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIsoDate,
  parseIsoDate,
  addDaysToIso,
  formatDisplayDate,
  buildCalendarMonthGrid,
} from '../../src/utils/datepicker.js';

describe('NanoDatePicker utilities', () => {
  it('parses and formats valid ISO dates and rejects invalid calendar dates', () => {
    assert.deepEqual(parseIsoDate('2026-11-04'), {
      year: 2026,
      month: 11,
      day: 4,
      iso: '2026-11-04',
    });
    assert.equal(parseIsoDate('2026-02-30'), null);
    assert.equal(parseIsoDate('invalid'), null);
    assert.equal(formatIsoDate(2027, 2, 2), '2027-02-02');
  });

  it('adds days deterministically across month/year boundaries', () => {
    assert.equal(addDaysToIso('2026-11-04', 90), '2027-02-02');
    assert.equal(addDaysToIso('2027-02-02', -90), '2026-11-04');
  });

  it('formats display dates in PL and EN', () => {
    assert.equal(formatDisplayDate('2027-02-02', 'pl'), '02 lut 2027');
    assert.equal(formatDisplayDate('2027-02-02', 'en'), 'Feb 02, 2027');
  });

  it('builds a 42-cell Monday-first calendar grid with selection and bounds', () => {
    const grid = buildCalendarMonthGrid(2026, 11, {
      selectedIso: '2026-11-04',
      todayIso: '2026-11-04',
      minIso: '2026-11-02',
      maxIso: '2026-11-28',
    });
    assert.equal(grid.length, 42);
    // Nov 1, 2026 is Sunday -> Monday-first grid starts on Oct 26, 2026
    assert.equal(grid[0].iso, '2026-10-26');
    assert.equal(grid[0].isCurrentMonth, false);
    const nov4 = grid.find((c) => c.iso === '2026-11-04');
    assert.ok(nov4);
    assert.equal(nov4.isSelected, true);
    assert.equal(nov4.isToday, true);
    assert.equal(nov4.isDisabled, false);
    const nov1 = grid.find((c) => c.iso === '2026-11-01');
    assert.equal(nov1.isDisabled, true);
  });
});
