import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { usePlaygroundSearch, PLAYGROUND_NAV_ITEMS } from '../../src/playground/usePlaygroundSearch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, next))
    } else {
      keys.push(next)
    }
  }
  return keys
}

describe('Nano UI Playground & i18n Parity', () => {
  test('en.json and pl.json should have 100% identical translation keys', () => {
    const en = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/locales/en.json'), 'utf8'))
    const pl = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/locales/pl.json'), 'utf8'))

    const enKeys = flattenKeys(en).sort()
    const plKeys = flattenKeys(pl).sort()

    assert.deepEqual(enKeys, plKeys, 'All translation keys in en.json and pl.json must match 1:1')
  })

  test('every component in src/components/ should be imported in src/playground/', () => {
    const compDir = path.join(rootDir, 'src/components')
    const compFiles = fs.readdirSync(compDir).filter((f) => f.endsWith('.vue'))

    const playgroundDir = path.join(rootDir, 'src/playground')
    const docsDir = path.join(playgroundDir, 'docs')
    const allPlaygroundSources = [
      fs.readFileSync(path.join(playgroundDir, 'App.vue'), 'utf8'),
      ...fs.readdirSync(docsDir)
        .filter((f) => f.endsWith('.vue'))
        .map((f) => fs.readFileSync(path.join(docsDir, f), 'utf8')),
    ].join('\n')

    for (const file of compFiles) {
      const compName = file.replace(/\.vue$/, '')
      assert.ok(
        allPlaygroundSources.includes(compName),
        `Component ${compName} (${file}) must be showcased in the Playground`
      )
    }
  })

  test('every defineExpose({...}) in src/components/*.vue only references declared identifiers', () => {
    const compDir = path.join(rootDir, 'src/components')
    for (const file of fs.readdirSync(compDir).filter((f) => f.endsWith('.vue'))) {
      const content = fs.readFileSync(path.join(compDir, file), 'utf8')
      const match = content.match(/defineExpose\(\{([\s\S]*?)\}\)/)
      if (!match) continue
      for (const line of match[1].split('\n')) {
        const trimmed = line.trim().replace(/,$/, '')
        if (!trimmed || trimmed.startsWith('//')) continue
        const parts = trimmed.split(':')
        const ident = (parts.length > 1 ? parts[1] : parts[0]).trim()
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ident)) {
          const declRegex = new RegExp(`\\b(const|let|var|function)\\s+${ident}\\b`)
          assert.ok(
            declRegex.test(content),
            `Undeclared identifier "${ident}" inside defineExpose() of ${file}`
          )
        }
      }
    }
  })

  test('usePlaygroundSearch (vue-minisearch) indexes all subpages and filters by component, content, and diacritic-insensitive queries', () => {
    const { searchQuery, matchedItems, matchedIdSet, totalCount, clearSearch } = usePlaygroundSearch()
    assert.equal(totalCount, PLAYGROUND_NAV_ITEMS.length)
    assert.equal(matchedItems.value.length, PLAYGROUND_NAV_ITEMS.length)

    // Diacritic-insensitive Polish search: 'pokretlo' -> /docs/knob
    searchQuery.value = 'pokretlo'
    assert.ok(matchedIdSet.value.has('/docs/knob'), 'Searching "pokretlo" should match /docs/knob')

    // Deep content / mathematical keyword search: 'HEALPix' -> /docs/globe
    searchQuery.value = 'HEALPix'
    assert.ok(matchedIdSet.value.has('/docs/globe'), 'Searching "HEALPix" should match /docs/globe')

    // Band / trend chart keyword search: 'SB-ND' -> /docs/trend-chart
    searchQuery.value = 'SB-ND'
    assert.ok(matchedIdSet.value.has('/docs/trend-chart'), 'Searching "SB-ND" should match /docs/trend-chart')

    // Component tag search: 'NuPinInput' -> /docs/masked-input
    searchQuery.value = 'NuPinInput'
    assert.ok(matchedIdSet.value.has('/docs/masked-input'), 'Searching "NuPinInput" should match /docs/masked-input')

    clearSearch()
    assert.equal(searchQuery.value, '')
    assert.equal(matchedItems.value.length, PLAYGROUND_NAV_ITEMS.length)
  })
})
