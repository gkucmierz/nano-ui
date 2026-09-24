import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Sibling path or local node_modules
const lucideCandidates = [
  path.resolve(rootDir, '../dashboard-app/ui/node_modules/lucide-vue-next/dist/esm/icons'),
  path.resolve(rootDir, '../billard-app/node_modules/lucide-vue-next/dist/esm/icons'),
  path.resolve(rootDir, '../cv-app/node_modules/lucide-vue-next/dist/esm/icons'),
];

let lucideIconsDir = null;
for (const cand of lucideCandidates) {
  if (fs.existsSync(cand)) {
    lucideIconsDir = cand;
    break;
  }
}

if (!lucideIconsDir) {
  console.error('Could not locate lucide-vue-next icons directory in sibling projects.');
  process.exit(1);
}

const iconsSpec = [
  // Status & Feedback
  { key: 'warn', file: 'triangle-alert.js', aliases: ['alert-triangle', 'triangle-alert'] },
  { key: 'info', file: 'info.js' },
  { key: 'success', file: 'circle-check.js', aliases: ['check-circle', 'circle-check'] },
  { key: 'danger', file: 'circle-alert.js', aliases: ['alert-circle', 'circle-alert'] },
  { key: 'help', file: 'circle-help.js', aliases: ['help-circle', 'circle-help'] },
  { key: 'bell', file: 'bell.js' },
  { key: 'bell-off', file: 'bell-off.js' },

  // Navigation & Direction
  { key: 'chevron-down', file: 'chevron-down.js' },
  { key: 'chevron-up', file: 'chevron-up.js' },
  { key: 'chevron-left', file: 'chevron-left.js' },
  { key: 'chevron-right', file: 'chevron-right.js' },
  { key: 'arrow-down', file: 'arrow-down.js' },
  { key: 'arrow-up', file: 'arrow-up.js' },
  { key: 'arrow-left', file: 'arrow-left.js' },
  { key: 'arrow-right', file: 'arrow-right.js' },
  { key: 'menu', file: 'menu.js' },
  { key: 'close', file: 'x.js', aliases: ['x'] },
  { key: 'more-horizontal', file: 'ellipsis.js', aliases: ['more-h'] },
  { key: 'more-vertical', file: 'ellipsis-vertical.js', aliases: ['more-v'] },
  { key: 'external-link', file: 'external-link.js' },

  // Actions & Editing
  { key: 'check', file: 'check.js' },
  { key: 'copy', file: 'copy.js' },
  { key: 'search', file: 'search.js' },
  { key: 'plus', file: 'plus.js' },
  { key: 'minus', file: 'minus.js' },
  { key: 'trash', file: 'trash-2.js', aliases: ['delete', 'trash-2'] },
  { key: 'edit', file: 'pencil.js', aliases: ['pencil'] },
  { key: 'refresh', file: 'refresh-cw.js', aliases: ['rotate', 'refresh-cw'] },
  { key: 'filter', file: 'filter.js' },
  { key: 'download', file: 'download.js' },
  { key: 'upload', file: 'upload.js' },
  { key: 'share', file: 'share-2.js', aliases: ['share-2'] },
  { key: 'link', file: 'link.js' },
  { key: 'save', file: 'save.js' },

  // Controls & Display
  { key: 'sun', file: 'sun.js' },
  { key: 'moon', file: 'moon.js' },
  { key: 'eye', file: 'eye.js' },
  { key: 'eye-off', file: 'eye-off.js' },
  { key: 'settings', file: 'settings.js', aliases: ['gear'] },
  { key: 'sliders', file: 'sliders-horizontal.js', aliases: ['tune', 'adjust'] },
  { key: 'lock', file: 'lock.js' },
  { key: 'unlock', file: 'lock-open.js' },
  { key: 'maximize', file: 'maximize-2.js', aliases: ['expand'] },
  { key: 'minimize', file: 'minimize-2.js', aliases: ['collapse'] },
  { key: 'spinner', file: 'loader-2.js', aliases: ['loader', 'loader-2'] },

  // Data, Code & System
  { key: 'database', file: 'database.js' },
  { key: 'table', file: 'table.js' },
  { key: 'terminal', file: 'terminal.js' },
  { key: 'code', file: 'code.js' },
  { key: 'layers', file: 'layers.js' },
  { key: 'activity', file: 'activity.js', aliases: ['pulse'] },
  { key: 'cpu', file: 'cpu.js' },
  { key: 'server', file: 'server.js' },
  { key: 'git-branch', file: 'git-branch.js' },
  { key: 'git-commit', file: 'git-commit-horizontal.js' },
  { key: 'play', file: 'play.js' },
  { key: 'pause', file: 'pause.js' },
  { key: 'square', file: 'square.js' },
  { key: 'box', file: 'box.js', aliases: ['package'] },
  { key: 'cloud', file: 'cloud.js' },
  { key: 'cloud-download', file: 'cloud-download.js' },
  { key: 'wifi', file: 'wifi.js' },
  { key: 'wifi-off', file: 'wifi-off.js' },

  // Content, Layout & Media
  { key: 'file', file: 'file.js' },
  { key: 'file-text', file: 'file-text.js' },
  { key: 'folder', file: 'folder.js' },
  { key: 'image', file: 'image.js' },
  { key: 'user', file: 'user.js' },
  { key: 'users', file: 'users.js' },
  { key: 'calendar', file: 'calendar.js' },
  { key: 'clock', file: 'clock.js' },
  { key: 'hash', file: 'hash.js' },
  { key: 'star', file: 'star.js' },
  { key: 'globe', file: 'globe.js' },
  { key: 'sparkles', file: 'sparkles.js' },
  { key: 'book-open', file: 'book-open.js', aliases: ['book'] },
  { key: 'layout', file: 'layout.js', aliases: ['grid'] },
  { key: 'shield', file: 'shield.js' },
  { key: 'key', file: 'key.js' },
  { key: 'history', file: 'history.js' },
  { key: 'list', file: 'list.js' },
];

const registry = {};

for (const spec of iconsSpec) {
  const filePath = path.join(lucideIconsDir, spec.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: Missing icon file: ${spec.file} for ${spec.key}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/createLucideIcon\([^,]+,\s*(\[[\s\S]*?\])\s*\);/);
  if (!match) {
    console.warn(`⚠️ Warning: Could not match elements array in: ${spec.file}`);
    continue;
  }
  try {
    const fn = new Function(`return ${match[1]}`);
    const elements = fn().map(([tag, attrs]) => {
      const { key: _key, ...cleanAttrs } = attrs;
      return [tag, cleanAttrs];
    });

    registry[spec.key] = elements;
    if (spec.aliases) {
      for (const alias of spec.aliases) {
        registry[alias] = elements;
      }
    }
  } catch (err) {
    console.error(`Error processing ${spec.file}:`, err.message);
  }
}

// Generate src/icons/registry.js
const outDir = path.resolve(rootDir, 'src/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.resolve(outDir, 'registry.js');

const banner = `/**
 * @file src/icons/registry.js
 * @description Single Source of Truth (SSoT) for Nano UI vector icons.
 * Auto-generated by scripts/build-icons.mjs.
 * 100% offline-first, zero runtime external dependencies.
 */

`;

const code = `${banner}export const NANO_ICONS = ${JSON.stringify(registry, null, 2)};

export const registerIcons = (newIcons) => {
  if (newIcons && typeof newIcons === 'object') {
    Object.assign(NANO_ICONS, newIcons);
  }
};

export const getAvailableIcons = () => {
  return Object.keys(NANO_ICONS);
};
`;

fs.writeFileSync(outPath, code, 'utf8');
console.log(`✅ Successfully generated ${Object.keys(registry).length} icon definitions into: ${outPath}`);
