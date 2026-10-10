import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWizardInkColor, resolveWizardBodyWeight } from '../layouts/paperWizardTypography.js'

test('paper wizard controls apply correct print colors and font weight', () => {
  assert.equal(resolveWizardInkColor('Black'), '#000000')
  assert.equal(resolveWizardInkColor('Blue'), '#0000ff')
  assert.equal(resolveWizardInkColor('Dark Blue'), '#0b2a4a')
  assert.equal(resolveWizardBodyWeight('Bold'), '700')
  assert.equal(resolveWizardBodyWeight('Normal'), '400')
})

test('unrecognized and unsafe color/weight values fail closed to default print styles', () => {
  assert.equal(resolveWizardInkColor('red; background:url(evil)'), '#000000')
  assert.equal(resolveWizardInkColor(undefined), '#000000')
  assert.equal(resolveWizardBodyWeight('700;transform:scale(0)'), '400')
  assert.equal(resolveWizardBodyWeight(undefined), '400')
})
