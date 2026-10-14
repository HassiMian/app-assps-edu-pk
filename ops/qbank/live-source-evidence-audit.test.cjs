'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {parseClaim,normalizeOptions,auditRow,summarize,chemistryPdfHashVerified}=require('./live-source-evidence-audit.cjs')
const CHEM_HASH='05e0fcca2e1762cc8d9122546d4ff4a612f18f8f061db1a5c04f17d99315b518'
const base=()=>({
  id:'qa-0001',school_id:1,class_level:'9th',subject:'Chemistry',
  medium:'English',chapter_no:'1',question_type:'mcq',
  question_text:'Which concept represents a chemical change?',
  options:[{id:'A',text:'A chemical transformation'},{id:'B',text:'Only a shift of location'},
    {id:'C',text:'A change of container'},{id:'D',text:'Movement without reaction'}],
  correct_option:'A',source_page_no:null,
  metadata:{source:'PECTAA pectaa-catalog-007 | '+CHEM_HASH+' | page 6'},
  is_approved:false
})
test('parses strict claimed source while rejecting missing or malformed citations',()=>{
  assert.deepEqual(parseClaim(base().metadata.source),{recordId:'pectaa-catalog-007',
    sha256:CHEM_HASH,type:'page',number:6})
  assert.equal(parseClaim('PECTAA pectaa-catalog-007 | page 3'),null)
  assert.equal(parseClaim('misc user assertion'),null)
})
test('a correct source file identity never grants academic approval',()=>{
  const x=auditRow(base())
  assert.equal(x.academicApprovalGranted,false)
  assert.equal(x.officialSourceFileIdentityVerified,chemistryPdfHashVerified)
  assert.equal(x.chem9TocRangePlausible,true)
  assert.ok(x.flags.includes('SOURCE_PAGE_COLUMN_MISSING'))
  assert.ok(x.flags.includes('NO_OFFICIAL_SOURCE_PAGE_IMAGE_REVIEW'))
  assert.ok(x.flags.includes('QUESTION_NOT_ACADEMICALLY_APPROVED'))
  assert.ok(!x.flags.includes('SOURCE_ID_HASH_MISMATCH'))
})
test('wrong source hash, grade, medium and unregistered source are flagged',()=>{
  const hash={...base(),metadata:{source:'PECTAA pectaa-catalog-007 | '+'a'.repeat(64)+' | page 6'}}
  assert.ok(auditRow(hash).flags.includes('SOURCE_ID_HASH_MISMATCH'))
  const medium={...base(),medium:'Urdu'}
  assert.ok(auditRow(medium).flags.includes('SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH'))
  const grade={...base(),class_level:'10th'}
  assert.ok(auditRow(grade).flags.includes('SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH'))
  const unknown={...base(),metadata:{source:'PECTAA pectaa-catalog-999 | '+'a'.repeat(64)+' | chapter 1'}}
  assert.ok(auditRow(unknown).flags.includes('SOURCE_RECORD_UNKNOWN'))
})
test('out-of-chapter page is only rejected as a claim, never silently relocated',()=>{
  const x=auditRow({...base(),metadata:{source:'PECTAA pectaa-catalog-007 | '+CHEM_HASH+' | page 150'}})
  assert.equal(x.chem9TocRangePlausible,false)
  assert.ok(x.flags.includes('CHAPTER_PAGE_CLAIM_OUTSIDE_TOC'))
})
test('structured source page disagreement flags both representations',()=>{
  const x=auditRow({...base(),source_page_no:9})
  assert.ok(x.flags.includes('SOURCE_PAGE_NUMBER_INCONSISTENT'))
})
test('MCQ option and answer defects are reported, not fixed automatically',()=>{
  const options={...base(),options:[{id:'A',text:'one'},{id:'A',text:'repeat'}]}
  assert.ok(auditRow(options).flags.includes('MCQ_OPTIONS_MALFORMED'))
  const answer={...base(),correct_option:'Z'}
  assert.ok(auditRow(answer).flags.includes('MCQ_KEY_INVALID'))
  assert.equal(normalizeOptions({A:'one',B:'two'}).length,2)
})
test('duplicate detection never crosses schools and never deletes records',()=>{
  const seen=new Set()
  assert.ok(!auditRow(base(),{seen}).flags.includes('DUPLICATE_CANDIDATE'))
  const repeat=auditRow({...base(),id:'qa-0002'},{seen})
  assert.ok(repeat.flags.includes('DUPLICATE_CANDIDATE'))
  const other=auditRow({...base(),school_id:5,id:'qa-0003'},{seen})
  assert.ok(!other.flags.includes('DUPLICATE_CANDIDATE'))
  const result=summarize([repeat,other])
  assert.deepEqual(result.schoolCounts,{'1':1,'5':1})
})

test('missing teaching session is flagged even when a textbook identity hash matches',()=>{
  const item=auditRow(base())
  assert.ok(item.flags.includes('TEACHING_SESSION_NOT_DECLARED'))
  assert.equal(item.academicApprovalGranted,false)
  const withSession={...base(),metadata:{...base().metadata,curriculumSession:'2026-27'}}
  assert.ok(!auditRow(withSession).flags.includes('TEACHING_SESSION_NOT_DECLARED'))
})

test('answer key imbalance is review-only and preserves original correct options',()=>{
  const seen=new Set()
  const group=Array.from({length:16},(_,i)=>auditRow({
    ...base(),id:'imbalance-'+i,question_text:'Distinct review item '+i,correct_option:'A',
  },{seen}))
  const report=summarize(group)
  assert.equal(report.editorialKeyWarnings.length,1)
  assert.deepEqual(report.editorialKeyWarnings[0].mcqKeyCounts,{A:16,B:0,C:0,D:0})
  assert.equal(report.editorialKeyWarnings[0].dominantShare,1)
  assert.equal(report.editorialKeyWarnings[0].status,'EDITORIAL_REVIEW_NO_KEY_MUTATION')
  assert.equal(group.every(x=>x.correctOption==='A'&&x.academicApprovalGranted===false),true)
})
