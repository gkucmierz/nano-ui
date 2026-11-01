import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const stepperPath = path.resolve(import.meta.dirname, '../../src/components/NanoNumberStepper.vue')
const stepperSource = fs.readFileSync(stepperPath, 'utf8')

describe('NanoNumberStepper Component & --nano-stepper-color Single-Variable Theming', () => {
  it('declares optional min (-Infinity), max (Infinity), step (1), and color (secondary) props', () => {
    assert.match(stepperSource, /min:\s*\{\s*type:\s*Number,\s*default:\s*-Infinity\s*\}/)
    assert.match(stepperSource, /max:\s*\{\s*type:\s*Number,\s*default:\s*Infinity\s*\}/)
    assert.match(stepperSource, /step:\s*\{\s*type:\s*Number,\s*default:\s*1\s*\}/)
    assert.match(stepperSource, /color:\s*\{\s*type:\s*String,\s*default:\s*'secondary'\s*\}/)
  })

  it('supports all 6 Nano UI button color names plus semantic aliases and raw CSS color strings via --nano-stepper-color', () => {
    for (const colorName of ['primary', 'success', 'danger', 'active', 'secondary', 'ghost']) {
      assert.match(stepperSource, new RegExp(`'${colorName}'`))
    }
    assert.match(stepperSource, /\.nano-number-stepper\.color-primary/)
    assert.match(stepperSource, /\.nano-number-stepper\.color-success/)
    assert.match(stepperSource, /\.nano-number-stepper\.color-danger/)
    assert.match(stepperSource, /\.nano-number-stepper\.color-active/)
    assert.match(stepperSource, /'--nano-stepper-color'/)
    assert.match(stepperSource, /color-mix\(in srgb,\s*var\(--_accent\)/)
  })

  it('prevents hover vertical jump and preserves outer top border on stacked and split buttons', () => {
    assert.doesNotMatch(stepperSource, /transform:\s*translateY\(-/)
    assert.match(stepperSource, /overflow:\s*hidden/)
  })
})
