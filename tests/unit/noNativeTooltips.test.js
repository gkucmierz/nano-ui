import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../../src');

function collectVueFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectVueFiles(full, acc);
    } else if (entry.name.endsWith('.vue')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Zero Native Browser Tooltips Policy (0 native tooltips)', () => {
  it('forbids SVG <title> elements inside all .vue templates', () => {
    const files = collectVueFiles(SRC_DIR);
    const violations = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
      if (!templateMatch) continue;
      const tpl = templateMatch[1];
      if (/<title[\s>]/i.test(tpl)) {
        violations.push(path.relative(SRC_DIR, file));
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found forbidden SVG <title> elements (triggers native browser tooltip): ${violations.join(', ')}`
    );
  });

  it('forbids native HTML :title= attributes on DOM/SVG elements in src/components/', () => {
    const compDir = path.join(SRC_DIR, 'components');
    const files = collectVueFiles(compDir);
    const violations = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
      if (!templateMatch) continue;
      const tpl = templateMatch[1];
      if (/<[a-z][a-z0-9-]*\b[^>]*\s:?title=/.test(tpl)) {
        violations.push(path.relative(SRC_DIR, file));
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found forbidden native :title= attributes in components: ${violations.join(', ')}`
    );
  });
});
