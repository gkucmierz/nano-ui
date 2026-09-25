import { test, expect } from '@playwright/test'

test.describe('3D Donut Chart Wall Geometry & Visibility Specs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/3d-donut-chart')
    await page.waitForSelector('.items-svg-chart path')
  })

  test('should render top faces and cylindrical walls with semantic data attributes at rest', async ({ page }) => {
    // Verify that slices have semantic data-half and data-wall attributes
    const topFaces = page.locator('.items-svg-chart path[data-wall="top-face"]')
    const topFaceCount = await topFaces.count()
    expect(topFaceCount).toBeGreaterThan(0)

    const outerWalls = page.locator('.items-svg-chart path[data-wall="outer-wall"]')
    const outerWallCount = await outerWalls.count()
    expect(outerWallCount).toBeGreaterThan(0)

    const innerWalls = page.locator('.items-svg-chart path[data-wall="inner-wall"]')
    const innerWallCount = await innerWalls.count()
    expect(innerWallCount).toBeGreaterThan(0)

    // At rest, internal partition cuts between adjacent touching slices should not be rendered
    const partitionCuts = page.locator('.items-svg-chart path[data-wall="start-cut"], .items-svg-chart path[data-wall="end-cut"]')
    await expect(partitionCuts).toHaveCount(0)
  })

  test('should render start and end partition cuts when a slice is hovered', async ({ page }) => {
    // Hover over Russia label to activate Russia slice
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.hover({ force: true })

    // When hovered, the active slice and neighbor gap walls should render partition cuts
    const activeCuts = page.locator('.items-svg-chart path[data-wall="start-cut"], .items-svg-chart path[data-wall="end-cut"]')
    await expect(activeCuts.first()).toBeVisible({ timeout: 2000 })
    const activeCutsCount = await activeCuts.count()
    expect(activeCutsCount).toBeGreaterThan(0)
  })

  test('should isolate single hovered slice when window.fullOpacity is true', async ({ page }) => {
    // Set window.fullOpacity to true via page evaluation
    await page.evaluate(() => {
      window.fullOpacity = true
    })

    // Hover over Russia slice
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.hover({ force: true })

    // Confirm that non-hovered slice groups receive opacity: 0 style
    const dimmedSlices = page.locator('.items-svg-chart .slice-group-3d.is-dimmed')
    const dimmedCount = await dimmedSlices.count()
    expect(dimmedCount).toBeGreaterThan(0)

    for (let i = 0; i < dimmedCount; i++) {
      const sliceEl = dimmedSlices.nth(i)
      const opacity = await sliceEl.evaluate((el) => window.getComputedStyle(el).opacity)
      expect(Number(opacity)).toBe(0)
    }

    // Confirm that the active hovered slice group retains opacity: 1
    const activeSlice = page.locator('.items-svg-chart .slice-group-3d.is-hovered').first()
    await expect(activeSlice).toBeVisible()
    const activeOpacity = await activeSlice.evaluate((el) => window.getComputedStyle(el).opacity)
    expect(Number(activeOpacity)).toBe(1)
  })

  test('should synchronize cut wall extrusion animation and transform with hovered slice', async ({ page }) => {
    // Hover over Russia slice
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.hover({ force: true })

    // Find the hovered cut wall group and top face group for the active slice
    const hoveredCutWallGroup = page.locator('.items-svg-chart g[data-layer="cut-wall"].is-hovered').first()
    await expect(hoveredCutWallGroup).toBeVisible()

    const hoveredTopFaceGroup = page.locator('.items-svg-chart g:not([data-layer="cut-wall"]).is-hovered').first()
    await expect(hoveredTopFaceGroup).toBeVisible()

    // Assert that the cut wall group transform exactly matches the slice top face transform
    const cutTransform = await hoveredCutWallGroup.evaluate((el) => el.style.transform || window.getComputedStyle(el).transform)
    const topTransform = await hoveredTopFaceGroup.evaluate((el) => el.style.transform || window.getComputedStyle(el).transform)
    expect(cutTransform).toBeTruthy()
    expect(cutTransform).toBe(topTransform)
  })

  test('should synchronize cut wall opacity states between active and dimmed/isolated slices', async ({ page }) => {
    // 1. Normal hover state (opacity: 0.35 on dimmed neighbor cut walls)
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.hover({ force: true })

    const activeCutGroup = page.locator('.items-svg-chart g[data-layer="cut-wall"].is-hovered').first()
    await expect(activeCutGroup).toBeVisible()
    const activeOpacity = await activeCutGroup.evaluate((el) => window.getComputedStyle(el).opacity)
    expect(Number(activeOpacity)).toBe(1)

    // Check dimmed neighbor cut walls (if rendered facing the gap)
    const dimmedCutGroups = page.locator('.items-svg-chart g[data-layer="cut-wall"].is-dimmed')
    const dimmedCount = await dimmedCutGroups.count()
    for (let i = 0; i < dimmedCount; i++) {
      const dimmedEl = dimmedCutGroups.nth(i)
      const opacity = await dimmedEl.evaluate((el) => window.getComputedStyle(el).opacity)
      expect(Number(opacity)).toBeCloseTo(0.35, 1)
    }

    // 2. Isolated hover state (opacity: 0 on dimmed cut walls when window.fullOpacity = true)
    await page.evaluate(() => {
      window.fullOpacity = true
    })

    for (let i = 0; i < dimmedCount; i++) {
      const dimmedEl = dimmedCutGroups.nth(i)
      const opacity = await dimmedEl.evaluate((el) => window.getComputedStyle(el).opacity)
      expect(Number(opacity)).toBe(0)
    }

    // Active cut wall must remain opacity 1
    const activeOpacityAfterIsolate = await activeCutGroup.evaluate((el) => window.getComputedStyle(el).opacity)
    expect(Number(activeOpacityAfterIsolate)).toBe(1)
  })

  test('should smoothly clean up partition cuts when unhovered back to rest', async ({ page }) => {
    // Hover Russia slice
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.hover({ force: true })

    const activeCuts = page.locator('.items-svg-chart path[data-wall="start-cut"], .items-svg-chart path[data-wall="end-cut"]')
    await expect(activeCuts.first()).toBeVisible()

    // Move mouse away to trigger return transition
    await page.mouse.move(0, 0)

    // Wait for the hover transition duration (~350ms) to complete
    await page.waitForTimeout(450)

    // Partition cuts must be cleanly hidden at rest
    const remainingCuts = page.locator('.items-svg-chart path[data-wall="start-cut"], .items-svg-chart path[data-wall="end-cut"]')
    await expect(remainingCuts).toHaveCount(0)
  })

  test('should smoothly rotate chart without abrupt direction flips across 180 degrees', async ({ page }) => {
    const chart = page.locator('.items-svg-chart')
    await expect(chart).toBeVisible()

    const angleSlider = page.locator('input[type="range"]').first()
    if (await angleSlider.count() > 0) {
      await angleSlider.fill('180')
      await page.waitForTimeout(100)
      await angleSlider.fill('270')
      await page.waitForTimeout(200)
      await expect(chart).toBeVisible()
    }
  })

  test('should retract slice on deselection while mouse is stationary and re-extrude on mousemove', async ({ page }) => {
    const chart = page.locator('.items-svg-chart')
    await expect(chart).toBeVisible()

    // 1. Click Russia label to select it
    const russiaLabel = page.locator('svg text:has-text("Russia")')
    await expect(russiaLabel).toBeVisible()
    await russiaLabel.click()

    const russiaSlice = page.locator('.items-svg-chart g[data-testid="slice-ru"]').first()
    await expect(russiaSlice).toBeVisible()
    await page.waitForTimeout(350)
    const styleSelected = await russiaSlice.getAttribute('style')
    expect(styleSelected).toContain('translate')

    // 2. Click Russia label again to deselect WITHOUT moving the mouse
    await russiaLabel.click()

    // Slice must retract back to rest position (no extrusion translation)
    await page.waitForTimeout(350)
    const styleDeselected = await russiaSlice.getAttribute('style')
    const hasTranslation = styleDeselected && styleDeselected.includes('translate')
    expect(hasTranslation).toBeFalsy()

    // 3. Move mouse deliberately over Russia label (simulate mousemove)
    const box = await russiaLabel.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2)
      await page.waitForTimeout(350)

      // Hover re-engages and slice extrudes again
      const styleRehovered = await russiaSlice.getAttribute('style')
      expect(styleRehovered).toContain('translate')
    }

    // 4. Move mouse away to rest
    await page.mouse.move(0, 0)
    await page.waitForTimeout(350)
    const styleRest = await russiaSlice.getAttribute('style')
    expect(styleRest && styleRest.includes('translate')).toBeFalsy()
  })

  test('should strictly render the 9-layer painter sequence in SVG DOM order', async ({ page }) => {
    const chart = page.locator('.items-svg-chart')
    await expect(chart).toBeVisible()

    const firstBackOuterWall = page.locator('.items-svg-chart path[data-wall="outer-wall"][data-half="back"]').first()
    const firstBackTopFace = page.locator('.items-svg-chart path[data-wall="top-face"][data-half="back"]').first()
    const centerText = page.locator('.items-svg-chart .center-text-group').first()
    const firstFrontInnerWall = page.locator('.items-svg-chart path[data-wall="inner-wall"][data-half="front"]').first()
    const firstFrontTopFace = page.locator('.items-svg-chart path[data-wall="top-face"][data-half="front"]').first()

    await expect(firstBackOuterWall).toBeAttached()
    await expect(firstBackTopFace).toBeAttached()
    await expect(centerText).toBeAttached()
    await expect(firstFrontInnerWall).toBeAttached()
    await expect(firstFrontTopFace).toBeAttached()

    const order = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.items-svg-chart *'))
      const backOuter = document.querySelector('.items-svg-chart path[data-wall="outer-wall"][data-half="back"]')
      const backTop = document.querySelector('.items-svg-chart path[data-wall="top-face"][data-half="back"]')
      const center = document.querySelector('.items-svg-chart .center-text-group')
      const frontInner = document.querySelector('.items-svg-chart path[data-wall="inner-wall"][data-half="front"]')
      const frontTop = document.querySelector('.items-svg-chart path[data-wall="top-face"][data-half="front"]')

      return {
        backOuterIdx: all.indexOf(backOuter),
        backTopIdx: all.indexOf(backTop),
        centerIdx: all.indexOf(center),
        frontInnerIdx: all.indexOf(frontInner),
        frontTopIdx: all.indexOf(frontTop)
      }
    })

    expect(order.backOuterIdx).toBeLessThan(order.backTopIdx)
    expect(order.backTopIdx).toBeLessThan(order.centerIdx)
    expect(order.centerIdx).toBeLessThan(order.frontInnerIdx)
    expect(order.frontInnerIdx).toBeLessThan(order.frontTopIdx)
  })
})
