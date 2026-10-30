import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_COUNTRIES_LITE } from '../../src/data/worldCountriesLite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

describe('NanoGlobe Component & WORLD_COUNTRIES_LITE Dataset', () => {
  it('bundles 180 simplified world countries with valid [lon, lat] rings and centroids', () => {
    assert.ok(WORLD_COUNTRIES_LITE.length >= 170, `Expected >= 170 countries, got ${WORLD_COUNTRIES_LITE.length}`);
    const poland = WORLD_COUNTRIES_LITE.find((c) => c.id === 'POL' || c.name === 'Poland');
    const chad = WORLD_COUNTRIES_LITE.find((c) => c.id === 'TCD' || c.name === 'Chad');
    const russia = WORLD_COUNTRIES_LITE.find((c) => c.id === 'RUS' || c.name === 'Russia');
    assert.ok(poland, 'Expected Poland in WORLD_COUNTRIES_LITE');
    assert.ok(chad, 'Expected Chad in WORLD_COUNTRIES_LITE');
    assert.ok(russia, 'Expected Russia in WORLD_COUNTRIES_LITE');
    assert.ok(poland.rings.length >= 1 && poland.rings[0].length >= 4);
  });

  it('NanoGlobe.vue implements orthographic projection, horizon clipping, cartographic graticule, and HEALPix tessellation', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8');
    assert.ok(src.includes('clipSphericalPolygonToHorizon'), 'Must clip spherical polygons against orthographic horizon z >= 0');
    assert.ok(src.includes('graticulePathD'), 'Must render cartographic graticule');
    assert.ok(src.includes('healpixCells'), 'Must render HEALPix equal-area spherical grid');
    assert.ok(src.includes('teal-coral'), 'Must provide teal-coral preset matching reference screenshot');
    assert.equal(src.includes(':global('), false, 'Must not use :global() prefix inside <style scoped>');
  });
});
