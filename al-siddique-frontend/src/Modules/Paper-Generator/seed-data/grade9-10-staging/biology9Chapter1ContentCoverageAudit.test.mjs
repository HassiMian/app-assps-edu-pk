import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url))
const load=name=>JSON.parse(readFileSync(join(here,name),'utf8'))
const audit=load('biology9Chapter1ContentCoverageAudit.json')
const drafts=load('biology9Chapter1TopicDrafts.json')
const issues=load('biology9Chapter1SourceIssues.json')
const byTopic=id=>audit.topics.find(x=>x.topicId===id)

test('coverage audit is tied to the actual 48-draft Chapter 1 corpus',()=>{
  assert.equal(audit.currentDraftCount,drafts.drafts.length)
  assert.equal(drafts.drafts.length,48)
  assert.deepEqual(audit.topics.map(x=>x.topicId),['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8'])
  assert.equal(new Set(audit.topics.map(x=>x.topicId)).size,8)
})

test('open-gap and blocked-claim totals are derived, not hand-waved',()=>{
  const gaps=audit.topics.flatMap(x=>x.gaps||[])
  const blocked=audit.topics.flatMap(x=>x.blockedClaims||[])
  assert.equal(gaps.length,audit.summary.openGapCount)
  assert.equal(gaps.length,33)
  assert.equal(blocked.length,audit.summary.blockedClaimCount)
  assert.equal(blocked.length,1)
  assert.equal(audit.summary.formalChapterCompleteness,false)
  assert.equal(audit.summary.newQuestionPublicationAllowed,false)
})

test('known high-risk source disputes remain explicit in coverage planning',()=>{
  const known=new Set(issues.issues.map(x=>x.id))
  const flags=new Set()
  for(const t of audit.topics){
    for(const b of t.blockedClaims||[])if(b.sourceIssueId)flags.add(b.sourceIssueId)
    for(const g of t.gaps||[])for(const id of g.riskFlags||[])if(id.startsWith('BIO9-'))flags.add(id)
  }
  assert.ok(flags.has('BIO9-C1-THEORY-LAW-001'))
  assert.ok(flags.has('BIO9-C1-MALARIA-CHRONOLOGY-002'))
  for(const id of flags)assert.ok(known.has(id))
})
test('previously omitted prescribed source units remain explicit authoring gaps',()=>{
  const mustHave={
    '1.1':['biology-definition-and-scope','zoology','morphology','anatomy','physiology',
      'molecular-biology','embryology','palaeontology','taxonomy','marine-biology','pathology'],
    '1.2':['biotechnology'],
    '1.5':['medical-research-collaboration','space-exploration-collaboration'],
    '1.6':['recognition-and-definition-of-scientific-problem','experimental-group-and-control-group'],
    '1.8':['initial-malaria-observations-marsh-water-quinine',
      'outdoor-net-and-smoke-observations','ross-evidence-chain-with-nonhuman-model',
      'historical-confirmation-conclusion']
  }
  for(const [topic,concepts] of Object.entries(mustHave)){
    const actual=new Set((byTopic(topic).gaps||[]).map(x=>x.concept))
    for(const concept of concepts)assert.ok(actual.has(concept),topic+' missing '+concept)
  }
})

test('religious and historical material stays review-gated instead of being silently normalized',()=>{
  const quran=byTopic('1.4').gaps
  assert.equal(quran.length,2)
  assert.ok(quran.every(x=>x.status.includes('RELIGIOUS_EDITORIAL_REVIEW')))
  const malaria=byTopic('1.8').gaps
  assert.ok(malaria.some(x=>(x.riskFlags||[]).includes('KEEP_HISTORICAL_AND_NON_PROCEDURAL')))
  assert.equal(audit.summary.formalBilingualEditionEquivalence,false)
})

test('coverage ledger stores source-unit labels, not copied textbook questions or answers',()=>{
  const raw=readFileSync(join(here,'biology9Chapter1ContentCoverageAudit.json'),'utf8')
  assert.doesNotMatch(raw,/"(?:stem|answer|questionText|options)"\s*:/)
  assert.match(audit.policy,/Every distinct prescribed source unit/)
})
