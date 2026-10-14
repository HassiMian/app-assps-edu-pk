'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {inspectReadOnly}=require('../qbank/probe-grade910-live-readiness.cjs')
function mock({signoffs=null,publications=null,guard='core_security.signed_school_allowed(integer)',errorAt=null}={}){
 const calls=[]
 return{
  calls,
  async query(q,args){
   calls.push({q,args})
   if(errorAt&&q.includes(errorAt))throw Error('QA_QUERY_FAILURE')
   if(q.includes('to_regclass'))return{rows:[{signoffs,publications,signed_guard:guard}]}
   if(q.includes('FROM users'))return{rows:[{role:'admin',total:3},{role:'teacher',total:19}]}
   if(q.includes('FROM students'))return{rows:[{students:322,exam_results:1763,question_bank:5190}]}
   if(q.includes('FROM grade910_human_signoff_evidence'))return{rows:[{total:1}]}
   if(q.includes('FROM grade910_verified_paper_publications'))return{rows:[{total:1}]}
   return{rows:[]}
  }
 }
}
test('original production with no Grade IX-X live tables is correctly HOLD, read-only SQL',async()=>{
 const c=mock()
 const result=await inspectReadOnly(c,1)
 assert.equal(result.signoffStorage,'ABSENT')
 assert.equal(result.verifiedPublicationStorage,'ABSENT')
 assert.equal(result.academicallyVerifiedProductionRelease,false)
 assert.equal(result.candidateVerifiedPublicationRows,0)
 assert.equal(result.schoolStaffRoles.admin,3)
 assert.equal(result.schoolStaffRoles.principal,undefined)
 assert.deepEqual(c.calls.map(x=>x.q).filter(x=>/^(BEGIN|COMMIT|ROLLBACK)/.test(x)),['BEGIN TRANSACTION READ ONLY','COMMIT'])
 for(const {q} of c.calls)assert.doesNotMatch(q,/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i)
})
test('one row in verified publication table cannot replace live school/teacher/rollback certification',async()=>{
 const c=mock({signoffs:'grade910_human_signoff_evidence',publications:'grade910_verified_paper_publications'})
 const result=await inspectReadOnly(c,1)
 assert.equal(result.submittedHumanClaims,1)
 assert.equal(result.candidateVerifiedPublicationRows,1)
 assert.equal(result.academicallyVerifiedProductionRelease,false)
 assert.equal(result.liveTrafficRollbackCertified,false)
})
test('missing actual signed Core predicate never grants release',async()=>{
 const c=mock({guard:null})
 const result=await inspectReadOnly(c,1)
 assert.equal(result.signedCorePredicateInstalled,false)
 assert.equal(result.academicallyVerifiedProductionRelease,false)
})
test('read-only query error rolls back and cannot mark PASS',async()=>{
 const c=mock({errorAt:'FROM users'})
 await assert.rejects(inspectReadOnly(c,1),/QA_QUERY_FAILURE/)
 assert.equal(c.calls.at(-1).q,'ROLLBACK')
})
test('invalid school ID rejected before opening transaction',async()=>{
 const c=mock()
 await assert.rejects(inspectReadOnly(c,0),/SCHOOL_ID_REQUIRED/)
 assert.equal(c.calls.length,0)
})
