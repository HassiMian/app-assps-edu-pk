'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {build,SRC,OUT,MD}=require('../qbank/issue-grade910-ai-editorial-advisory-20261014.cjs')
test('2,581 immutable research candidates triaged without human verification spoofing',()=>{
 const docket=build()
 assert.equal(docket.originalResearchCandidates,2581)
 assert.equal(docket.flaggedForCorrectionDraft,584)
 assert.equal(docket.priorityCounts.P1,119)
 assert.equal(docket.priorityCounts.P2,465)
 assert.equal(docket.approved,0)
 assert.equal(docket.published,0)
 assert.equal(docket.verifiedQualifiedTeacherReviews,0)
 assert.equal(docket.unflaggedButStillUnverified,1997)
 assert.equal(docket.rows.length,584)
 assert.ok(docket.rows.every(r=>r.pipelineState==='AI_ASSISTED_EDITORIAL_ADVISORY_NOT_VERIFIED'))
 assert.ok(docket.rows.every(r=>!r.realQualifiedFacultyReviewed&&!r.principalApproved&&!r.paperStudioSelectable))
 assert.ok(docket.rows.every(r=>/^[a-f0-9]{64}$/.test(r.originalRevisionSha256)))
})
test('original source ids may not be duplicated, corrupted or passed through as human approvals',()=>{
 const r=JSON.parse(fs.readFileSync(SRC))
 r.rows[1].originalId=r.rows[0].originalId
 assert.throws(()=>build(Buffer.from(JSON.stringify(r))),/DUPLICATE_OR_HASH/)
 r.rows[1].originalId='QA-SYNTH-TEST'
 r.rows[0].academicApproved=true
 assert.throws(()=>build(Buffer.from(JSON.stringify(r))),/RESEARCH_CANDIDATE_MUST_NOT_CLAIM_HUMAN_APPROVAL/)
})
test('issued docket is reproducible, immutable source-bound, and has no auto-publication',()=>{
 assert.deepEqual(JSON.parse(fs.readFileSync(OUT)),build())
 const markdown=fs.readFileSync(MD,'utf8')
 assert.match(markdown,/not faculty certification/i)
 assert.match(markdown,/Original research candidates/)
 assert.match(markdown,/2027/)
 assert.doesNotMatch(markdown,/independent academic approvals completed/i)
})
test('reusing one private signature requires personal action and fresh review confirmation',()=>{
 const p=require('node:path').resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator')
 const vault=fs.readFileSync(p+'/Grade910PersonalSignatureVault.jsx','utf8')
 const form=fs.readFileSync(p+'/Grade910HumanSignoff.jsx','utf8')
 assert.match(vault,/Use for this pending claim/)
 assert.match(vault,/onUseSignature\(value\)/)
 assert.match(form,/onUseSignature=\{value=>\{setSignature\(value\);setConfirmed\(false\)\}\}/)
 assert.match(form,/academicallyApproved:false,paperStudioSelectable:false,published:false/)
})
