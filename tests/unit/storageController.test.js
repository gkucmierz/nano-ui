import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STORAGE_MODES,
  normalizeStorageMode,
  toAcronym,
  DEFAULT_ACRONYM_DICTIONARY,
  createAcronymDictionaryFromNames,
  registerAcronyms,
  clearRegisteredAcronyms,
  expandAcronymKey,
  buildHierarchicalKey,
  createMemoryStorageAdapter,
  createStorageController,
} from '../../src/utils/storage-controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('Nano UI Storage Controller (ls / ss / none + compact acronym <APP>_NU_<key>)', () => {
  beforeEach(() => {
    clearRegisteredAcronyms();
  });

  test('enforces PKG-PURITY-01: zero hardcoded downstream application names in src/utils/storage-controller.js', () => {
    assert.deepEqual(DEFAULT_ACRONYM_DICTIONARY, {});
    const src = fs.readFileSync(path.join(rootDir, 'src/utils/storage-controller.js'), 'utf8');
    for (const appName of [
      'dashboard-app',
      'workflow-app',
      'home-control-app',
      'cv-app',
      'talk-app',
      'money-app',
      'screeny-app',
      'db-lens',
      'storage-lens',
      'ext-hub',
      'reel-shredder',
      'clown-filter',
    ]) {
      assert.equal(
        src.includes(appName),
        false,
        `PKG-PURITY-01 violation: nano-ui/src/utils/storage-controller.js must not hardcode "${appName}"`,
      );
    }
  });

  test('normalizes storage modes, self-registers uppercase acronyms at runtime, and expands acronym keys', () => {
    assert.equal(normalizeStorageMode('ls'), STORAGE_MODES.LS);
    assert.equal(normalizeStorageMode('ss'), STORAGE_MODES.SS);
    assert.equal(normalizeStorageMode('none'), STORAGE_MODES.NONE);
    assert.equal(normalizeStorageMode(false), STORAGE_MODES.NONE);
    assert.equal(toAcronym('acme-portal'), 'AP');
    assert.equal(toAcronym('nano-ui'), 'NU');

    const expanded = expandAcronymKey('AP_NU_demo_geometry');
    assert.equal(expanded.expandedKey, 'acme-portal_nano-ui_demo_geometry');
    assert.equal(expanded.breadcrumb, 'acme-portal / nano-ui / demo_geometry');
    assert.equal(expanded.leafKey, 'demo_geometry');

    clearRegisteredAcronyms();
    const dict = createAcronymDictionaryFromNames(['studio-portal', 'nano-ui']);
    registerAcronyms(dict);
    assert.equal(expandAcronymKey('SP_NU_card_state').breadcrumb, 'studio-portal / nano-ui / card_state');
  });

  test('NanoModal, NanoSplitter, NanoTabs, NanoSortableList, NanoCodeEditor, useTheme, and locales integrate with storage-controller', () => {
    const filesToCheck = [
      'src/components/NanoModal.vue',
      'src/components/NanoSplitter.vue',
      'src/components/NanoTabs.vue',
      'src/components/NanoSortableList.vue',
      'src/components/NanoCodeEditor.vue',
      'src/composables/useTheme.js',
      'src/theme.js',
      'src/locales.js',
    ];
    for (const rel of filesToCheck) {
      const src = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.ok(
        src.includes('getScopedStorageController'),
        `Expected ${rel} to use getScopedStorageController('nano-ui')`,
      );
    }
  });

  test('formats hierarchical keys as AP_NU_<key> by default and supports ls, ss, and none', () => {
    const ls = createMemoryStorageAdapter();
    const ss = createMemoryStorageAdapter();
    const root = createStorageController({
      appPrefix: 'acme-portal',
      localStorage: ls,
      sessionStorage: ss,
    });
    const nanoScope = root.scope('nano-ui');

    assert.equal(
      buildHierarchicalKey({ appPrefix: 'acme-portal', scopePrefix: 'nano-ui', key: 'demo_geometry' }),
      'AP_NU_demo_geometry',
    );

    const lsRes = nanoScope.set('demo_geometry', { x: 40, y: 60, width: 700, height: 500 }, { mode: 'ls' });
    assert.equal(lsRes.stored, true);
    assert.equal(lsRes.resolvedKey, 'AP_NU_demo_geometry');
    assert.deepEqual(nanoScope.get('demo_geometry', null, { mode: 'ls' }), {
      x: 40,
      y: 60,
      width: 700,
      height: 500,
    });

    const ssRes = nanoScope.set('demo_geometry', { x: 80, y: 120, width: 640, height: 480 }, { mode: 'ss' });
    assert.equal(ssRes.stored, true);
    assert.equal(ssRes.backend, 'sessionStorage');
    assert.deepEqual(nanoScope.get('demo_geometry', null, { mode: 'ss' }), {
      x: 80,
      y: 120,
      width: 640,
      height: 480,
    });

    const noneRes = nanoScope.set('modal_ephemeral', { x: 10, y: 10 }, { mode: 'none' });
    assert.equal(noneRes.stored, false);
    assert.equal(nanoScope.get('modal_ephemeral', null, { mode: 'none' }), null);
  });

  test('all 5 storage-enabled Playground docs use v-tooltip for acronym expansion, semantic Light/Dark tokens, and document storage-key', () => {
    const docFiles = [
      'src/playground/docs/ModalDoc.vue',
      'src/playground/docs/SplitterDoc.vue',
      'src/playground/docs/TabsDoc.vue',
      'src/playground/docs/SortableDoc.vue',
      'src/playground/docs/CodeEditorDoc.vue',
    ];
    for (const rel of docFiles) {
      const src = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.ok(src.includes('v-tooltip='), `Expected ${rel} to use v-tooltip for storage acronym expansion`);
      assert.ok(src.includes('--nano-status-info-text'), `Expected ${rel} to use semantic Light/Dark status tokens`);
      assert.ok(src.includes('storage-key'), `Expected ${rel} to document storage-key in Usage / template`);
    }
  });
});
