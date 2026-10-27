import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { improveWeeklyStatement, summarizeTermFromOriginalNotes, explicitTeacherChapterLabels } from '../sourceFaithfulPlanningCopy.js'

const dir=new URL('../',import.meta.url)
const editor=fs.readFileSync(new URL('../TermPlannerEditor.jsx',import.meta.url),'utf8')
const engine=fs.readFileSync(new URL('../lessonWeeklyEngine.js',import.meta.url),'utf8')
const ui=fs.readFileSync(new URL('../WeeklyNotebookStudio.jsx',import.meta.url),'utf8')

test('Generic classwork statement is changed slightly without syllabus invention',()=>{
 assert.equal(improveWeeklyStatement('Complete and classwork','English'),
    'Complete the assigned classwork neatly and accurately.')
 assert.equal(improveWeeklyStatement('Classwork','Urdu'),
    'متعلقہ کلاس ورک کو صاف اور درست انداز میں مکمل کریں۔')
})
test('Teacher-specified content, chapters, pages and assessment words are never truncated',()=>{
 const raw='Page 37–48 — Chapter 7: Solar and lunar eclipse; complete Exercise 7.2 and Assessment 2.'
 assert.equal(improveWeeklyStatement(raw,'Science'),raw)
 assert.ok(!engine.includes('detail.slice(0,77)'))
})
test('Unspecified chapter name is NEVER generated or relabelled as textbook chapter',()=>{
 assert.deepEqual(explicitTeacherChapterLabels(['Learn solar eclipse','Classwork','Page 37–48']),[])
 assert.deepEqual(explicitTeacherChapterLabels(['Unit 4 — Electricity','Chapter 2: Atoms','باب 3: روشنی']),
   ['Unit 4 — Electricity','Chapter 2: Atoms','باب 3: روشنی'])
 assert.ok(!engine.includes('title not supplied'))
})
test('Term summary not a copy of all weekly statements, max two concise pedagogy clauses',()=>{
 const notes=['Complete classwork','Complete classwork','Exercise 1.1','Revise weekly work','Read lesson']
 const summary=summarizeTermFromOriginalNotes(notes,'English')
 assert.ok(summary.length<160)
 assert.ok(summary.includes('classwork'))
 assert.ok(summary.includes('exercises'))
 assert.ok(!summary.includes('Exercise 1.1'))
 assert.ok(!summary.includes('Read lesson'))
})
test('No content source yields empty term summary, never a made-up unit title',()=>{
 assert.equal(summarizeTermFromOriginalNotes([], 'Science'),'')
 assert.deepEqual(explicitTeacherChapterLabels([]),[])
})
test('One A4 has exactly one student and individually separated subject tables',()=>{
 assert.match(editor,/studentPages\.map\(student=>\[student\]\)/)
 assert.match(editor,/value=\{1\} disabled/)
 assert.match(editor,/term-subject-separate-tables/)
 assert.match(editor,/rows\.map\(row=><table/)
 assert.match(editor,/term-print-subject-mini/)
})
test('Assessments in prints are source original or explicitly academically approved',()=>{
 assert.match(editor,/a\.origin==='ORIGINAL_SOURCE'\|\|a\.academicApproval===true/)
 assert.match(editor,/Date not provided/)
 assert.ok(!editor.includes('2 assessments per month'))
})
test('Overflow is a hard print blocker; no automatic multi-sheet spill for one child',()=>{
 const fn=ui.slice(ui.indexOf('function printTerm(){'),ui.indexOf('return <section className="wn-studio"',ui.indexOf('function printTerm(){')))
 assert.match(fn,/if\(oversized\)\{/)
 assert.ok(fn.indexOf('if(oversized){') < fn.indexOf("window.open("))
})
