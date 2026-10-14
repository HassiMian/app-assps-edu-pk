'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {appendCorrection,validateChange}=require('../services/lessonComposerCorrection')
const {toRow}=require('../services/lessonComposerReviewStore')
const crypto=require('node:crypto')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const SOURCE='WA14-L2847',ID='LPREVIEW-20261014-starter-english'
const original={
 composerIntake:true,sourceDigest:sha('original'),
 sourceIds:[SOURCE],collectedRole:'COMPOSER_ONLY',sourceSubmissions:[{source_id:SOURCE,source_excerpt_pieces:[{verbatim:'Original unchangeable text'}]}],
 corrections:[],actualTeacherId:null,sentToPortal:false
}
const input={sourceId:SOURCE,changeType:'DATE_PROPOSAL',proposedText:'Proposed 2027-01-05',
 rationale:'The source date is inconsistent with the school academic calendar'}
function client(){
 const fixture={revision:1,payload:JSON.parse(JSON.stringify(original)),sent_to_portal:false,created_by:null}
 return {fixture,queries:[],async query(sql,params){
  this.queries.push(sql)
  if(sql.startsWith('SELECT revision,payload'))return {rowCount:1,rows:[this.fixture]}
  if(sql.startsWith('UPDATE lesson_plans')){
   this.fixture.payload.corrections=JSON.parse(params[0])
   this.fixture.revision++
   return {rowCount:1,rows:[{revision:this.fixture.revision}]}
  }
  throw Error('Unknown query')
 }}
}
const call=(c,changes={})=>appendCorrection(c,{schoolId:1,id:ID,revision:1,actorId:42,input,...changes})
test('source is immutable and proposed correction appended with integrity hash',async()=>{
 const c=client(),sourceCopy=JSON.stringify(c.fixture.payload.sourceSubmissions)
 const r=await call(c)
 assert.equal(r.revision,2)
 assert.equal(r.correctionCount,1)
 assert.equal(r.academicApproval,false)
 assert.equal(r.published,false)
 assert.match(r.correctionHash,/^[a-f0-9]{64}$/)
 assert.equal(c.fixture.payload.corrections[0].reviewerUserId,42)
 assert.equal(c.fixture.payload.corrections[0].decision,'PROPOSED_NOT_APPROVED')
 assert.equal(JSON.stringify(c.fixture.payload.sourceSubmissions),sourceCopy)
 assert.equal(c.fixture.payload.actualTeacherId,null)
 assert.ok(!c.queries.some(q=>/DELETE|notification_log|sent_to_portal=true/i.test(q)))
})
test('reject forged teacher authority and publication intent',()=>{
 assert.throws(()=>validateChange({...input,teacherUserId:4191}),e=>e.code==='CORRECTION_CANNOT_GRANT_AUTHORITY')
 assert.throws(()=>validateChange({...input,approve:true}),e=>e.code==='CORRECTION_CANNOT_GRANT_AUTHORITY')
 assert.throws(()=>validateChange({...input,publish:true}),e=>e.code==='CORRECTION_CANNOT_GRANT_AUTHORITY')
})
test('reject unidentified external text and unsupported type',()=>{
 assert.throws(()=>validateChange({...input,sourceId:'WA14-L99999BAD'}),e=>e.code==='CORRECTION_SOURCE_REQUIRED')
 assert.throws(()=>validateChange({...input,changeType:'APPROVE_ALL'}),e=>e.code==='CORRECTION_TYPE_INVALID')
})
test('reject unknown evidence references',async()=>{
 const c=client()
 await assert.rejects(()=>call(c,{input:{...input,sourceId:'WA14-L2000'}}),e=>e.code==='CORRECTION_SOURCE_NOT_IN_DOCUMENT')
 assert.equal(c.fixture.revision,1)
})
test('reject stale revisions',async()=>{
 const c=client()
 await assert.rejects(()=>call(c,{revision:2}),e=>e.code==='CORRECTION_REVISION_CONFLICT')
 assert.equal(c.fixture.revision,1)
})
test('reject wrong tenant or forged author scope',async()=>{
 await assert.rejects(()=>call(client(),{schoolId:0}),e=>e.code==='CORRECTION_AUTHENTICATED_SCOPE_REQUIRED')
 await assert.rejects(()=>call(client(),{actorId:0}),e=>e.code==='CORRECTION_AUTHENTICATED_SCOPE_REQUIRED')
})
test('reject non-import or published record',async()=>{
 const c=client();c.fixture.payload.composerIntake=false
 await assert.rejects(()=>call(c),e=>e.code==='CORRECTION_SOURCE_INTEGRITY_FAIL')
 const x=client();x.fixture.sent_to_portal=true
 await assert.rejects(()=>call(x),e=>e.code==='CORRECTION_SOURCE_INTEGRITY_FAIL')
})
test('correction chain has source anchor and refuses broken hash',async()=>{
 const c=client();c.fixture.payload.sourceDigest='unsafe'
 await assert.rejects(()=>call(c),e=>e.code==='CORRECTION_CHAIN_BROKEN')
 const x=client();x.fixture.payload.corrections=[{integrityHash:'unsafe'}]
 await assert.rejects(()=>call(x),e=>e.code==='CORRECTION_CHAIN_BROKEN')
})
test('limit revisions to 50, zero silent truncation',async()=>{
 const c=client();c.fixture.payload.corrections=Array.from({length:50},()=>({integrityHash:sha('x')}))
 await assert.rejects(()=>call(c),e=>e.code==='CORRECTION_REGISTER_FULL')
})
test('all proposed strings bounded and reason evidence required',()=>{
 assert.throws(()=>validateChange({...input,rationale:'too short'}),e=>e.code==='CORRECTION_EVIDENCE_REQUIRED')
 assert.throws(()=>validateChange({...input,proposedText:'x'.repeat(2001)}),e=>e.code==='CORRECTION_EVIDENCE_REQUIRED')
})
