import test from 'node:test'
import assert from 'node:assert/strict'
import { checkUrduFontAvailability } from '../earlyYears/diagnostics/EarlyYearsFontDiagnostics.js'

function withFontSet(fonts, action) {
  const original = globalThis.document
  globalThis.document = { fonts }
  try {
    return action()
  } finally {
    if (original === undefined) delete globalThis.document
    else globalThis.document = original
  }
}

test('Jameel diagnostic refuses check(true) if no font face exists', () => {
  const report = withFontSet({ check: () => true, [Symbol.iterator]: function* () {} }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, false)
  assert.equal(report.status, 'JAMEEL_UNVERIFIED')
  assert.equal(report.fallbackVerified, false)
})

test('Jameel diagnostic refuses a declared but unloaded font', () => {
  const report = withFontSet({
    check: () => true,
    [Symbol.iterator]: function* () { yield { family: 'Jameel Noori Nastaleeq', status: 'unloaded' } }
  }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, false)
})

test('Jameel diagnostic refuses loaded face if font check does not confirm', () => {
  const report = withFontSet({
    check: () => false,
    [Symbol.iterator]: function* () { yield { family: 'Jameel Noori Nastaleeq', status: 'loaded' } }
  }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, false)
})

test('Jameel diagnostic only accepts loaded Jameel and confirmed font set', () => {
  const report = withFontSet({
    check: (_family, sample) => sample === 'اردو',
    [Symbol.iterator]: function* () { yield { family: 'Jameel Noori Nastaleeq', status: 'loaded' } }
  }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, true)
  assert.equal(report.status, 'JAMEEL_FACE_LOADED')
  assert.equal(report.physicalPrintVerified, false)
})

test('Jameel diagnostic also recognizes loaded ASSPS alias face', () => {
  const report = withFontSet({
    check: () => true,
    [Symbol.iterator]: function* () { yield { family: "'ASSPS Jameel Noori'", status: 'loaded' } }
  }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, true)
})

test('Jameel diagnostic never accepts a loaded Noto fallback as Jameel', () => {
  const report = withFontSet({
    check: () => true,
    [Symbol.iterator]: function* () { yield { family: 'Noto Nastaliq Urdu', status: 'loaded' } }
  }, checkUrduFontAvailability)
  assert.equal(report.jameelLoaded, false)
  assert.equal(report.fallbackVerified, false)
})

test('Jameel diagnostic fails closed on incomplete and throwing FontFaceSet', () => {
  const incomplete = withFontSet({ check: () => true }, checkUrduFontAvailability)
  assert.equal(incomplete.jameelLoaded, false)
  const throws = withFontSet({
    check: () => { throw Error('browser font engine unavailable') },
    [Symbol.iterator]: function* () { yield { family: 'Jameel Noori Nastaleeq', status: 'loaded' } }
  }, checkUrduFontAvailability)
  assert.equal(throws.jameelLoaded, false)
})

test('Jameel diagnostic reports unverified rather than fabricating in server environment', () => {
  const report = checkUrduFontAvailability()
  assert.equal(report.jameelLoaded, false)
  assert.equal(report.fallbackVerified, false)
})
