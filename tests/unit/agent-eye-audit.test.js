import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../../src');

function walkVueFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkVueFiles(full));
    } else if (entry.name.endsWith('.vue')) {
      results.push(full);
    }
  }
  return results;
}

describe('AgentEye DOM & Console Audit Regression Suite (@gkucmierz/nano-ui)', () => {
  it('app-factory.js uses createApp for non-hydrated SPA mounts and createSSRApp only when isServer or hydrate is true', () => {
    const factorySrc = fs.readFileSync(path.join(SRC_DIR, 'playground/app-factory.js'), 'utf8');
    const mainSrc = fs.readFileSync(path.join(SRC_DIR, 'playground/main.js'), 'utf8');
    assert.match(factorySrc, /createApp,\s*createSSRApp/);
    assert.match(factorySrc, /isServer\s*\|\|\s*hydrate\s*\?\s*createSSRApp\(App\)\s*:\s*createApp\(App\)/);
    assert.match(mainSrc, /hydrate:\s*hasSsrMarkup/);
  });

  it('NanoDatePicker supports min/max/locale prop aliases and all semantic color tokens', () => {
    const dpSrc = fs.readFileSync(path.join(SRC_DIR, 'components/NanoDatePicker.vue'), 'utf8');
    assert.match(dpSrc, /effectiveLang\s*=\s*computed\(/);
    assert.match(dpSrc, /effectiveMin\s*=\s*computed\(\(\)\s*=>\s*props\.minDate\s*\|\|\s*props\.min/);
    assert.match(dpSrc, /effectiveMax\s*=\s*computed\(\(\)\s*=>\s*props\.maxDate\s*\|\|\s*props\.max/);
    for (const token of ['primary', 'purple', 'gold', 'crimson', 'danger', 'emerald', 'indigo', 'cyan', 'amber', 'rose', 'violet', 'slate']) {
      assert.ok(dpSrc.includes(`'${token}'`), `Expected NanoDatePicker color validator to accept '${token}'`);
    }
  });

  it('every Vue SFC in src/ follows <script> -> <template> -> <style> block ordering', () => {
    const files = walkVueFiles(SRC_DIR);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const scriptIdx = content.search(/<script\b/);
      const templateIdx = content.search(/<template\b/);
      if (scriptIdx !== -1 && templateIdx !== -1) {
        assert.ok(
          scriptIdx < templateIdx,
          `Expected <script> before <template> in ${path.relative(SRC_DIR, file)}`
        );
      }
    }
  });

  it('every <input>, <textarea>, and <select> in src/ templates has id/name attributes and every <label> is associated', () => {
    const files = walkVueFiles(SRC_DIR);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const tpl = (content.match(/<template>([\s\S]*)<\/template>/)?.[1] || '').replace(/<!--[\s\S]*?-->/g, '');
      for (const match of tpl.matchAll(/<(input|textarea|select)\b[^>]*>/g)) {
        const tag = match[0];
        assert.ok(
          /\bid=|:id=/.test(tag) && /\bname=|:name=/.test(tag),
          `Missing id or name on form control in ${path.relative(SRC_DIR, file)}: ${tag}`
        );
      }
      for (const match of tpl.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)) {
        const block = match[0];
        assert.ok(
          /\bfor=|:for=/.test(block) || /<(input|select|textarea|button|NanoSwitch|NanoCheckbox)\b/.test(block),
          `Orphan <label> without for or control in ${path.relative(SRC_DIR, file)}: ${block}`
        );
      }
    }
  });
});
