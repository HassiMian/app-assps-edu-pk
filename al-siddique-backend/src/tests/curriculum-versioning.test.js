const test=require('node:test')
const assert=require('node:assert/strict')
const {
  normalizeScope,
  assertCurriculumResourceSeparation,
  cloneCurriculumProfileSpec,
  planCurriculumScopeMigration,
  assertResourceRole,
}=require('../services/curriculumVersioning')

test('stable scope identity survives display-label changes',()=>{
 const plan=planCurriculumScopeMigration({fromScopes:[{stableKey:'ch-1',scopeType:'chapter',label:'Cells'}],toScopes:[{stableKey:'ch-1',scopeType:'chapter',label:'Cell Biology'}]})
 assert.deepEqual(plan.counts,{equivalent:1,renamed_or_moved:0,removed:0,added:0})
 assert.equal(plan.requiresReview,false)
})

test('explicit aliases classify renamed or moved scopes without mutating old scope',()=>{
 const old={stableKey:'chapter-2',scopeType:'chapter',label:'Old Chapter'}
 const plan=planCurriculumScopeMigration({fromScopes:[old],toScopes:[{stableKey:'unit-b',scopeType:'topic',label:'New Unit'}],aliases:{'chapter-2':'unit-b'}})
 assert.equal(plan.entries[0].status,'renamed_or_moved')
 assert.equal(plan.entries[0].requiresReview,true)
 assert.equal(old.stableKey,'chapter-2')
})

test('migration plan exposes removed and newly added content explicitly',()=>{
 const plan=planCurriculumScopeMigration({fromScopes:[{stableKey:'old',scopeType:'skill',label:'Old'}],toScopes:[{stableKey:'new',scopeType:'learning_outcome',label:'New'}]})
 assert.equal(plan.counts.removed,1)
 assert.equal(plan.counts.added,1)
 assert.equal(plan.requiresReview,true)
})

test('curriculum profile cloning is versioned and resource-independent',()=>{
 const source={id:41,academicSessionId:5,subjectOfferingId:8,version:2,authorityType:'board',authorityName:'PECTAA',metadata:{note:'locked'}}
 const next=cloneCurriculumProfileSpec(source,{academicSessionId:6})
 assert.equal(next.version,3)
 assert.equal(next.status,'draft')
 assert.equal(next.supersedesId,41)
 assert.equal(next.academicSessionId,6)
 assert.equal(source.version,2)
 assert.equal(assertCurriculumResourceSeparation(next),true)
 assert.throws(()=>assertCurriculumResourceSeparation({...source,publisher:'Oxford'}),e=>e.code==='CURRICULUM_RESOURCE_COUPLING_FORBIDDEN')
})

test('scope taxonomy and resource-set roles fail closed',()=>{
 assert.equal(normalizeScope({stableKey:'chapter-1',scopeType:'chapter',label:'One'}).stableKey,'chapter-1')
 assert.throws(()=>normalizeScope({stableKey:'x',scopeType:'random'}),e=>e.code==='INVALID_LEARNING_SCOPE_TYPE')
 assert.equal(assertResourceRole('PRIMARY'),'primary')
 assert.throws(()=>assertResourceRole('optional'),e=>e.code==='INVALID_RESOURCE_ROLE')
})
