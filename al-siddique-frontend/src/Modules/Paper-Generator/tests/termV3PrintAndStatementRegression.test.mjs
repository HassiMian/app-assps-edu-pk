import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {buildTermOverview} from '../termPlanningModel.js'

const root=new URL('../',import.meta.url)
const style=fs.readFileSync(new URL('../TermPlannerEditor.css',import.meta.url),'utf8')
const component=fs.readFileSync(new URL('../WeeklyNotebookStudio.jsx',import.meta.url),'utf8')

test('Term defaults to full original source statements, never a generic summary',()=>{
  const candidates=[{
    candidate_key:'en-source-1',source_subject_label:'English',
    source_submissions:['synthetic-term-source'],
    source_detail_records:[{source_id:'synthetic-term-source',source_excerpt_pieces:[
      {verbatim:'October 15 to October 21\nPage 31 to 40\nUnit 7: Formation of clouds and condensation; reading exercise 3.'}
    ]}]
  }]
  const [row]=buildTermOverview(candidates,{start:'2026-10-15',end:'2026-11-15'})
  assert.ok(row.detail.includes('Formation of clouds and condensation'))
  assert.ok(row.detail.includes('reading exercise 3'))
  assert.ok(row.originalTeacherNotes.length>0)
  assert.equal(row.needsReview,true)
})

test('Term user edits persist exactly without changing original notes',()=>{
  const source=[{
    candidate_key:'one',source_subject_label:'English',
    source_submissions:['synthetic'],
    source_detail_records:[{source_id:'synthetic',source_excerpt_pieces:[
      {verbatim:'October 15 to October 21\nPage 31 to 40\nUnit 7: Formation of clouds'}
    ]}]
  }]
  const corrections='Lesson statement corrected by teacher.\nComplete chapters as per verified syllabus — not AI assumed pages.'
  const [row]=buildTermOverview(source,{start:'2026-10-15',end:'2026-11-15',edits:{one:{detail:corrections}}})
  assert.equal(row.detail,corrections)
  assert.ok(row.originalTeacherNotes.some(t=>t.includes('Unit 7')))
})

test('Term original 1st/3rd term remain unsourced rather than copied from Second Term',()=>{
  const [row]=buildTermOverview([{candidate_key:'a',source_subject_label:'Science'}],
    {start:'2026-10-15',end:'2026-11-15',term:'First Term'})
  assert.equal(row.detail,'')
  assert.ok(row.sourceStatus.includes('UNSOURCED'))
})

test('Selected Term body, header and subject font sizes are not automatically shrunk',()=>{
  assert.match(style,/\.term-print-sheet \.term-print-document\{font-size:var\(--term-text-size,12px\)/)
  assert.match(style,/\.term-print-sheet \.term-letterhead h2\{font-size:var\(--term-school-name,17px\)/)
  assert.match(style,/font-size:var\(--term-subject-name,12px\);/)
  assert.doesNotMatch(style,/font-size:clamp\([^)]*var\(--term-text-size/)
  assert.doesNotMatch(style,/--term-subject-name:10px/)
})

test('Oversized Term output uses explicit multi-A4 reflow without clipping',()=>{
  assert.match(style,/body\.term-reflow-large \.term-print-sheet/)
  assert.match(style,/overflow:visible!important/)
  assert.match(style,/break-after:page!important/)
  const print=component.slice(component.indexOf('function printTerm(){'),
    component.indexOf('return <section className="wn-studio"',component.indexOf('function printTerm(){')))
  assert.doesNotMatch(print,/if\(oversized\)\{setError/)
  assert.match(print,/const bodyClass=oversized\?/)
  assert.match(print,/teacher statements|Full source statements|Long source statements/i)
})

test('Print load listener is installed BEFORE popup document closes and printing is single-shot',()=>{
  const fn=component.slice(component.indexOf('function printTerm(){'),
    component.indexOf('return <section className="wn-studio"',component.indexOf('function printTerm(){')))
  assert.ok(fn.indexOf("popup.addEventListener('load'")>0)
  assert.ok(fn.indexOf("popup.addEventListener('load'")<fn.indexOf('popup.document.close()'))
  assert.match(fn,/getElementById\('wn-term-print'\)\|\|printRequested/)
  assert.match(fn,/await popup\.document\.fonts\.ready/)
  assert.match(fn,/img\.decode/)
})

test('Printing remains a private draft: assessment dates and source/branding safety stay fail-closed',()=>{
  const fn=component.slice(component.indexOf('function printTerm(){'),
    component.indexOf('return <section className="wn-studio"',component.indexOf('function printTerm(){')))
  assert.match(fn,/termAssessmentIssues\(termRows,termAssessments/)
  assert.match(fn,/validateTermContent\(/)
  assert.match(fn,/!branding\?\.logoUrl/)
  assert.match(fn,/img\.naturalWidth===0/)
})
