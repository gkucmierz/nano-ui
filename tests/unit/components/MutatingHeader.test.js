import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@vue/compiler-sfc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sfcPath = path.resolve(__dirname, '../../../src/components/MutatingHeader.vue');
const sfcContent = fs.readFileSync(sfcPath, 'utf-8');
const { descriptor } = parse(sfcContent);

const resolveStuckRadiusFn = (stuckRadius) => {
  if (stuckRadius === undefined || stuckRadius === null || stuckRadius === '') {
    return undefined;
  }
  if (stuckRadius === 0 || stuckRadius === '0' || stuckRadius === '0px') {
    return '0px';
  }
  if (typeof stuckRadius === 'number') {
    return `${stuckRadius}px ${stuckRadius}px 0 0`;
  }
  const str = String(stuckRadius).trim();
  const parts = str.split(/\s+/);
  if (parts.length === 1) {
    const num = parseFloat(parts[0]);
    if (!isNaN(num)) {
      if (num === 0) return '0px';
      const unit = parts[0].replace(/^[0-9.-]+/, '') || 'px';
      return `${num}${unit} ${num}${unit} 0 0`;
    }
  }
  return str;
};

describe('MutatingHeader Component Architecture & Docked Border Radius', () => {
  describe('when validating stuckRadius prop configuration', () => {
    test('should declare stuckRadius prop supporting String and Number', () => {
      assert.match(descriptor.scriptSetup.content, /stuckRadius:\s*\{[^}]*type:\s*\[String,\s*Number\]/);
    });

    test('should default stuckRadius to undefined to allow CSS variable fallback', () => {
      assert.match(descriptor.scriptSetup.content, /default:\s*undefined/);
    });

    test('should define resolvedStuckRadius computed property', () => {
      assert.match(descriptor.scriptSetup.content, /const\s+resolvedStuckRadius\s*=\s*computed\(/);
    });
  })

  describe('when resolving stuck radius values', () => {
    test('should return undefined when stuckRadius is omitted or empty', () => {
      assert.equal(resolveStuckRadiusFn(undefined), undefined);
      assert.equal(resolveStuckRadiusFn(null), undefined);
      assert.equal(resolveStuckRadiusFn(''), undefined);
    });

    test('should normalize 0, "0", and "0px" to "0px" for flat browser navigation', () => {
      assert.equal(resolveStuckRadiusFn(0), '0px');
      assert.equal(resolveStuckRadiusFn('0'), '0px');
      assert.equal(resolveStuckRadiusFn('0px'), '0px');
    });

    test('should auto-expand numeric values to top corners only', () => {
      assert.equal(resolveStuckRadiusFn(11), '11px 11px 0 0');
      assert.equal(resolveStuckRadiusFn(16), '16px 16px 0 0');
    });

    test('should auto-expand single string radius with unit to top corners only', () => {
      assert.equal(resolveStuckRadiusFn('11px'), '11px 11px 0 0');
      assert.equal(resolveStuckRadiusFn('1rem'), '1rem 1rem 0 0');
    });

    test('should preserve explicit custom 4-corner radius strings', () => {
      assert.equal(resolveStuckRadiusFn('11px 11px 0 0'), '11px 11px 0 0');
      assert.equal(resolveStuckRadiusFn('12px 12px 4px 4px'), '12px 12px 4px 4px');
    });
  });

  describe('when inspecting template and CSS styling', () => {
    test('should bind --stuck-radius in template style object', () => {
      assert.match(descriptor.template.content, /'--stuck-radius':\s*resolvedStuckRadius/);
    });

    test('should use var(--stuck-radius, 11px 11px 0 0) in is-stuck CSS rule', () => {
      const styleContent = descriptor.styles.map(s => s.content).join('\n');
      assert.match(styleContent, /border-radius:\s*var\(--stuck-radius,\s*11px\s+11px\s+0\s+0\);/);
    });

    test('should support container-level margin override via var(--stuck-margin, 0)', () => {
      const styleContent = descriptor.styles.map(s => s.content).join('\n');
      assert.match(styleContent, /margin:\s*var\(--stuck-margin,\s*0\);/);
    });
  });
});
