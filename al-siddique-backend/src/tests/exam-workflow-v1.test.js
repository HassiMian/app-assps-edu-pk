const test = require('node:test')
const assert = require('node:assert/strict')
const official = require('../config/firstTermExam2026')

test('official First Term schedule is the same 75-paper matrix and excludes Nine', () => {
  const rows = official.officialRows()
  assert.equal(rows.length, 75)
  assert.equal(rows.some(row => row.className === 'Nine'), false)
  assert.deepEqual(
    rows.filter(row => row.examDate === '2026-09-28').map(row => `${row.className}|${row.subject}`).sort(),
    ['Starter|English Written','Mover|English Written','Flyer|English Written','One|English','Three|English','Five|English','Seven|English'].sort()
  )
  assert.equal(rows.find(row => row.className === 'Eight' && row.examDate === '2026-10-07')?.subject, 'Computer')
  assert.equal(rows.find(row => row.className === 'One' && row.examDate === '2026-10-09')?.subject, 'Quran / Nazra')
})

test('class aliases resolve actual school labels including legacy Starter row', () => {
  assert.equal(official.normalizeClassName('Class 1'), 'One')
  assert.equal(official.normalizeClassName('1'), 'One')
  assert.equal(official.normalizeClassName('One'), 'One')
  assert.equal(official.normalizeClassName('سٹاٹر'), 'Starter')
  assert.ok(official.aliasesForClass('Starter').includes('سٹاٹر'))
})

test('scheduled subjects are class-specific and retain oral/written distinction', () => {
  assert.deepEqual(official.subjectsForClass('Starter').map(row => row.subject), [
    'English Written','Mathematics Written','Urdu Written','English Oral','Mathematics Oral','Urdu Oral','General Knowledge Oral'
  ])
  assert.deepEqual(official.subjectsForClass('Two').map(row => row.subject), [
    'English','Mathematics','Urdu','Science','Islamiyat','Quran / Nazra'
  ])
})

test('enrollment sync preserves the exam snapshot when a student later changes section', () => {
  const merged = official.mergeEnrollmentSnapshot(
    [
      { class_name: 'One', section: 'Blue' },
      { class_name: 'One', section: 'Yellow' },
      { class_name: 'Nine', section: 'Fatima' },
    ],
    [
      { class: 'One', section: 'Yellow' },
      { class: 'Two', section: 'Orange' },
    ]
  )

  assert.deepEqual(
    merged.map(row => `${row.className}|${row.section}`).sort(),
    ['One|Blue', 'One|Yellow', 'Two|Orange'].sort()
  )
})
