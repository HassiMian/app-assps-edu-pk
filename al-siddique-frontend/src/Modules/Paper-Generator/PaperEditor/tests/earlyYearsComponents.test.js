// earlyYearsComponents.test.js — Verifies visual asset registry and presentation tokens
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILTIN_SKETCHES,
  getSketchAsset,
  getAllSketchAssets,
  validateSketchSvg,
  registerUserSketchAsset
} from '../earlyYears/assets/SketchAssetRegistry.js'
import { TYPOGRAPHY_TOKENS } from '../earlyYears/tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../earlyYears/tokens/layoutTokens.js'

test('EY-ASSET 1: All 21 required builtin assets are registered and valid', () => {
  const expectedAssetIds = [
    // 10 initial sketches
    'sketch.chicken.v1',
    'sketch.hand-fan.v1',
    'sketch.tomato.v1',
    'sketch.pencil.v1',
    'sketch.mango.v1',
    'sketch.grapes.v1',
    'sketch.butterfly.v1',
    'sketch.cricket-bat.v1',
    'sketch.fish.v1',
    'sketch.mouse.v1',
    // 7 addendum sketches
    'sketch.apple.v1',
    'sketch.banana.v1',
    'sketch.lion.v1',
    'sketch.flower.v1',
    'sketch.doll.v1',
    'sketch.kite.v1',
    'sketch.caterpillar.v1',
    // 4 vector shape primitives
    'shape.square.v1',
    'shape.triangle.v1',
    'shape.arrow.v1',
    'shape.circle.v1'
  ]

  assert.equal(expectedAssetIds.length, 21, 'Must test 21 assets')

  for (const assetId of expectedAssetIds) {
    const asset = getSketchAsset(assetId)
    assert.ok(asset, `Asset ${assetId} must exist in registry`)
    assert.equal(asset.id, assetId)
    assert.equal(asset.source, 'BUILTIN')
    assert.equal(asset.printSafe, true)
    assert.ok(asset.viewBox && asset.viewBox.includes('0 0'), `Asset ${assetId} must have valid viewBox`)
    assert.ok(asset.altText && asset.altText.length > 5, `Asset ${assetId} must have descriptive altText`)
    assert.ok(asset.svgContent && asset.svgContent.length > 20, `Asset ${assetId} must have non-empty SVG content`)

    // Security validation
    const sec = validateSketchSvg(asset.svgContent)
    assert.equal(sec.valid, true, `Asset ${assetId} failed security validation: ${sec.error}`)
  }
})

test('EY-ASSET 2: Security validator rejects XSS and script injections in SVG', () => {
  const badScripts = [
    '<circle cx="10" cy="10" r="5" /><script>alert("xss")</script>',
    '<rect x="0" y="0" width="10" height="10" onload="fetch(\'http://evil.com\')" />',
    '<a href="javascript:alert(1)"><circle cx="5" cy="5" r="5" /></a>',
    '<foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject>',
    '<image href="http://external.site/image.png" />'
  ]

  for (const maliciousSvg of badScripts) {
    const res = validateSketchSvg(maliciousSvg)
    assert.equal(res.valid, false, `Expected validator to reject: ${maliciousSvg}`)
    assert.ok(res.error, 'Must provide an error message')
  }

  // Clean SVG must pass
  const cleanSvg = '<circle cx="50" cy="50" r="40" stroke="#000" fill="#fff" />'
  assert.equal(validateSketchSvg(cleanSvg).valid, true)
})

test('EY-ASSET 3: User sketch upload registration accepts valid SVG and rejects unsafe payload', () => {
  const userAsset = {
    assetId: 'user.uploaded-star.v1',
    name: 'star',
    altText: 'A hand-drawn star',
    mimeType: 'image/svg+xml',
    svgContent: '<polygon points="50,5 64,35 98,38 72,62 80,95 50,78 20,95 28,62 2,38 36,35" fill="none" stroke="#000" />'
  }

  const registered = registerUserSketchAsset(userAsset)
  assert.ok(registered)
  assert.equal(registered.source, 'USER_UPLOAD')

  // Verify retrieval
  const retrieved = getSketchAsset('user.uploaded-star.v1')
  assert.equal(retrieved.name, 'star')

  // Malicious upload rejection
  assert.throws(() => {
    registerUserSketchAsset({
      assetId: 'user.bad.v1',
      mimeType: 'image/svg+xml',
      svgContent: '<svg><script>alert(1)</script></svg>'
    })
  }, /forbidden security pattern/)
})

test('EY-TOKENS: Typography tokens contain required early-years values', () => {
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.schoolName, '18pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.metadata, '12pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.englishQuestionHeading, '15pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.englishChildText, '16pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading, '21pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.urduChildText, '25pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.traceGlyph, '38pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.numberGridText, '19pt')
  assert.equal(TYPOGRAPHY_TOKENS.fontSizes.matchingText, '16pt')

  // Urdu primary font token specifies Jameel Noori Nastaleeq first
  assert.ok(TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary.includes('Jameel Noori Nastaleeq'))
  assert.ok(TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary.includes('Noto Nastaliq Urdu'))
})

test('EY-TOKENS: Layout tokens respect child spacing and dimension requirements', () => {
  assert.equal(LAYOUT_TOKENS.page.format, 'A4')
  assert.equal(LAYOUT_TOKENS.page.orientation, 'portrait')

  // Response spacing
  assert.ok(LAYOUT_TOKENS.childResponse.handwritingRowSpacingMm >= 10 && LAYOUT_TOKENS.childResponse.handwritingRowSpacingMm <= 12)
  assert.ok(LAYOUT_TOKENS.childResponse.largeAnswerLineWidthMm >= 85 && LAYOUT_TOKENS.childResponse.largeAnswerLineWidthMm <= 110)
  assert.ok(LAYOUT_TOKENS.childResponse.matchingRowHeightMm >= 14)
  assert.ok(LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm >= 12)

  // Sketch tokens
  assert.ok(LAYOUT_TOKENS.sketchSizes.smallVisual)
  assert.ok(LAYOUT_TOKENS.sketchSizes.choiceVisual)
  assert.ok(LAYOUT_TOKENS.sketchSizes.mainVisual)
  assert.ok(LAYOUT_TOKENS.sketchSizes.colouringVisual)
  assert.ok(LAYOUT_TOKENS.sketchSizes.patternVisual)
})
