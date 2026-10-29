import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@vue/compiler-sfc';
import {
  DEFAULT_TOKENS,
  countSlots,
  applyMask,
} from '../../src/utils/mask.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Declarative Mask Engine & PIN Input Utilities', () => {
  describe('when counting dynamic slots (countSlots)', () => {
    test('should count standard numeric and alphanumeric slots', () => {
      assert.equal(countSlots('###-###'), 6);
      assert.equal(countSlots('#### #### #### ####'), 16);
      assert.equal(countSlots('HH:HH:HH:HH:HH:HH'), 12);
    });

    test('should ignore backslash-escaped tokens (\\#, \\9)', () => {
      assert.equal(countSlots('\\###-###'), 5);
      assert.equal(countSlots('\\99-99'), 3);
      assert.equal(countSlots('\\999-99'), 4);
      assert.equal(countSlots('\\#\\9-99'), 2);
    });
  });

  describe('when applying masks (applyMask)', () => {
    test('should format 6-digit PIN and compute remainingGuide', () => {
      const partial = applyMask('482', '###-###', DEFAULT_TOKENS, '_');
      assert.equal(partial.formatted, '482');
      assert.equal(partial.unmasked, '482');
      assert.equal(partial.isComplete, false);
      assert.equal(partial.remainingGuide, '-___');

      const full = applyMask('482195', '###-###', DEFAULT_TOKENS, '-');
      assert.equal(full.formatted, '482-195');
      assert.equal(full.unmasked, '482195');
      assert.equal(full.isComplete, true);
      assert.equal(full.remainingGuide, '');
    });

    test('should skip invalid characters and strip existing delimiters cleanly', () => {
      const res = applyMask('48a2-1b95!', '###-###');
      assert.equal(res.formatted, '482-195');
      assert.equal(res.unmasked, '482195');
      assert.equal(res.isComplete, true);
    });

    test('should auto-transform uppercase token A and validate hex token H', () => {
      const upper = applyMask('ab12cd', 'AA-99-AA');
      assert.equal(upper.formatted, 'AB-12-CD');
      assert.equal(upper.unmasked, 'AB12CD');
      assert.equal(upper.isComplete, true);

      const hex = applyMask('0g1a2b3z4c5d', 'HH:HH:HH');
      assert.equal(hex.formatted, '01:a2:b3');
      assert.equal(hex.unmasked, '01a2b3');
      assert.equal(hex.isComplete, true);
    });

    test('should honor backslash escaping for literal # and 9 characters', () => {
      const escapedHash = applyMask('1234', '\\#99-99');
      assert.equal(escapedHash.formatted, '#12-34');
      assert.equal(escapedHash.unmasked, '1234');
      assert.equal(escapedHash.isComplete, true);

      const escapedNine = applyMask('5678', '\\999-99');
      assert.equal(escapedNine.formatted, '956-78');
      assert.equal(escapedNine.unmasked, '5678');
      assert.equal(escapedNine.isComplete, true);
    });

    test('should support custom token definitions with regex and transform', () => {
      const customTokens = {
        D: { pattern: /[02468]/ },
        U: { pattern: /[a-zA-Z]/, transform: (c) => c.toUpperCase() },
        Z: { pattern: /[1-9]/ },
      };
      const res = applyMask('12340a9', 'DD-U-Z', customTokens);
      assert.equal(res.formatted, '24-A-9');
      assert.equal(res.unmasked, '24A9');
      assert.equal(res.isComplete, true);
    });
  });

  describe('NuMaskedInput and NuPinInput Component Structure', () => {
    test('should verify NuMaskedInput and NuPinInput follow <script setup> -> <template> -> <style scoped>', () => {
      const maskedPath = path.resolve(__dirname, '../../src/components/NuMaskedInput.vue');
      const pinPath = path.resolve(__dirname, '../../src/components/NuPinInput.vue');

      const maskedParsed = parse(fs.readFileSync(maskedPath, 'utf-8')).descriptor;
      const pinParsed = parse(fs.readFileSync(pinPath, 'utf-8')).descriptor;

      assert.ok(maskedParsed.scriptSetup);
      assert.ok(maskedParsed.template);
      assert.equal(maskedParsed.styles[0].scoped, true);
      assert.match(maskedParsed.template.content, /nu-masked-overlay/);
      assert.match(maskedParsed.template.content, /nu-masked-native/);

      assert.ok(pinParsed.scriptSetup);
      assert.ok(pinParsed.template);
      assert.equal(pinParsed.styles[0].scoped, true);
      assert.match(pinParsed.template.content, /NuMaskedInput/);
      assert.match(pinParsed.styles[0].content, /dashed/);
    });
  });
});
