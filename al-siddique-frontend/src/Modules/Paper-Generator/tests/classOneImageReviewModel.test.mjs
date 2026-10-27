import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewClassOneImageWeeks} from '../classOneImageReviewModel.js'
const candidates=['English-A','Urdu-A','Mathematics','Islamiyat'].map(source_subject_label=>({
  class_display:'One',source_subject_label}))
const base={source_image_sha256:'test-image',transcript_sha256:'test-transcript',
 review_state:'VISUAL_TRANSCRIPTION_REQUIRES_INDEPENDENT_ACADEMIC_CONFIRMATION',
 weeks:[
  {week:1,start:'2026-10-15',end:'2026-10-21',work:{'English-A':'Pg 36–38','Mathematics':'Pg 57–58','Islamiyat':'S1 Masjid'}},
  {week:2,start:'2026-10-22',end:'2026-10-28',work:{'English-A':'Pg 39–41','Mathematics':'Pg 59–60','Urdu-A':'Pg 28–29'}}
 ]}
test('Image transcription is always provisional, never auto-approved',()=>{
 const r=reviewClassOneImageWeeks(base,candidates)
 assert.equal(r.status,'REVIEW_ONLY')
 assert.equal(r.academicApproval,false)
 assert.equal(r.originalEvidence.originalWeeks,2)
 assert.equal(r.originalEvidence.imageSha256,'test-image')
})
test('Only teacher-stated Pg 36–38 gives 36–38; title S1 Masjid never invents pages',()=>{
 const r=reviewClassOneImageWeeks(base,candidates)
 assert.deepEqual([r.bySubject['English-A'][0].pageFrom,r.bySubject['English-A'][0].pageTo],['36','38'])
 assert.equal(r.bySubject.Islamiyat[0].verbatim,'S1 Masjid')
 assert.equal(r.bySubject.Islamiyat[0].pageFrom,'')
 assert.equal(r.bySubject.Islamiyat[0].pageTo,'')
})
test('Does not fabricate omitted subject work or silently assign all-subject exam text',()=>{
 const r=reviewClassOneImageWeeks({...base,weeks:[{...base.weeks[0],
   work:{...base.weeks[0].work,all:'FINAL EXAM PREPARATION'}}]},candidates)
 assert.equal(r.bySubject['Urdu-A'].length,0)
 assert.equal(r.weeks[0].allSourceStatus,'FINAL EXAM PREPARATION')
 assert.equal(r.bySubject['English-A'][0].verbatim,'Pg 36–38')
})
test('Bad dates, repeated weeks, unknown subject are hard review blockers',()=>{
 const invalids=[
  {...base,weeks:[base.weeks[0],{...base.weeks[1],week:1}]},
  {...base,weeks:[base.weeks[0],{...base.weeks[1],start:'2026-10-20'}]},
  {...base,weeks:[{...base.weeks[0],work:{'Biology':'Pg 2–3'}}]},
 ]
 for(const bad of invalids)assert.equal(reviewClassOneImageWeeks(bad,candidates).status,'HOLD')
})
test('Ignores source-less image imports',()=>{
 assert.equal(reviewClassOneImageWeeks(null,candidates).status,'HOLD')
 assert.equal(reviewClassOneImageWeeks({...base,source_image_sha256:null},candidates).status,'HOLD')
})
