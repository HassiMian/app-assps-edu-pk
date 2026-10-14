'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const {CLASSES, normalizeClass, prepareReviewBatch}=require('../services/lessonComposerIntake')
const sha = v => crypto.createHash('sha256').update(v).digest('hex')
const make = (key='starter-english',className='Starter',subject='English',source='WA14-L2847')=>({
  candidate_key:'LPREVIEW-20261014-'+key,school_id:1,class_display:className, proposed_class_level:className,
  source_subject_label:subject, canonical_subject_id:null, section_id:null,
  teacher_user_id:null,document_owner_id:null,composer:'Miss Adiba',
  source_submissions:[source],source_detail_records:[{
    source_id:source,source_body_sha256:sha(source+'|original'),
    ...(source.includes('IMG-')?{transcription:'Image requires separate visual review'}:{source_excerpt_pieces:[{
      source_start_line:100,source_end_line:101,verbatim:'Page 1 to 3 — verbatim source'
    }]}),
    source_author:'UNKNOWN'
  }], academic_session:'2026-2027 (candidate, confirm)',
  canonical_term_id:null,corrected_schedule:null,review_state:'AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA',
  reviewer_identity:null,approval_signature:null,publish_status:'BLOCKED',
  sent_to_portal:false,ready_for_post_api:false,safe_import_mode:'REVIEW_ONLY_APPEND_LINKED_SOURCES',
  blocking_reasons:['TEACHER_OWNER_UNVERIFIED']
})
const batch = (...candidates)=>({schema:'assps.lesson_plan.review_import.v1',
  source_zip_sha256:sha('verified ZIP bytes'),source_txt_sha256:sha('verified TXT bytes'),
  candidates,unassigned_evidence:['WA14-L1719']})
const clone = value=>JSON.parse(JSON.stringify(value))
function blocked(mutator,code) {
  const c=make()
  mutator(c)
  assert.throws(()=>prepareReviewBatch(batch(c),1),e=>e.code===code)
}

test('school aliases are exact and Pre-Nine never becomes Grade Nine',()=>{
  assert.equal(normalizeClass('Play'),'Starter')
  assert.equal(normalizeClass('Playgroup'),'Starter')
  assert.equal(normalizeClass('Nursery'),'Mover')
  assert.equal(normalizeClass('Prep'),'Flyer')
  assert.equal(normalizeClass('Class Seven'),'Seven')
  assert.equal(normalizeClass('pre-nine'),'Pre-Nine')
  assert.equal(normalizeClass('Grade 9'),null)
  assert.equal(CLASSES.length,12)
})
test('review-only intake preserves class and subject distinct from composer; never publishes',()=>{
  const c=make()
  const result=prepareReviewBatch(batch(c),1)
  assert.equal(result.candidateCount,1)
  assert.equal(result.published,false)
  assert.equal(result.candidates[0].composerRole,'COMPOSER_ONLY')
  assert.equal(result.candidates[0].teacherUserId,null)
  assert.equal(result.candidates[0].sentToPortal,false)
  assert.equal(result.candidates[0].readyForLegacyPost,false)
  assert.equal(result.unassignedSourceIds[0],'WA14-L1719')
  assert.equal(result.classes[0].subjects[0].subject,'English')
  assert.equal(result.candidates[0].evidence[0].hasVerbatim,true)
  assert.match(result.manifestHash,/^[a-f0-9]{64}$/)
})
test('reject school mismatch before any use',()=>blocked(c=>c.school_id=2,'CROSS_TENANT_CANDIDATE'))
test('reject attempted publication',()=>blocked(c=>c.publish_status='APPROVED','UNSAFE_PUBLICATION_STATE'))
test('reject sent portal flag',()=>blocked(c=>c.sent_to_portal=true,'UNSAFE_PUBLICATION_STATE'))
test('reject direct legacy POST attempt',()=>blocked(c=>c.ready_for_post_api=true,'UNSAFE_PUBLICATION_STATE'))
test('reject synthetic actual-teacher assignment',()=>blocked(c=>c.teacher_user_id=4191,'UNVERIFIED_ASSIGNMENT_OR_APPROVAL'))
test('reject invented academic signature',()=>blocked(c=>c.approval_signature='principal','UNVERIFIED_ASSIGNMENT_OR_APPROVAL'))
test('reject uncertain section',()=>blocked(c=>c.section_id=15,'UNVERIFIED_ASSIGNMENT_OR_APPROVAL'))
test('reject automatic corrected schedule',()=>blocked(c=>c.corrected_schedule=[{date:'2027-01-01'}],'UNVERIFIED_ASSIGNMENT_OR_APPROVAL'))
test('reject class mismatch',()=>blocked(c=>c.class_display='Seven','CLASS_MAPPING_UNVERIFIED'))
test('reject missing source text',()=>blocked(c=>c.source_detail_records[0].source_excerpt_pieces=[],'SOURCE_EXCERPT_REQUIRED'))
test('reject source switched by id',()=>blocked(c=>c.source_detail_records[0].source_id='WA14-L3052','SOURCE_PROVENANCE_MISMATCH'))
test('reject altered source body digest syntax',()=>blocked(c=>c.source_detail_records[0].source_body_sha256='invalid','SOURCE_DIGEST_INVALID'))
test('reject bogus source line bounds',()=>blocked(c=>c.source_detail_records[0].source_excerpt_pieces[0].source_end_line=99,'SOURCE_LINE_PROVENANCE_INVALID'))
test('reject duplicate candidate keys',()=>assert.throws(()=>prepareReviewBatch(batch(make(),make()),1),e=>e.code==='DUPLICATE_CANDIDATE'))
test('image source requires verifiable 64-char checksum',()=>{
  const c=make('one-math','One','Mathematics','WA14-IMG-WA0001')
  assert.equal(prepareReviewBatch(batch(c),1).candidates[0].evidence[0].hasVerbatim,false)
  delete c.source_detail_records[0].source_body_sha256
  assert.throws(()=>prepareReviewBatch(batch(c),1),e=>e.code==='IMAGE_HASH_REQUIRED')
})
test('same WhatsApp source may be cited by multiple different subjects without duplicate creation',()=>{
  const a=make('two-english','Two','English','WA14-L3000')
  const b=make('two-math','Two','Mathematics','WA14-L3000')
  const result=prepareReviewBatch(batch(a,b),1)
  assert.equal(result.candidateCount,2)
  assert.deepEqual(result.classes.map(g=>g.className),['Two'])
  assert.deepEqual(result.classes[0].subjects.map(s=>s.subject),['English','Mathematics'])
})
test('source modifications alter manifest SHA without losing original evidence',()=>{
  const a=make()
  const b=clone(a)
  b.source_detail_records[0].source_excerpt_pieces[0].verbatim+=' plus a change'
  const x=prepareReviewBatch(batch(a),1)
  const y=prepareReviewBatch(batch(b),1)
  assert.notEqual(x.manifestHash,y.manifestHash)
})
test('reject missing original export fingerprints',()=>{
  const b=batch(make())
  delete b.source_txt_sha256
  assert.throws(()=>prepareReviewBatch(b,1),e=>e.code==='ORIGINAL_EXPORT_HASH_REQUIRED')
})
test('strict school ID validation',()=>assert.throws(()=>prepareReviewBatch(batch(make()),0),e=>e.code==='TRUSTED_SCHOOL_REQUIRED'))
test('no private source content copied into review result',()=>{
  const result=JSON.stringify(prepareReviewBatch(batch(make()),1))
  assert.equal(result.includes('verbatim source'),false)
  assert.equal(result.includes('Page 1 to 3'),false)
})

