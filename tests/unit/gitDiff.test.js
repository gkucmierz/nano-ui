import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLangFromPath,
  normalizeFileStatus,
  middleTruncatePath,
  parseUnifiedDiff,
} from '../../src/utils/git-diff.js';

describe('Nano UI — Git Diff & File List Utilities', () => {
  it('detects syntax language from file extensions and explicit overrides', () => {
    assert.equal(detectLangFromPath('docs/.vitepress/theme/custom.css'), 'css');
    assert.equal(detectLangFromPath('src/components/NanoFileList.vue'), 'vue');
    assert.equal(detectLangFromPath('.agents/rules/90-pkg-blog-engine.md'), 'markdown');
    assert.equal(detectLangFromPath('server/src/index.mjs'), 'javascript');
    assert.equal(detectLangFromPath('Dockerfile'), 'dockerfile');
    assert.equal(detectLangFromPath('any.txt', 'json'), 'json');
  });

  it('normalizes git status codes into canonical badge descriptors', () => {
    assert.deepEqual(normalizeFileStatus('A'), {
      code: 'A',
      type: 'added',
      symbol: '+',
      label: 'Added',
    });
    assert.deepEqual(normalizeFileStatus('modified'), {
      code: 'M',
      type: 'modified',
      symbol: '•',
      label: 'Modified',
    });
    assert.deepEqual(normalizeFileStatus('D'), {
      code: 'D',
      type: 'deleted',
      symbol: '−',
      label: 'Deleted',
    });
    assert.deepEqual(normalizeFileStatus('R100'), {
      code: 'R',
      type: 'renamed',
      symbol: '→',
      label: 'Renamed',
    });
  });

  it('middle-truncates long paths while keeping root segment and basename readable', () => {
    const short = middleTruncatePath('AGENTS.md', 34);
    assert.equal(short.displayPath, 'AGENTS.md');
    assert.equal(short.displayDir, '');
    assert.equal(short.displayFile, 'AGENTS.md');

    const long1 = middleTruncatePath('.agents/rules/90-pkg-blog-engine.md', 32);
    assert.ok(long1.displayPath.includes('...'));
    assert.equal(long1.displayFile, '90-pkg-blog-engine.md');

    const long2 = middleTruncatePath('docs/.vitepress/theme/composables/useMermaid.js', 34);
    assert.ok(long2.displayDir.includes('...'));
    assert.equal(long2.displayFile, 'useMermaid.js');
  });

  it('parses unified git diff into line numbers, syntax-highlighted rows, and split pairs', () => {
    const patch = [
      'diff --git a/src/math.js b/src/math.js',
      'index 1111111..2222222 100644',
      '--- a/src/math.js',
      '+++ b/src/math.js',
      '@@ -10,4 +10,5 @@ export function clamp(x) {',
      '   const min = 0;',
      '-  const max = 10;',
      '+  const max = 100;',
      '+  const step = 1;',
      '   return Math.min(max, Math.max(min, x));',
    ].join('\n');

    const res = parseUnifiedDiff(patch, 'javascript');
    assert.equal(res.additions, 2);
    assert.equal(res.deletions, 1);
    assert.equal(res.lines.length, 6);
    assert.equal(res.lines[0].type, 'hunk');
    assert.equal(res.lines[1].type, 'ctx');
    assert.equal(res.lines[1].oldNumber, 10);
    assert.equal(res.lines[1].newNumber, 10);
    assert.equal(res.lines[2].type, 'del');
    assert.equal(res.lines[2].oldNumber, 11);
    assert.equal(res.lines[3].type, 'add');
    assert.equal(res.lines[3].newNumber, 11);
    assert.equal(res.lines[4].type, 'add');
    assert.equal(res.lines[4].newNumber, 12);
    assert.ok(res.splitRows.length >= 4);
  });
});
