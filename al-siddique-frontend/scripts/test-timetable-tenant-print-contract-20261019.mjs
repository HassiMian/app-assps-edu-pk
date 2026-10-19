import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const src=readFileSync(new URL('../src/Modules/timetable/TimetableModule.jsx',import.meta.url),'utf8')
test('timetable print never hardcodes ASSPS identity across tenants',()=>{
  for(const marker of ['Sharif Chowk','Al Siddique Scholars Public School','AL SIDDIQUE SCHOLARS PUBLIC SCHOOL','الصدّیق سکالرز پبلک سکول'])
    assert.equal(src.includes(marker),false,marker)
  assert.ok(src.includes("school?.schoolName || 'School'"))
  assert.ok(src.includes("school?.address || ''"))
  assert.ok(src.includes('escapeHtml(schoolAddress)'))
})
test('timetable printable content escapes user-provided schedule text',()=>{
  for(const expression of ['escapeHtml(day)','escapeHtml(item.subject','escapeHtml(item.teacher','escapeHtml(title)','escapeHtml(schoolName)','escapeHtml(academicSession)'])
    assert.ok(src.includes(expression),expression)
  assert.ok(src.includes(".replaceAll('&', '&amp;')"))
  assert.ok(!src.includes(".replaceAll('&', '&')"))
})
test('school selection uses a valid derived section, and load errors are visible',()=>{
  assert.ok(src.includes('const resolvedSection = sectionOptions.includes(section)'))
  assert.ok(src.includes('section: resolvedSection'))
  assert.ok(src.includes('value={resolvedSection}'))
  assert.ok(src.includes('role="alert"'))
  assert.ok(!src.includes('setState('))
})
