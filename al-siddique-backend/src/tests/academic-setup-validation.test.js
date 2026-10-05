const test = require('node:test')
const assert = require('node:assert/strict')
const { validateAcademicSetup } = require('../services/academicSetupService')

test('accepts a canonical academic setup and normalizes duplicate sections', () => {
  const result = validateAcademicSetup({
    localities: ['Rayya Khas'],
    classes: [{ level: 'starter', name: 'Starter', sections: ['Blue', 'Blue'] }],
    subjects: [{ id: 'eng', name: 'English', classes: ['starter'] }],
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.value.classes[0].sections, ['Blue'])
})

test('rejects duplicate class names even when case differs', () => {
  const result = validateAcademicSetup({
    classes: [
      { level: 'starter', name: 'Starter', sections: ['Blue'] },
      { level: 'starter-2', name: 'starter', sections: ['Red'] },
    ],
  })
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /Duplicate class name/i)
})

test('keeps Urdu and English labels distinct unless explicitly modeled as aliases', () => {
  const result = validateAcademicSetup({
    classes: [
      { level: 'starter', name: 'Starter', sections: ['Blue'] },
      { level: 'urdu-starter', name: 'سٹاٹر', sections: ['Blue'] },
    ],
  })
  assert.equal(result.ok, true)
  assert.equal(result.value.classes.length, 2)
})
