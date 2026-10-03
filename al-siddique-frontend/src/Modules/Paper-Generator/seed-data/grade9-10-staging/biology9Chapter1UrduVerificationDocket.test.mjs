import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url))
const load=name=>JSON.parse(readFileSync(join(here,name),'utf8'))
const docket=load('biology9Chapter1UrduVerificationDocket.json')
const queue=load('biology9Chapter1AuthoringQueue.json')
const ur=load('biology9UrduEvidenceLedger.json')
const exercise=load('biology9Chapter1ExerciseEvidenceMap.json')
const chapter=ur.chapters.find(x=>x.number===1)
const ranges=new Map(chapter.topics.map(t=>[
  t.id,[t.verifiedPhysicalStartPage,t.verifiedPhysicalEndPage]
]))

test('docket covers every evidence-gated content unit exactly once',()=>{
  assert.equal(docket.contentUnitChecks.length,33)
  assert.equal(new Set(docket.contentUnitChecks.map(x=>x.queueId)).size,33)
  assert.deepEqual(new Set(docket.contentUnitChecks.map(x=>x.queueId)),
    new Set(queue.items.map(x=>x.id)))
})
test('verified topic ranges are inherited without inventing exact Urdu pages',()=>{
  for(const item of docket.contentUnitChecks){
    assert.deepEqual(item.verifiedUrduTopicPageRange,ranges.get(item.topicId))
    assert.equal(item.exactUrduPage,null)
    assert.equal(item.exactUrduAnchor,null)
    assert.equal(item.evidenceState,'RANGE_VERIFIED_EXACT_ITEM_EVIDENCE_PENDING')
  }
})

test('all ten unresolved Exercise-A refs remain confined to verified pages 23-24',()=>{
  assert.equal(docket.exerciseSectionAChecks.length,10)
  const expected=exercise.items.filter(x=>x.section==='A')
  assert.deepEqual(new Set(docket.exerciseSectionAChecks.map(x=>x.urRef)),
    new Set(expected.map(x=>x.urRef)))
  for(const item of docket.exerciseSectionAChecks){
    assert.deepEqual(item.verifiedUrduSectionPageRange,[23,24])
    assert.equal(item.exactUrduPage,null)
  }
})

test('docket never becomes a release or authored-question payload',()=>{
  assert.equal(docket.releaseAllowed,false)
  assert.equal(docket.status,'VISUAL_VERIFICATION_REQUIRED_NO_INFERENCE')
  const raw=readFileSync(join(here,'biology9Chapter1UrduVerificationDocket.json'),'utf8')
  assert.doesNotMatch(raw,/"(?:stem|answer|options|questionText)"\s*:/)
})
