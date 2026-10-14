'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {persistReviewBatch,listReviewGroups,readReviewSource,toRow}=require('../services/lessonComposerReviewStore')
const {prepareReviewBatch}=require('../services/lessonComposerIntake')
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
function candidate(sub='English',id='english'){
 const name='LPREVIEW-20261014-starter-'+id
 const ref='WA14-L2847'
 return {
  candidate_key:name,school_id:1,class_display:'Play',proposed_class_level:'Starter',
  source_subject_label:sub,canonical_subject_id:null,section_id:null,
  teacher_user_id:null,document_owner_id:null,canonical_term_id:null,
  reviewer_identity:null,approval_signature:null,corrected_schedule:null,
  publish_status:'BLOCKED',sent_to_portal:false,ready_for_post_api:false,
  safe_import_mode:'REVIEW_ONLY_APPEND_LINKED_SOURCES',
  review_state:'AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA',
  source_submissions:[ref],source_detail_records:[{
    source_id:ref,source_body_sha256:hash('original'),
    source_excerpt_pieces:[{source_start_line:10,source_end_line:20,verbatim:'School source text'}]
  }]
 }
}
function manifest(...candidates){
 return {schema:'assps.lesson_plan.review_import.v1',
  source_zip_sha256:hash('zip'),source_txt_sha256:hash('txt'),unassigned_evidence:['WA14-L1719'],candidates}
}
function trustedFor(manifest) {
 const checked=prepareReviewBatch(manifest,1)
 return {schoolId:1,sourceZipSha256:manifest.source_zip_sha256,
  sourceTextSha256:manifest.source_txt_sha256,
  candidateHashes:Object.fromEntries(checked.candidates.map(c=>[c.reviewKey,c.digest]))}
}
function fakeClient(){
 const data=new Map()
 return {data,sql:[],async query(sql,params){
  this.sql.push(sql)
  if(sql.startsWith('SELECT revision,payload')) {
    const value=data.get(params[1]);return {rowCount:value?1:0,rows:value?[value]:[]}
  }
  if(sql.startsWith('INSERT INTO lesson_plans')){
    const [schoolId,id,title,klass,subject,body]=params
    assert.equal(schoolId,1)
    assert.equal(klass,'Starter')
    assert.equal(subject,'English')
    const payload=JSON.parse(body)
    assert.equal(payload.actualTeacherId,null)
    assert.equal(payload.academicReview,'PENDING')
    assert.equal(payload.sentToPortal,false)
    data.set(id,{revision:1,payload,created_by:null,sent_to_portal:false})
    return {rowCount:1,rows:[{id:data.size}]}
  }
  if(sql.includes("payload->>'composerIntake'='true'")){
    if(sql.includes('WHERE school_id=$1 AND public_id=$2')){
      const row=data.get(params[1])
      return {rowCount:row?1:0,rows:row?[{public_id:params[1],revision:1,payload:row.payload}]:[]}
    }
    return {rowCount:data.size,rows:[...data].map(([id,row])=>({
      public_id:id,title:'review',class_level:'Starter',subject:'English',
      revision:1,source_digest:row.payload.sourceDigest
    }))}
  }
  throw new Error('Unexpected SQL '+sql)
 }}
}
test('source review stored without changing teacher ownership, notifications or publication',async()=>{
 const c=fakeClient()
 const m=manifest(candidate())
 const inserted=await persistReviewBatch(c,m,1,trustedFor(m))
 assert.equal(inserted.staged,1);assert.equal(inserted.publicationAllowed,false)
 assert.equal(inserted.notificationsSent,0)
 assert.equal(c.data.size,1)
 assert.equal(c.data.get(m.candidates[0].candidate_key).created_by,null)
 assert.ok(!c.sql.some(x=>/notification_log|UPDATE lesson_plans|DELETE FROM/i.test(x)))
 const repeated=await persistReviewBatch(c,m,1,trustedFor(m))
 assert.equal(repeated.staged,0)
 assert.equal(repeated.previouslyStaged,1)
 assert.equal(c.data.size,1)
 const listed=await listReviewGroups(c,1)
 assert.equal(listed.length,1)
 assert.equal(listed[0].publicationStatus,'BLOCKED')
 const details=await readReviewSource(c,1,m.candidates[0].candidate_key)
 assert.equal(details.source.sourceSubmissions[0].source_excerpt_pieces[0].verbatim,'School source text')
})
test('same candidate key with altered source aborts instead of overwriting',async()=>{
 const client=fakeClient()
 const first=manifest(candidate())
 await persistReviewBatch(client,first,1,trustedFor(first))
 const changed=manifest(candidate())
 changed.candidates[0].source_detail_records[0].source_excerpt_pieces[0].verbatim='Altered'
 await assert.rejects(()=>persistReviewBatch(client,changed,1,trustedFor(first)),e=>e.code==='TRUSTED_SOURCE_DIGEST_MISMATCH')
 assert.equal(client.data.size,1)
})
test('cross-tenant and unapproved insertion denied',async()=>{
 const client=fakeClient()
 await assert.rejects(()=>persistReviewBatch(client,manifest(candidate()),2,trustedFor(manifest(candidate()))),e=>e.code==='CROSS_TENANT_CANDIDATE')
 assert.equal(client.data.size,0)
 const bad=candidate();const original=manifest(bad);const trusted=trustedFor(original);bad.publish_status='APPROVED'
 await assert.rejects(()=>persistReviewBatch(client,manifest(bad),1,trusted),e=>e.code==='UNSAFE_PUBLICATION_STATE')
 assert.equal(client.data.size,0)
})
test('large batch rejected instead of truncating import',async()=>{
 const client=fakeClient()
 const rows=Array.from({length:13},(_,i)=>candidate('English','english'+i))
 await assert.rejects(()=>persistReviewBatch(client,manifest(...rows),1,trustedFor(manifest(...rows))),e=>e.code==='REVIEW_BATCH_MAX_TWELVE')
 assert.equal(client.data.size,0)
})
test('full original source text is retained inside school-private review record only',()=>{
 const c=toRow(candidate(),1,manifest(candidate()))
 assert.equal(c.payload.sourceSubmissions[0].source_excerpt_pieces[0].verbatim,'School source text')
 assert.equal(c.payload.collectedRole,'COMPOSER_ONLY')
 assert.equal(c.payload.textbookAdoption,'NOT_VERIFIED')
 assert.equal(c.payload.publicationStatus,'BLOCKED')
})


test('legacy creation, update, delete and share keep composer sources immutable',()=>{
 const fs=require('node:fs')
 const path=require('node:path')
 const route=fs.readFileSync(path.join(__dirname,'../routes/lessonPlanRoutes.js'),'utf8')
 assert.match(route,/COMPOSER_REVIEW_SOURCE_RESERVED/)
 assert.match(route,/COMPOSER_ACADEMIC_PUBLICATION_HOLD/)
 assert.match(route,/payload->>'composerIntake' IS DISTINCT FROM 'true'/)
 assert.match(route,/ACADEMIC_COMPOSER_REVIEW_IMPORT_ENABLED/)
 assert.match(route,/COMPOSER_IMPORT_RELEASE_HOLD/)
 const share=route.slice(route.indexOf("router.post('/:id/share'"))
 assert.ok(share.indexOf('reviewHold:true')<share.indexOf('UPDATE lesson_plans'))
})

test('untrusted source archive hash cannot be substituted during import',async()=>{
 const client=fakeClient(),m=manifest(candidate()),trust=trustedFor(m)
 m.source_zip_sha256=hash('attacker zip')
 await assert.rejects(()=>persistReviewBatch(client,m,1,trust),e=>e.code==='SOURCE_NOT_FROM_TRUSTED_EXPORT')
 assert.equal(client.data.size,0)
})
test('trusted source digest protects original verbatim content against tampering',async()=>{
 const client=fakeClient(),m=manifest(candidate()),trust=trustedFor(m)
 m.candidates[0].source_detail_records[0].source_excerpt_pieces[0].verbatim='Invented lesson'
 await assert.rejects(()=>persistReviewBatch(client,m,1,trust),e=>e.code==='TRUSTED_SOURCE_DIGEST_MISMATCH')
 assert.equal(client.data.size,0)
})
test('unregistered source key is blocked from persistence',async()=>{
 const client=fakeClient(),m=manifest(candidate()),trust=trustedFor(m)
 m.candidates[0].candidate_key='LPREVIEW-20261014-starter-unregistered'
 await assert.rejects(()=>persistReviewBatch(client,m,1,trust),e=>e.code==='UNREGISTERED_SOURCE_CANDIDATE')
 assert.equal(client.data.size,0)
})
