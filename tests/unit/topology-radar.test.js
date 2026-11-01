import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const radarPath = path.resolve(__dirname, '../../src/components/TopologyRadar.vue')

describe('TopologyRadar Component — Geometric Boundary Clipping & Topmost Labels', () => {
  const source = fs.readFileSync(radarPath, 'utf8')

  it('clips the data layer (contours, live polygon, vertex dots) strictly inside the outer geometric polygon via <clipPath>', () => {
    assert.ok(source.includes('<clipPath :id="clipId">'), 'Expected SVG <clipPath> definition')
    assert.ok(source.includes('<polygon :points="getGridPolygon(1.0)" />'), 'Expected clipPath to use outer 100% grid polygon')
    assert.ok(source.includes(':clip-path="`url(#${clipId})`"'), 'Expected radar-data-layer to apply clip-path')
    assert.ok(source.includes('stroke-linejoin="round"'), 'Expected rounded stroke joins to prevent acute miter spikes')
  })

  it('clamps data values to [0, 100] and insets maxDataRadius so vertex dots stay inside the polygon border', () => {
    assert.ok(source.includes('Math.max(0, Math.min(100, safeVal))'), 'Expected [0, 100] clamping in getPoint / getDataPoint')
    assert.ok(source.includes('const maxDataRadius = Math.max(4, radius.value - 3.5)'), 'Expected data radius inset for stroke/dot clearance')
  })

  it('renders the axis labels layer after the data layer (always on top in SVG painting order) with outward quadrant text-anchor', () => {
    const dataLayerIdx = source.indexOf('class="radar-data-layer"')
    const labelsLayerIdx = source.indexOf('class="radar-labels-layer"')
    assert.ok(dataLayerIdx > 0 && labelsLayerIdx > dataLayerIdx, 'Expected .radar-labels-layer to appear after .radar-data-layer in SVG DOM')
    assert.ok(source.includes("if (cosA > 0.18) textAnchor = 'start'"), 'Expected right-hemisphere labels to use text-anchor="start"')
    assert.ok(source.includes("else if (cosA < -0.18) textAnchor = 'end'"), 'Expected left-hemisphere labels to use text-anchor="end"')
  })
})
