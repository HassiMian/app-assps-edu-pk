import test from 'node:test'
import assert from 'node:assert/strict'
import {
 normalizeSubjectTypography, changeSubjectTypography,
 SUBJECT_SIZE_MIN, SUBJECT_SIZE_MAX, SUBJECT_SIZE_DEFAULT
} from '../plannerSubjectTypography.js'

test('V3 default subject names remain bold; new default is more legible',()=>{
 assert.deepEqual(normalizeSubjectTypography({}),{
  subjectNameSize:SUBJECT_SIZE_DEFAULT,subjectNameBold:true
 })
 assert.equal(SUBJECT_SIZE_DEFAULT,14)
})
test('subject size +/- preserves unrelated print and school data settings',()=>{
 const original={subjectNameSize:14,subjectNameBold:false,rowHeight:29,cardsPerPage:3,
  schoolNameSize:17,subjectWidth:28}
 const bigger=changeSubjectTypography(original,'larger')
 assert.equal(bigger.subjectNameSize,15)
 assert.equal(bigger.subjectNameBold,false)
 assert.equal(bigger.rowHeight,29)
 assert.equal(bigger.subjectWidth,28)
 assert.equal(changeSubjectTypography(bigger,'smaller').subjectNameSize,14)
 assert.equal(original.subjectNameSize,14)
})
test('size remains bounded and invalid saves cannot create invisible subject titles',()=>{
 assert.equal(changeSubjectTypography({subjectNameSize:-20},'smaller').subjectNameSize,
              SUBJECT_SIZE_DEFAULT-1)
 assert.equal(changeSubjectTypography({subjectNameSize:9999},'larger').subjectNameSize,SUBJECT_SIZE_MAX)
 assert.equal(normalizeSubjectTypography({subjectNameSize:0}).subjectNameSize,SUBJECT_SIZE_DEFAULT)
 assert.equal(normalizeSubjectTypography({subjectNameSize:NaN}).subjectNameSize,SUBJECT_SIZE_DEFAULT)
 assert.equal(normalizeSubjectTypography({subjectNameSize:1}).subjectNameSize,SUBJECT_SIZE_MIN)
})
test('bold toggle is opt-out compatible with existing saved V3 plans',()=>{
 const older={subjectNameSize:12,layoutVersion:3}
 const notBold=changeSubjectTypography(older,'toggleBold')
 assert.equal(notBold.subjectNameBold,false)
 assert.equal(changeSubjectTypography(notBold,'toggleBold').subjectNameBold,true)
 assert.equal(notBold.layoutVersion,3)
})
test('typography controls contain unique accessible labels in both weekly and term',async()=>{
 const fs=await import('node:fs/promises')
 const path=await import('node:path')
 const cwd=path.resolve(import.meta.dirname,'..')
 const week=await fs.readFile(path.join(cwd,'WeeklyNotebookStudio.jsx'),'utf8')
 const term=await fs.readFile(path.join(cwd,'TermPlannerEditor.jsx'),'utf8')
 for(const [name,body] of [['Week and Daily',week],['Term',term]]){
  assert.match(body,/Decrease (?:planner|term) subject size/)
  assert.match(body,/Increase (?:planner|term) subject size/)
  assert.match(body,/Toggle (?:planner|term) subject bold/)
  assert.match(body,/subjectNameBold/)
  assert.match(body,/subjectNameSize/)
 }
})
