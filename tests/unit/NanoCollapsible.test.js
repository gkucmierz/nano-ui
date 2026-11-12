import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('NanoCollapsible — flex-shrink protection inside bounded scroll panes', () => {
  it('declares flex-shrink: 0 on .nano-collapsible so expanded controls are never squished', () => {
    const sfc = fs.readFileSync(path.join(rootDir, 'src/components/NanoCollapsible.vue'), 'utf8');
    const blockMatch = sfc.match(/\.nano-collapsible\s*\{([\s\S]*?)\}/);
    assert.ok(blockMatch, 'NanoCollapsible.vue must define .nano-collapsible style block');
    assert.match(
      blockMatch[1],
      /flex-shrink:\s*0\s*;/,
      '.nano-collapsible must include flex-shrink: 0 to prevent vertical clipping inside flex column scroll containers'
    );
  });
});
