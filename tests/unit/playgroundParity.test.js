import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
})
