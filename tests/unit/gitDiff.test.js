import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLangFromPath,
  detectMediaTypeFromPath,
  normalizeFileStatus,
  middleTruncatePath,
  parseUnifiedDiff,
  resolveEditorViewMode,
} from '../../src/utils/git-diff.js';
import {
  compileNsdPreview,
  extractEmbeddedNsdSnippets,
} from '../../src/utils/nsd-preview.js';

describe('Nano UI — Git Diff & File List Utilities', () => {
  it('detects syntax language from file extensions and explicit overrides', () => {
    assert.equal(detectLangFromPath('docs/.vitepress/theme/custom.css'), 'css');
    assert.equal(detectLangFromPath('src/components/NanoFileList.vue'), 'vue');
    assert.equal(detectLangFromPath('.agents/rules/90-pkg-blog-engine.md'), 'markdown');
    assert.equal(detectLangFromPath('server/src/index.mjs'), 'javascript');
    assert.equal(detectLangFromPath('Dockerfile'), 'dockerfile');
    assert.equal(detectLangFromPath('any.txt', 'json'), 'json');
    assert.equal(detectLangFromPath('sounds/tokamak.nsd'), 'nanosound');
  });

  it('detects binary media, webfont, and custom 7u RFC file types', () => {
    assert.equal(detectMediaTypeFromPath('public/og/034-iter-tokamak-confinement.jpg'), 'image');
    assert.equal(detectMediaTypeFromPath('public/shader-showcase-dark.svg'), 'image');
    assert.equal(detectMediaTypeFromPath('assets/loop.ogg'), 'audio');
    assert.equal(detectMediaTypeFromPath('assets/demo.mp4'), 'video');
    assert.equal(detectMediaTypeFromPath('fonts/JetBrainsMono-Regular.woff2'), 'font');
    assert.equal(detectMediaTypeFromPath('docs/report.pdf'), 'pdf');
    assert.equal(detectMediaTypeFromPath('audio/click.nsd'), 'nsd');
    assert.equal(detectMediaTypeFromPath('tracks/theme.7uaudio'), '7uaudio');
    assert.equal(detectMediaTypeFromPath('tracks/theme.7jap'), '7uaudio');
    assert.equal(detectMediaTypeFromPath('memes/deploy-friday.meme'), 'meme');
    assert.equal(detectMediaTypeFromPath('src/App.vue'), null);
  });

  it('prevents async diff arrival from clobbering active media/RFC preview tab', () => {
    // Step 1 (t = 0ms): user clicks an OG image or SVG; filePath & mediaUrl bind synchronously, diff is still loading
    const t0Mode = resolveEditorViewMode({
      propMode: 'auto',
      userLockedMode: null,
      mediaType: 'image',
      hasMediaPreview: true,
      hasDiff: false,
      hasCode: false,
      loading: true,
    });
    assert.equal(t0Mode, 'preview');

    // Step 2 (t = 40ms): HTTP diff endpoint returns "Binary files differ" (or raw XML diff for .svg)
    const t40Mode = resolveEditorViewMode({
      propMode: 'auto',
      userLockedMode: null,
      mediaType: 'image',
      hasMediaPreview: true,
      hasDiff: true,
      hasCode: false,
      loading: false,
    });
    assert.equal(t40Mode, 'preview', 'Async diff arrival must NOT overwrite preview mode back to diff');

    // Step 3: user explicitly clicks the Diff tab on an SVG/NSD file -> userLockedMode preserves manual choice
    const manualDiffMode = resolveEditorViewMode({
      propMode: 'auto',
      userLockedMode: 'diff',
      mediaType: 'image',
      hasMediaPreview: true,
      hasDiff: true,
      hasCode: true,
      loading: false,
    });
    assert.equal(manualDiffMode, 'diff');

    // Step 4: standalone .nsd file opens directly in preview even at t = 0ms while loading
    const nsdLoadingMode = resolveEditorViewMode({
      propMode: 'auto',
      userLockedMode: null,
      mediaType: 'nsd',
      hasMediaPreview: false,
      hasDiff: false,
      hasCode: false,
      loading: true,
    });
    assert.equal(nsdLoadingMode, 'preview');

    // Step 5: code file with async diff in flight stays in diff without flashing empty code gutter
    const codeLoadingDiff = resolveEditorViewMode({
      propMode: 'auto',
      userLockedMode: null,
      mediaType: null,
      hasMediaPreview: false,
      hasDiff: false,
      hasCode: false,
      loading: true,
    });
    assert.equal(codeLoadingDiff, 'diff');
  });

  it('synthesizes deterministic NanoSound (.nsd) PCM waveform and extracts embedded snippets', () => {
    const dsl = '0.7 * sin(glide(920Hz, 260Hz, 45ms)) * expDecay(38ms) + 0.25 * noise(18ms) * lpf(1800Hz) * expDecay(14ms)';
    const compiled = compileNsdPreview(dsl, { sampleRate: 22050, waveformBins: 64 });
    assert.equal(compiled.valid, true);
    assert.equal(compiled.layers.length, 2);
    assert.equal(compiled.layers[0].wave, 'sin');
    assert.equal(compiled.layers[0].freqStart, 920);
    assert.equal(compiled.layers[0].freqEnd, 260);
    assert.equal(compiled.layers[1].filterType, 'lpf');
    assert.ok(compiled.pcm.length > 500);
    assert.ok(compiled.svgPoints.length > 40);
    assert.ok(compiled.svgAreaPath.startsWith('M '));

    const jsModule = `
      export const SHADER_SOUNDS = [
        { id: 'tokamak-hum', sound: '0.6 * saw(glide(110Hz, 220Hz, 180ms)) * lpf(900Hz) * expDecay(240ms)' },
        { id: 'ui-tick', sound: '0.4 * tri(1200Hz) * expDecay(18ms)' }
      ];
    `;
    const extracted = extractEmbeddedNsdSnippets(jsModule);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0].label, 'tokamak-hum');
    assert.equal(extracted[1].label, 'ui-tick');
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
