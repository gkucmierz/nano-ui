import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorageController } from '../../src/utils/storage-controller.js';
import {
  IDENTITY_QUAT,
  deviceOrientationToQuaternion,
  computeStabilizedWorldQuaternion,
  createInertialStabilizerEngine,
} from '../../src/utils/inertialOrientationStabilizer.js';
import { resolveDualEngineConfig } from '../e2e/dualEngineCdp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const collectRepoSourceFiles = (dirPath, out = []) => {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dist-app', 'dist-ssg', '.git'].includes(entry.name)) continue;
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectRepoSourceFiles(abs, out);
    } else if (/\.(?:js|mjs|vue)$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
};

describe('Repository Self-Containment, Node 24 Headless Storage Isolation & Dual-Engine CDP', () => {
  test('zero relative imports escape outside the nano-ui repository root (prevents CI Rolldown UNRESOLVED_IMPORT)', () => {
    const dirsToScan = ['src', 'scripts', 'tests'];
    const escapingImports = [];
    const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;

    for (const sub of dirsToScan) {
      const files = collectRepoSourceFiles(path.join(rootDir, sub));
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = importRe.exec(content)) !== null) {
          const spec = match[1];
          const resolved = path.resolve(path.dirname(file), spec);
          if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
            escapingImports.push(`${path.relative(rootDir, file)} -> ${spec}`);
          }
        }
      }
    }

    assert.deepEqual(
      escapingImports,
      [],
      `Found relative imports escaping outside nano-ui repo root:\n${escapingImports.join('\n')}`,
    );
  });

  test('isolates mode="ls" and mode="ss" fallback memory adapters when localStorage and sessionStorage are absent (Node 24 CI)', () => {
    const headlessNodeEnv = {};
    const rootCtrl = createStorageController({
      env: headlessNodeEnv,
      appPrefix: 'science-blog',
    });
    const scoped = rootCtrl.scope('nano-ui');

    scoped.set('unit_lightbox_state', { isZoomed: true, activeIndex: 1 }, { mode: 'ls' });

    assert.deepEqual(scoped.get('unit_lightbox_state', null, { mode: 'ls' }), {
      isZoomed: true,
      activeIndex: 1,
    });
    assert.equal(
      scoped.get('unit_lightbox_state', null, { mode: 'ss' }),
      null,
      'mode="ss" fallback must never read or collide with mode="ls" fallback in headless Node',
    );

    scoped.set('unit_lightbox_state', { isZoomed: false, activeIndex: 0 }, { mode: 'ss' });
    assert.deepEqual(scoped.get('unit_lightbox_state', null, { mode: 'ls' }), {
      isZoomed: true,
      activeIndex: 1,
    });
    assert.deepEqual(scoped.get('unit_lightbox_state', null, { mode: 'ss' }), {
      isZoomed: false,
      activeIndex: 0,
    });
  });

  test('self-contained inertialOrientationStabilizer computes identity calibration and tilt stabilization cleanly', () => {
    const engine = createInertialStabilizerEngine({ smoothing: 1, gain: 1 });
    assert.equal(engine.ingestOrientation({ alpha: 10, beta: 45, gamma: 0 }), true);
    const frame0 = engine.stepFrame();
    assert.deepEqual(frame0.worldQuaternion, IDENTITY_QUAT);

    const q = deviceOrientationToQuaternion({ alpha: 25, beta: 60, gamma: -10 });
    assert.equal(q.length, 4);
    const stab = computeStabilizedWorldQuaternion({
      currentDeviceQuat: q,
      initialDeviceQuat: IDENTITY_QUAT,
    });
    assert.equal(Number.isFinite(stab.tiltDeg.pitch), true);
  });

  test('Gitea workflow healthcheck_url matches canonical nano-ui.7u.pl domain (when present outside Docker) and Dual-Engine CDP resolves cleanly', () => {
    const wfPath = path.join(rootDir, '.gitea/workflows/build.yaml');
    if (fs.existsSync(wfPath)) {
      const wf = fs.readFileSync(wfPath, 'utf8');
      assert.match(wf, /healthcheck_url:\s*['"]https:\/\/nano-ui\.7u\.pl\/['"]/);
    }

    const fallbackCfg = resolveDualEngineConfig({
      env: { E2E_ENGINE: 'obscura', PATH: '' },
      defaultPort: 43164,
      existsSync: () => false,
    });
    assert.equal(fallbackCfg.effectiveFastEngine, 'chromium');
    assert.equal(fallbackCfg.fallbackToChromium, true);

    const obscuraCfg = resolveDualEngineConfig({
      env: { E2E_ENGINE: 'auto', OBSCURA_BIN: '/opt/homebrew/bin/obscura' },
      defaultPort: 43164,
      existsSync: (p) => p === '/opt/homebrew/bin/obscura',
    });
    assert.equal(obscuraCfg.effectiveFastEngine, 'obscura');
    assert.equal(obscuraCfg.wsEndpoint, 'http://127.0.0.1:43164');
  });
});
