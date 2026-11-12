import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  UNIX_TREE_GLYPHS,
  flattenUnixTree,
  formatUnixAsciiTree,
  filterUnixTreeNodes,
} from '../../../src/utils/unixTree.js';
import { getWcagContrastRatio } from '../../../src/utils/colors.js';

const sampleTree = [
  {
    id: 'nano-ui',
    label: '@gkucmierz/nano-ui',
    version: '1.12.0',
    icon: '🔒',
    badge: 'PRIVATE · Gitea',
    meta: '🚀 46 apps',
    children: [
      {
        id: 'key-controller',
        label: '@gkucmierz/key-controller',
        version: '1.0.6',
        icon: '🔒',
        children: [
          {
            id: 'utils-1',
            label: '@gkucmierz/utils',
            version: '1.12.1',
            icon: '🌐',
          },
        ],
      },
      {
        id: 'utils-2',
        label: '@gkucmierz/utils',
        version: '1.12.1',
        icon: '🌐',
      },
    ],
  },
];

describe('NanoTree & unixTree.js — Unix tree(1) connectors, downward ┬ tee, search filter, and ASCII formatter', () => {
  it('computes connected Unix tree(1) prefixes with downward ┬ tees (├───┬──, └───┬──, │   ,     )', () => {
    const rows = flattenUnixTree(sampleTree);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].prefix, UNIX_TREE_GLYPHS.LAST_BRANCH_TEE); // └───┬── @gkucmierz/nano-ui (expanded)
    assert.equal(rows[1].prefix, '    ├───┬── '); // child 1 (expanded)
    assert.equal(rows[2].prefix, '    │   └── '); // grandchild leaf
    assert.equal(rows[3].prefix, '    └── '); // last child 2 leaf
  });

  it('formats copy-pasteable Unix ASCII tree output with badges and meta', () => {
    const ascii = formatUnixAsciiTree(sampleTree, {
      rootLabel: '@gkucmierz/* (20 packages)',
    });
    assert.ok(ascii.includes('@gkucmierz/* (20 packages)'));
    assert.ok(ascii.includes('└───┬── @gkucmierz/nano-ui v1.12.0 [PRIVATE · Gitea] (🚀 46 apps)'));
    assert.ok(ascii.includes('    ├───┬── @gkucmierz/key-controller v1.0.6'));
    assert.ok(ascii.includes('    │   └── @gkucmierz/utils v1.12.1'));
  });

  it('filters tree nodes by query while preserving ancestor chain', () => {
    const filtered = filterUnixTreeNodes(sampleTree, 'key-controller');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'nano-ui');
    assert.equal(filtered[0].children.length, 1);
    assert.equal(filtered[0].children[0].id, 'key-controller');
  });

  it('NanoTree.vue SFC exposes toolbar, role="tree", root tee cap, and connected guide columns', () => {
    const sfcPath = path.resolve(import.meta.dirname, '../../../src/components/NanoTree.vue');
    const sfc = fs.readFileSync(sfcPath, 'utf8');
    assert.ok(sfc.includes('class="nano-tree"'));
    assert.ok(sfc.includes('role="tree"'));
    assert.ok(sfc.includes('nano-tree-root-tee'));
    assert.ok(sfc.includes('is-tee-down'));
  });

  it('supports theme="auto" | "light" | "dark" prop, .theme-light/.theme-dark local overrides, and WCAG AA light tokens in colors.css', () => {
    const rootDir = path.resolve(import.meta.dirname, '../../..');
    const sfc = fs.readFileSync(path.join(rootDir, 'src/components/NanoTree.vue'), 'utf8');
    const colorsCss = fs.readFileSync(path.join(rootDir, 'src/assets/colors.css'), 'utf8');
    const ecosystemDoc = fs.readFileSync(path.join(rootDir, 'src/playground/docs/EcosystemDoc.vue'), 'utf8');

    // 1. Prop contract & scoped modifier classes without :global or raw typeof
    assert.match(sfc, /theme:\s*\{\s*type:\s*String,\s*default:\s*'auto'/);
    assert.match(sfc, /v\s*===\s*'auto'\s*\|\|\s*v\s*===\s*'light'\s*\|\|\s*v\s*===\s*'dark'/);
    assert.ok(sfc.includes('.nano-tree.theme-light'));
    assert.ok(sfc.includes('.nano-tree.theme-dark'));
    assert.ok(sfc.includes('var(--nano-tree-bg,'));
    assert.ok(sfc.includes('var(--nano-tree-badge-emerald-bg,'));
    assert.doesNotMatch(sfc, /:global\(/);
    assert.doesNotMatch(sfc, /\[data-v-/);
    assert.doesNotMatch(sfc, /\btypeof\b/);

    // 2. Dark & Light CSS custom properties in colors.css + WCAG AA contrast verification
    const lightIdx = colorsCss.indexOf(':root[data-theme="light"]');
    assert.ok(lightIdx > 0, 'Expected Light Theme block in colors.css');
    const darkSection = colorsCss.slice(0, lightIdx);
    const lightSection = colorsCss.slice(lightIdx);

    for (const token of [
      '--nano-tree-bg',
      '--nano-tree-border',
      '--nano-tree-fg',
      '--nano-tree-muted',
      '--nano-tree-line',
      '--nano-tree-line-active',
      '--nano-tree-accent',
      '--nano-tree-badge-emerald-bg',
      '--nano-tree-badge-emerald-fg',
    ]) {
      assert.ok(darkSection.includes(`${token}:`), `Missing dark token ${token} in colors.css`);
      assert.ok(lightSection.includes(`${token}:`), `Missing light token ${token} in colors.css`);
    }

    assert.ok(getWcagContrastRatio('#0f172a', '#ffffff') >= 4.5, 'Primary label contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#475569', '#ffffff') >= 4.5, 'Secondary/muted contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#0369a1', '#ffffff') >= 4.5, 'Branch toggle accent contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#047857', '#ecfdf5') >= 4.5, 'MIT emerald badge contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#64748b', '#ffffff') >= 3.0, 'Tree connector line contrast >= 3.0:1');

    // 3. EcosystemDoc tree versions read SSoT pkg.version, utils v5.4.1, vue-url-cleaner v1.0.0
    assert.ok(ecosystemDoc.includes('version: pkg.version'));
    assert.ok(ecosystemDoc.includes("version: '5.4.1'"));
    assert.ok(ecosystemDoc.includes("label: 'vue-url-cleaner'"));
  });
});
