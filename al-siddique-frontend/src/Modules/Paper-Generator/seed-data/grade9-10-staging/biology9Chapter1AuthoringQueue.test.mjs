import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url))
const read=name=>readFileSync(join(here,name),'utf8')
const queue=JSON.parse(read('biology9Chapter1AuthoringQueue.json'))
const auditRaw=read('biology9Chapter1ContentCoverageAudit.json')
const audit=JSON.parse(auditRaw)
const key=x=>x.topicId+'::'+x.concept

test('authoring queue is a one-to-one projection of all 33 audited gaps',()=>{
  const gaps=audit.topics.flatMap(t=>(t.gaps||[]).map(g=>({topicId:t.topicId,concept:g.concept})))
  assert.equal(queue.items.length,33)
  assert.equal(queue.sourceAuditGapCount,33)
  assert.deepEqual(new Set(queue.items.map(key)),new Set(gaps.map(key)))
  assert.equal(new Set(queue.items.map(x=>x.id)).size,33)
})

test('queue is cryptographically pinned to the exact coverage audit bytes',()=>{
  const digest=createHash('sha256').update(auditRaw,'utf8').digest('hex')
  assert.equal(queue.sourceAuditSha256,digest)
})
test('every queued gap remains blocked until exact Urdu evidence exists',()=>{
  for(const item of queue.items){
    assert.equal(item.safeToAuthorNow,false)
    assert.equal(item.publicationAllowed,false)
    assert.ok(item.requiredBeforeAuthoring.includes('exactUrduSourcePages'))
    assert.ok(item.requiredBeforeAuthoring.includes('urduAnchor'))
    assert.ok(item.requiredBeforeAuthoring.includes('sourceConceptEquivalence'))
    assert.ok(item.requiredBeforeRelease.includes('formalBilingualEditionEquivalence'))
  }
  assert.equal(queue.status,'EVIDENCE_GATED_NOT_READY_FOR_AUTHORING')
})

test('religious source units require their additional editorial gate',()=>{
  const sensitive=queue.items.filter(x=>x.topicId==='1.4')
  assert.equal(sensitive.length,2)
  for(const item of sensitive){
    assert.equal(item.queueState,'BLOCKED_PENDING_URDU_AND_RELIGIOUS_EDITORIAL_REVIEW')
    assert.ok(item.requiredBeforeAuthoring.includes('religiousEditorialReview'))
  }
})

test('source-risk flags survive queue projection',()=>{
  const flagged=queue.items.filter(x=>x.riskFlags.length)
  assert.ok(flagged.some(x=>x.riskFlags.includes('BIO9-C1-MALARIA-CHRONOLOGY-002')))
  assert.ok(flagged.some(x=>x.riskFlags.includes('KEEP_HISTORICAL_AND_NON_PROCEDURAL')))
})

test('queue contains no authored question or answer payload',()=>{
  const raw=read('biology9Chapter1AuthoringQueue.json')
  assert.doesNotMatch(raw,/"(?:stem|answer|questionText|options|correctOptionId)"\s*:/)
})
