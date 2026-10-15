'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto')
const author=require('../qbank/author-grade910-66-curated-choice-revisions-20261015.cjs')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
test('66 intact original revisions and individually curated draft MCQs',()=>{
 const r=author.build()
 assert.equal(r.curatedProposalCount,66)
 assert.equal(r.newlyAuthoredWrongDistractorTexts,198)
 assert.equal(r.originalStrongCorrectOptionLengthCues,66)
 assert.equal(r.remainingStrongLengthOutliersAfterProposals,0)
 assert.deepEqual(r.proposedAnswerKeyPositionDistribution,{A:17,B:17,C:16,D:16})
 assert.deepEqual(JSON.parse(fs.readFileSync(author.OUTPUT)),r)
})
test('every draft has four unique options and the original reference answer',()=>{
 const r=author.build()
 for(const x of r.rows){
  const q=x.proposal
  assert.equal(q.options.length,4)
  assert.equal(new Set(q.options.map(o=>o.text.toLowerCase())).size,4)
  assert.equal(q.options.find(o=>o.id===q.proposedCorrectOptionId).text,x.originalReferenceAnswerText)
  assert.equal(x.originalReferenceAnswerText,x.originalOptions[0])
  assert.equal(sha(JSON.stringify(q)),x.proposalSha256)
  assert.equal(x.residualStrongLengthCue,false)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.paperStudioSelectable,false)
  assert.equal(q.published,false)
 }
})
test('198 specific alternative phrases are individually unique',()=>{
 const r=author.build()
 const others=r.rows.flatMap(x=>x.proposal.options.filter(o=>o.id!==x.proposal.proposedCorrectOptionId).map(o=>o.text.toLowerCase()))
 assert.equal(others.length,198)
 assert.equal(new Set(others).size,198)
 assert.ok(others.every(v=>v.length>=20))
 assert.equal(r.rows.filter(x=>x.correctOptionStillStrictlyLongest).length,15)
})
test('25 Urdu question proposals contain readable native Urdu text',()=>{
 const r=author.build()
 const urdu=r.rows.filter(x=>x.proposal.medium==='urdu')
 assert.equal(urdu.length,25)
 for(const x of urdu){
  const options=x.proposal.options.filter(o=>o.id!==x.proposal.proposedCorrectOptionId)
  assert.equal(options.length,3)
  assert.ok(options.every(o=>/[\u0600-\u06ff]/.test(o.text)),x.originalId)
  assert.ok(options.every(o=>!/[ØÙÛ]/.test(o.text)),x.originalId)
 }
})
test('reject missing, duplicate and incomplete editorial proposals',()=>{
 const lines=fs.readFileSync(author.CURATED,'utf8').trimEnd().split('\n')
 assert.equal(lines.length,66)
 assert.throws(()=>author.build({curatedBytes:Buffer.from(lines.slice(1).join('\n'))}),/CURATED_COUNT_NOT_66/)
 assert.throws(()=>author.build({curatedBytes:Buffer.from([...lines,lines[0]].join('\n'))}),/DUPLICATE_DRAFT_ID/)
 const cols=lines[0].split('\t');cols[1]='short'
 assert.throws(()=>author.build({curatedBytes:Buffer.from([cols.join('\t'),...lines.slice(1)].join('\n'))}),/DRAFT_TOO_BRIEF/)
})
test('AI proposal cannot impersonate authorized academic publication',()=>{
 const r=author.build()
 assert.equal(r.realQualifiedSubjectAndUrduReviewerCount,0)
 assert.equal(r.verifiedQuestionAnswerCount,0)
 assert.equal(r.academicallyApproved,0)
 assert.equal(r.published,0)
 assert.ok(r.rows.every(x=>x.status==='AI_EDITORIAL_DRAFT_NOT_FACT_CHECKED_NOT_APPROVED'))
})
test('key placements are source SHA shuffled, not a predictable A-B-C-D cycle',()=>{
 const rows=author.build().rows
 const lexicalCycleMatches=rows.filter((r,i)=>r.draftAnswerPosition==='ABCD'[i%4]).length
 assert.ok(lexicalCycleMatches<30,'Question-ID order must not expose a repeated A-D answer cycle')
 assert.ok(rows.some((r,i)=>r.draftAnswerPosition!=='ABCD'[i%4]))
 for(const r of rows)
  assert.equal(r.proposal.shiftedAnswerPositionFromOriginalA,r.draftAnswerPosition!=='A')
})
test('stable source SHA-bound shuffled placements are reproducible without random test drift',()=>{
 const rows=author.build().rows
 assert.equal(rows.length,66)
 assert.deepEqual(rows.map(x=>x.draftAnswerPosition),author.build().rows.map(x=>x.draftAnswerPosition))
 assert.ok(rows.every(x=>x.proposal.schemaVersion.endsWith('-v2')))
})
