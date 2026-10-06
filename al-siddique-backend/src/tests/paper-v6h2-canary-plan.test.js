const test=require('node:test'),assert=require('node:assert/strict')
const {buildCanonicalCanaryPlan}=require('../services/papers/paperCanonicalCanaryPlanV6H2')
const document={documentModel:'PaperDocumentNewAuthoring',format:'assps-new-authoring-paper',schemaVersion:1,title:'Canary',sections:[{id:'s1',type:'short',questions:[]}]}
const paper={id:77,revision:4,name:'Canary Paper',author:{userId:9},document}
const deps=(over={})=>({
 buildCanonicalCanaryPreflight:async()=>over.preflight||{eligible:true,source:{paperId:'77',revision:4,ownerUserId:'9',snapshotHash:'a'.repeat(64)},blockers:[]},
 getProjectedPaper:async()=>over.paper===undefined?paper:over.paper,
 reviewPortalPaperDocument:async()=>over.review||{family:'approved-curriculum-authoring',reviewStatus:'STRUCTURE_VALID_STAGING',snapshotHash:'a'.repeat(64),issues:[]},
})
test('H2 produces deterministic zero-write single-paper canary intent',async()=>{const a=await buildCanonicalCanaryPlan({schoolId:1,userId:9,role:'admin',paperId:'77',deps:deps()}),b=await buildCanonicalCanaryPlan({schoolId:1,userId:9,role:'admin',paperId:'77',deps:deps()});assert.equal(a.valid,true);assert.equal(a.intentSha256,b.intentSha256);assert.equal(a.target.sourceRevision,4);assert.equal(a.target.payloadHash.length,64);assert.equal(a.policy.writeAttempted,false);assert.equal(a.policy.persisted,false);assert.equal(a.policy.canonicalWriteChanged,false);assert.equal(a.rollback.requiresExplicitReview,true)})
test('H2 refuses planning while H0 is blocked',async()=>{await assert.rejects(()=>buildCanonicalCanaryPlan({schoolId:1,userId:9,role:'admin',paperId:'77',deps:deps({preflight:{eligible:false,source:{},blockers:['CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED']}})}),e=>e.status===409&&e.code==='CANARY_PLAN_PREFLIGHT_BLOCKED'&&e.issues.includes('CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED'))})
test('H2 rejects source drift after preflight',async()=>{await assert.rejects(()=>buildCanonicalCanaryPlan({schoolId:1,userId:9,role:'admin',paperId:'77',deps:deps({review:{family:'approved-curriculum-authoring',reviewStatus:'STRUCTURE_VALID_STAGING',snapshotHash:'b'.repeat(64),issues:[]}})}),e=>e.status===409&&e.code==='CANARY_SOURCE_CHANGED')})
test('H2 rejects invalid target discriminator',async()=>{await assert.rejects(()=>buildCanonicalCanaryPlan({schoolId:1,userId:9,role:'admin',paperId:'77',deps:deps({paper:{...paper,document:{...document,documentModel:'WrongModel'}}})}),e=>e.status===409&&e.code==='CANARY_PAYLOAD_DISCRIMINATOR_INVALID')})
