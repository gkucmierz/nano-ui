import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sfcPath = path.resolve(__dirname, '../../../src/components/NanoCodeBlock.vue')
const sfcContent = fs.readFileSync(sfcPath, 'utf-8')
const { descriptor } = parse(sfcContent)

describe('NanoCodeBlock Component Structure & Slot Fallback', () => {
  test('should import highlightCode from syntax-highlighter', () => {
    assert.match(descriptor.scriptSetup.content, /import\s*\{\s*highlightCode\s*\}\s*from\s*['"]\.\.\/utils\/syntax-highlighter\.js['"]/)
  })

  test('should compute highlightedCode using highlightCode utility', () => {
    assert.match(descriptor.scriptSetup.content, /const\s+highlightedCode\s*=\s*computed\(/)
    assert.match(descriptor.scriptSetup.content, /highlightCode\(currentCode\.value,\s*currentLang\.value\)/)
  })

  test('should preserve default slot fallback in pre element when currentCode is empty', () => {
    const templateContent = descriptor.template.content
    assert.match(templateContent, /<pre ref="preRef" class="code-block-pre">/)
    assert.match(templateContent, /<slot\s+v-else\s*\/>/)
  })

  test('should include scoped styling tokens for syntax highlight classes', () => {
    const styleContent = descriptor.styles.map(s => s.content).join('\n')
    assert.match(styleContent, /\.hljs-keyword/)
    assert.match(styleContent, /\.hljs-string/)
    assert.match(styleContent, /\.hljs-number/)
    assert.match(styleContent, /\.hljs-comment/)
    assert.match(styleContent, /\.hljs-tag/)
  })

  test('should include light mode high-contrast overrides for strings and numbers', () => {
    const styleContent = descriptor.styles.map(s => s.content).join('\n')
    assert.match(styleContent, /#059669/, 'Should have darkened green for light mode strings')
    assert.match(styleContent, /#d97706/, 'Should have darkened amber/yellow for light mode numbers')
  })
})
