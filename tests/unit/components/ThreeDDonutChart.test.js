import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sfcPath = path.resolve(__dirname, '../../../src/components/ThreeDDonutChart.vue')
const sfcContent = fs.readFileSync(sfcPath, 'utf-8')
const { descriptor } = parse(sfcContent)

const find3DBlock = (node) => {
  if (!node || !node.children) return null
  for (const child of node.children) {
    if (child.type === 1 && child.tag === 'template') {
      const vIf = child.props?.find(p => p.name === 'if' && p.exp?.content?.includes('is3D'))
      if (vIf) return child
    }
    const found = find3DBlock(child)
    if (found) return found
  }
  return null
}

const findAttr = (node, name) => {
  if (!node || !node.props) return null
  const prop = node.props.find(p => p.name === name || (p.name === 'bind' && p.arg?.content === name))
  if (!prop) return null
  return prop.value?.content ?? prop.exp?.content ?? null
}

const findChildWithAttr = (node, name, value) => {
  if (!node) return null
  const attr = findAttr(node, name)
  if (attr === value) return node
  if (node.children) {
    for (const child of node.children) {
      if (child.type === 1) {
        const found = findChildWithAttr(child, name, value)
        if (found) return found
      }
    }
  }
  return null
}

describe('ThreeDDonutChart SVG Painter Architecture & Render Order', () => {
  const block3D = find3DBlock(descriptor.template.ast)
  assert.ok(block3D, '3D template block (<template v-if="props.is3D">) must exist')

  const layers = block3D.children.filter(c => c.type === 1)

  describe('when validating the 8-layer painter sequence', () => {
    test('should strictly define exactly 8 top-level SVG layers inside the 3D block', () => {
      assert.equal(layers.length, 8, 'Must have exactly 8 layers for 3D painter algorithm')
    })

    test('layer 1: should render back outer walls as the bottom-most layer', () => {
      const layer = layers[0]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('backSlices'), 'Must iterate over backSlices')
      assert.equal(findAttr(layer, 'data-half'), 'back')
      assert.ok(findChildWithAttr(layer, 'data-wall', 'outer-wall'), 'Must contain path with data-wall="outer-wall"')
    })

    test('layer 2: should render back cut walls sorted by angle order before inner walls', () => {
      const layer = layers[1]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('backCutWallsSorted'), 'Must iterate over backCutWallsSorted')
      assert.equal(findAttr(layer, 'data-half'), 'back')
      assert.equal(findAttr(layer, 'data-layer'), 'cut-wall')
    })

    test('layer 3: should render back inner walls after back cut walls so cuts do not clip inner hole', () => {
      const layer = layers[2]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('backSlices'), 'Must iterate over backSlices')
      assert.equal(findAttr(layer, 'data-half'), 'back')
      assert.ok(findChildWithAttr(layer, 'data-wall', 'inner-wall'), 'Must contain path with data-wall="inner-wall"')
    })

    test('layer 4: should render front inner walls before front cut walls', () => {
      const layer = layers[3]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('frontSlices'), 'Must iterate over frontSlices')
      assert.equal(findAttr(layer, 'data-half'), 'front')
      assert.ok(findChildWithAttr(layer, 'data-wall', 'inner-wall'), 'Must contain path with data-wall="inner-wall"')
    })

    test('layer 5: should render front cut walls sorted by angle order before front outer walls', () => {
      const layer = layers[4]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('frontCutWallsSorted'), 'Must iterate over frontCutWallsSorted')
      assert.equal(findAttr(layer, 'data-half'), 'front')
      assert.equal(findAttr(layer, 'data-layer'), 'cut-wall')
    })

    test('layer 6: should render front outer walls before top surfaces', () => {
      const layer = layers[5]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('frontSlices'), 'Must iterate over frontSlices')
      assert.equal(findAttr(layer, 'data-half'), 'front')
      assert.ok(findChildWithAttr(layer, 'data-wall', 'outer-wall'), 'Must contain path with data-wall="outer-wall"')
    })

    test('layer 7: should render unsplit top surfaces across all slices', () => {
      const layer = layers[6]
      assert.equal(layer.tag, 'g')
      const vFor = findAttr(layer, 'for')
      assert.ok(vFor?.includes('topSlices'), 'Must iterate over topSlices')
      assert.equal(findAttr(layer, 'data-layer'), 'top-face')
      assert.ok(findChildWithAttr(layer, 'data-wall', 'top-face'), 'Must contain path with data-wall="top-face"')
    })

    test('layer 8: should render center hole text/label on top of all 3D layers', () => {
      const layer = layers[7]
      assert.equal(layer.tag, 'g')
      const vIf = findAttr(layer, 'if')
      assert.ok(vIf?.includes('showCenterText'), 'Must be conditionally rendered with showCenterText')
      const klass = findAttr(layer, 'class')
      assert.ok(klass?.includes('center-text-group'), 'Must have center-text-group class')
    })
  })

  describe('when validating initial data population and reactivity', () => {
    test('should ensure immediate data population leaves values non-zero to prevent empty chart render', () => {
      const scriptContent = descriptor.scriptSetup?.content || ''
      assert.ok(
        scriptContent.includes('value: immediate ? item.value : 0'),
        'updateAnimatedData must populate item.value when immediate is true'
      )
      assert.ok(
        scriptContent.includes('startValue: immediate ? item.value : 0'),
        'updateAnimatedData must populate startValue when immediate is true'
      )
    })
  })

  describe('when validating kinetic geometry controllers (slopeKinetic and thicknessKinetic)', () => {
    const scriptContent = descriptor.scriptSetup?.content || ''

    test('should declare slopeKinetic and thicknessKinetic using createKineticTransition', () => {
      assert.ok(
        scriptContent.includes('const slopeKinetic = createKineticTransition('),
        'slopeKinetic must be instantiated via createKineticTransition'
      )
      assert.ok(
        scriptContent.includes('const thicknessKinetic = createKineticTransition('),
        'thicknessKinetic must be instantiated via createKineticTransition'
      )
    })

    test('should configure kinetic controllers with proportional timingMode for instant micro-drag response', () => {
      assert.ok(
        scriptContent.includes("timingMode: 'proportional'"),
        'Controllers must use proportional timing mode for low-latency dragging'
      )
    })

    test('should delegate slopeRatio and thickness prop changes to kinetic setTarget', () => {
      assert.ok(
        scriptContent.includes('slopeKinetic.setTarget('),
        'watch slopeRatio must call slopeKinetic.setTarget'
      )
      assert.ok(
        scriptContent.includes('thicknessKinetic.setTarget('),
        'watch thickness must call thicknessKinetic.setTarget'
      )
    })

    test('should include slopeKinetic and thicknessKinetic in isChartMoving for seam cut coordination', () => {
      assert.ok(
        scriptContent.includes('isSlopeMoving.value || isThicknessMoving.value'),
        'isChartMoving must track isSlopeMoving and isThicknessMoving'
      )
    })

    test('should cleanly destroy kinetic controllers on unmount', () => {
      assert.ok(
        scriptContent.includes('slopeKinetic.destroy()'),
        'slopeKinetic must be destroyed in onUnmounted'
      )
      assert.ok(
        scriptContent.includes('thicknessKinetic.destroy()'),
        'thicknessKinetic must be destroyed in onUnmounted'
      )
    })
  })

  describe('when validating zero-layout-shift (CLS = 0) wrapper synchronization', () => {
    const scriptContent = descriptor.scriptSetup?.content || ''
    const styleContent = descriptor.styles?.[0]?.content || ''

    test('should dynamically bind wrapper maxWidth and maxHeight to animVbWidth and animVbHeight', () => {
      assert.ok(
        scriptContent.includes('maxWidth: `${animVbWidth.value}px`'),
        'wrapperStyle must dynamically bind maxWidth to animVbWidth'
      )
      assert.ok(
        scriptContent.includes('maxHeight: `${animVbHeight.value}px`'),
        'wrapperStyle must clamp maxHeight to animVbHeight to eliminate height ballooning'
      )
      assert.ok(
        scriptContent.includes('`${animVbWidth.value} / ${animVbHeight.value}`'),
        'wrapperStyle must compute aspectRatio dynamically from animVbWidth and animVbHeight'
      )
    })

    test('should disable transitions on .donut-canvas-wrapper during active animations to avoid fighting RAF', () => {
      assert.ok(
        styleContent.includes('.donut-canvas-wrapper.no-transitions'),
        '.donut-canvas-wrapper.no-transitions must be defined'
      )
    })
  })

  describe('when validating depth prop and wall height configuration', () => {
    const scriptContent = descriptor.scriptSetup?.content || ''

    test('should declare depth prop with default 32 and positive validator', () => {
      assert.ok(
        scriptContent.includes('depth: {'),
        'depth prop must be declared in defineProps'
      )
      assert.ok(
        scriptContent.includes('default: 32'),
        'depth prop must default to 32'
      )
      assert.ok(
        scriptContent.includes('validator: (val) => val >= 0'),
        'depth prop must validate val >= 0'
      )
    })

    test('should watch props.depth and trigger recomputeGeometryRadii', () => {
      assert.ok(
        scriptContent.includes('watch(() => props.depth'),
        'must watch props.depth'
      )
      assert.ok(
        scriptContent.includes('recomputeGeometryRadii()'),
        'must recompute geometry radii on depth change'
      )
    })
  })

  describe('when validating centerTextZ prop and auto slope transition', () => {
    const scriptContent = descriptor.scriptSetup?.content || ''

    test('should declare centerTextZ prop supporting [Number, String] with default "auto"', () => {
      assert.ok(
        scriptContent.includes('centerTextZ: {'),
        'centerTextZ prop must be declared'
      )
      assert.ok(
        scriptContent.includes("default: 'auto'"),
        "centerTextZ prop must default to 'auto'"
      )
    })

    test('should compute effectiveCenterTextZ dynamically: 1.0 at slope 0, 0.0 at slope 1', () => {
      assert.ok(
        scriptContent.includes('const effectiveCenterTextZ = computed('),
        'must compute effectiveCenterTextZ'
      )
      assert.ok(
        scriptContent.includes('1.0 - slope'),
        'must compute 1.0 - slope when auto'
      )
    })
  })
})
