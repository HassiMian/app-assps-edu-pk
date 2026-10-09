'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const freeze=require('../qbank/attest-grade910-156-cohort-review-freeze.cjs')
const revision=require('../qbank/assert-grade910-156-proposal-revisions.cjs')
const fresh=()=>freeze.loadInputs()
const answerKey=q=>Object.keys(q).find(k=>k==='proposedEnglishModelAnswer'||
 k==='proposedOriginalEnglishExplanatoryAnswer'||k==='proposedIndependentEnglishExplanation')
const pointsKey=q=>Object.keys(q).find(k=>k==='proposedSeparateMarkingCriteria'||
 k==='proposedSeparateMarkingPoints'||k==='proposedIndependentMarkingPoints'||
 k==='proposedDistinctMarkingPoints')
test('frozen 156 revision pins are content-addressed and contain NO copyrighted answer text',()=>{
 const d=revision.buildManifest(fresh().groups)
 assert.equal(d.cohorts.length,19)
 assert.equal(d.revisions.length,156)
 assert.equal(d.proposedMarkingPoints,798)
 assert.equal(new Set(d.revisions.map(x=>x.questionId)).size,156)
 assert.ok(d.revisions.every(x=>/^[0-9a-f]{64}$/.test(x.proposedAnswerRevisionSha256)))
 assert.ok(!JSON.stringify(d).includes('The modern periodic table arranges elements'))
 assert.equal(d.eligibleForAcademicPublication,0)
 assert.equal(d.admissionDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('unaltered input passes both cross-cohort freeze and new signed-off=false revision freeze',()=>{
 const d=fresh()
 const r=revision.assertFrozenProposals(d.groups)
 const f=freeze.attest(d)
 assert.equal(r.unchangedProposals,156)
 assert.equal(r.protectedCriteria,798)
 assert.equal(f.sourceCryptographicallyMatchedOriginalIds,156)
 assert.equal(f.revisionSpecificApproved,0)
 assert.equal(f.verifiedPublished,0)
})
test('original explanatory answer text changed with identical original question and marks now FAILS CLOSED',()=>{
 const x=fresh(),q=x.groups[0].payload.items[0]
 q[answerKey(q)]+=' A newly inserted sentence unseen by the reviewer.'
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('answer edit in the 19th cohort fails too, not only in first biology cohort',()=>{
 const x=fresh(),g=x.groups[18],q=g.payload.items[g.payload.items.length-1]
 q[answerKey(q)]=q[answerKey(q)].replace('carbon','carbon atom')
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('one marking criterion wording changed but same number and marks fails closed',()=>{
 const x=fresh(),q=x.groups[2].payload.items[0],key=pointsKey(q)
 q[key][0]+=' changed after reviewer handoff'
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('swapped nonduplicate rubric points changes revision fingerprint and fails closed',()=>{
 const x=fresh(),q=x.groups[5].payload.items[0],key=pointsKey(q)
 const a=q[key][0];q[key][0]=q[key][1];q[key][1]=a
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('student answer language and subject medium metadata cannot be silently changed in packet',()=>{
 const x=fresh(),q=x.groups[10].payload.items[0];q.answerLanguage='Urdu'
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('changing record provenance note or an unrecognized metadata field also changes packet digest',()=>{
 const x=fresh(),q=x.groups[0].payload.items[0]
 q.arbitraryPostReviewMetadata='injected'
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED/)
})
test('deletion of proposed text is disallowed regardless of source original hash',()=>{
 const x=fresh(),q=x.groups[1].payload.items[0];delete q[answerKey(q)]
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_UNKNOWN_OR_AMBIGUOUS_ANSWER_SCHEMA/)
})
test('alternative answer aliases in the same record are rejected as ambiguous',()=>{
 const x=fresh(),q=x.groups[0].payload.items[0]
 q.proposedIndependentEnglishExplanation='Injected unrelated answer'
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_UNKNOWN_OR_AMBIGUOUS_ANSWER_SCHEMA/)
})
test('added marking criterion with unchanged original marks is rejected before reaching publisher',()=>{
 const x=fresh(),q=x.groups[0].payload.items[0],k=pointsKey(q);q[k].push('Unauthorized sixth mark')
 assert.throws(()=>freeze.attest(x),/PROPOSAL_REVISION_DRAFT_CONTENT_INCOMPLETE|REVIEW_FREEZE_RUBRIC_CRITERIA_DRIFT/)
})
test('altered saved manifest bytes are rejected even when source and packets are unchanged',()=>{
 const manifest=fs.readFileSync(revision.MANIFEST)
 const bad=Buffer.from(manifest);bad[bad.length-2]^=1
 assert.throws(()=>revision.assertFrozenProposals(fresh().groups,{manifestBytes:bad}),
  /PROPOSAL_REVISION_FROZEN_MANIFEST_BYTE_SHA_DRIFT/)
})
test('fake new SHA of the manifest is not accepted as a valid revision without code review',()=>{
 const manifest=fs.readFileSync(revision.MANIFEST)
 const payload=JSON.parse(manifest)
 payload.revisions[0].proposedAnswerRevisionSha256='f'.repeat(64)
 assert.throws(()=>revision.assertFrozenProposals(fresh().groups,{manifestBytes:Buffer.from(JSON.stringify(payload)+'\n')}),
  /PROPOSAL_REVISION_FROZEN_MANIFEST_BYTE_SHA_DRIFT/)
})
test('out-of-order, duplicate or missing old cohort cannot regenerate a seemingly valid manifest',()=>{
 const a=fresh().groups
 assert.throws(()=>revision.buildManifest(a.slice(1)),/PROPOSAL_REVISION_SOURCE_COHORT_COUNT_DRIFT/)
 const b=fresh().groups;b[1]=b[0]
 assert.throws(()=>revision.buildManifest(b),/PROPOSAL_REVISION_DUPLICATE_OR_MISSING_ORIGINAL_ID/)
})
test('the original non-publication status remains unchanged in existing durable freeze JSON',()=>{
 const d=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_156_CROSS_COHORT_REVIEW_FREEZE_20261009.json'))
 assert.equal(d.revisionSpecificApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.admissionDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
