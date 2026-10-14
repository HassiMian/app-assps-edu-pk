import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url))
const load=name=>JSON.parse(readFileSync(join(here,name),'utf8'))
const map=load('biology9Chapter1ExerciseEvidenceMap.json')
const en=load('biology9EnglishEvidenceLedger.json')
const ur=load('biology9UrduEvidenceLedger.json')
const issues=load('biology9Chapter1SourceIssues.json')
const ch1=x=>x.chapters.find(c=>c.number===1)
const refs=x=>ch1(x).exercise.sections.flatMap(s=>s.questionSourceRefs)
const unique=x=>new Set(x).size===x.length

test('Chapter 1 map covers exactly the 25 bilingual exercise source references',()=>{
  assert.equal(map.items.length,25)
  assert.ok(unique(map.items.map(x=>x.id)))
  assert.ok(unique(map.items.map(x=>x.enRef)))
  assert.ok(unique(map.items.map(x=>x.urRef)))
  assert.deepEqual(new Set(map.items.map(x=>x.enRef)),new Set(refs(en)))
  assert.deepEqual(new Set(map.items.map(x=>x.urRef)),new Set(refs(ur)))
  assert.deepEqual(map.items.reduce((a,x)=>(a[x.section]=(a[x.section]||0)+1,a),{}),
    {A:10,B:6,C:7,D:2})
})

test('English item pages are exact visual evidence, not inferred section ranges',()=>{
  for(const x of map.items){
    if(x.section==='A'&&Number(x.id.slice(-2))<=6)assert.equal(x.enPage,22)
    else if(x.section==='A'||x.section==='B')assert.equal(x.enPage,23)
    else assert.equal(x.enPage,24)
  }
  assert.equal(map.releaseGates.all25EnglishItemPagesVerified,true)
})
test('Urdu item-page uncertainty is explicit and fail-closed',()=>{
  const a=map.items.filter(x=>x.section==='A')
  assert.equal(a.length,10)
  for(const x of a){
    assert.equal(x.urPage,null)
    assert.deepEqual(x.urPageRange,[23,24])
    assert.equal(x.urPageStatus,'ITEM_PAGE_PENDING')
  }
  for(const x of map.items.filter(x=>x.section!=='A')){
    assert.equal(x.urPage,25)
    assert.equal(x.urPageStatus,'ITEM_PAGE_VERIFIED_BY_SECTION_PAGE')
  }
  assert.equal(map.releaseGates.all25UrduExactItemPagesVerified,false)
  assert.equal(map.releaseGates.exerciseOriginAuthoringReleaseAllowed,false)
})

test('known source conflicts are carried into the exact affected exercise evidence',()=>{
  const known=new Set(issues.issues.map(x=>x.id))
  const theory=map.items.find(x=>x.id==='C01-C-04')
  const malaria=map.items.filter(x=>['C01-C-06','C01-C-07'].includes(x.id))
  assert.ok(theory.riskFlags.includes('BIO9-C1-THEORY-LAW-001'))
  assert.ok(known.has('BIO9-C1-THEORY-LAW-001'))
  for(const x of malaria)assert.ok(x.riskFlags.includes('BIO9-C1-MALARIA-CHRONOLOGY-002'))
  assert.ok(known.has('BIO9-C1-MALARIA-CHRONOLOGY-002'))
})

test('evidence map stores classification only, not copied exercise wording',()=>{
  const raw=readFileSync(join(here,'biology9Chapter1ExerciseEvidenceMap.json'),'utf8')
  assert.doesNotMatch(raw,/"(?:questionText|stem|answer)"\s*:/)
  assert.equal(map.editionEvidence.releaseApproved,false)
  assert.equal(map.editionEvidence.chapter1StructuralEquivalence,
    'CORROBORATED_NOT_FORMAL_EDITION_EQUIVALENCE')
})

test('exercise map exposes content distribution without pretending to cover every topic',()=>{
  const topics=new Set(map.items.flatMap(x=>x.topicIds))
  for(const id of ['1.1','1.2','1.3','1.5','1.6','1.7','1.8'])assert.ok(topics.has(id))
  assert.equal(topics.has('1.4'),false)
})
