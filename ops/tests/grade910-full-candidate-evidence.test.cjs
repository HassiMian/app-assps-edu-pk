'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {examine,format}=require('../qbank/reconcile-grade910-full-candidate-evidence.cjs')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DATA=path.join(ROOT,'al-siddique-backend/src/data')
const load=n=>JSON.parse(fs.readFileSync(path.join(DATA,n)))
const registry=load('verifiedGrade910SourceRegistry.json')
const adoptions=load('asspsGrade910SchoolAdoptions.json')
const physical=load('asspsGrade910PhysicalPageEvidence.json')
const files=fs.readdirSync(INPUT).filter(n=>n.endsWith('.json')).sort().map(filename=>{
 const bytes=fs.readFileSync(path.join(INPUT,filename))
 return {filename,data:JSON.parse(bytes),fileSha256:crypto.createHash('sha256').update(bytes).digest('hex')}
})
const input={registry,adoptions,physical,documents:files}
const changed=(filename,change)=>{
 const idx=files.findIndex(x=>x.filename===filename)
 assert.ok(idx>=0)
 const v=files.slice()
 v[idx]={...v[idx],data:structuredClone(v[idx].data)}
 change(v[idx].data)
 return {...input,documents:v}
}
test('all 2,581 authored draft question IDs in 73 files reconcile without adding 58 non-question evidence rows',()=>{
 const r=examine(input)
 assert.equal(r.input.starterFiles,55)
 assert.equal(r.input.supplementalAuthoredFiles,18)
 assert.equal(r.totals.originalResearchCandidates,2581)
 assert.equal(r.totals.starterCandidateQuestions,2096)
 assert.equal(r.totals.supplementalCandidateQuestions,485)
 assert.equal(r.totals.distinctQuestionIds,2581)
 assert.deepEqual(r.input.excludedEvidenceOnlyFiles.map(x=>x.evidenceOnlyRecords),[33,25])
 assert.equal(r.totals.referencedSourceRecords,56)
 assert.equal(r.totals.humanReviewed,0)
 assert.equal(r.totals.approved,0)
 assert.equal(r.totals.publishedVerified,0)
})
test('full evidence docket counts source-edition, grade and medium ambiguity without auto adoption',()=>{
 const d=examine(input)
 assert.equal(d.totals.nonExplicitEditionDrafts,877)
 assert.equal(d.totals.draftEditionSourceDisagreements,477)
 assert.equal(d.totals.unresolvedSourceGradeDrafts,114)
 assert.equal(d.totals.unresolvedSourceMediumDrafts,408)
 assert.equal(d.input.noSchoolAdoptionCertificate,true)
 assert.equal(d.input.noPhysicalPageCertificate,true)
 assert.match(format(d),/2,581/)
 assert.match(format(d),/no book\/page certification/)
 assert.equal(d.sourceIdentityIntegrity.independentPdfByteRehashInThisReport,false)
})
test('48 Biology IX dual-language drafts expose 96 individually registry-checked declared language source claims',()=>{
 const r=examine(input)
 assert.equal(r.totals.bilingualDeclaredQuestionDrafts,48)
 assert.equal(r.totals.secondaryLanguageSourceClaimsChecked,96)
 assert.ok(r.secondaryLanguageSources.some(s=>s.source==='en:pectaa-catalog-009'&&s.questionLanguageClaims===48))
 assert.ok(r.secondaryLanguageSources.some(s=>s.source==='ur:pectaa-catalog-010'&&s.questionLanguageClaims===48))
})
test('independent language-source PDF hash mismatch fails closed instead of treating bilingual as verified',()=>{
 const inp=changed('biology9Chapter1TopicDrafts.json',d=>{
  d.drafts[0].source.languages.ur.pdfSha256='0'.repeat(64)
 })
 assert.throws(()=>examine(inp),/FULL_EVIDENCE_LANGUAGE_SOURCE_HASH_DRIFT/)
})
test('unknown bilingual source language label cannot create a free reviewer field',()=>{
 const inp=changed('biology9Chapter1TopicDrafts.json',d=>{
  d.drafts[0].source.languages.zz=d.drafts[0].source.languages.ur
 })
 assert.throws(()=>examine(inp),/FULL_EVIDENCE_UNKNOWN_LANGUAGE/)
})
test('supplemental original authored batch with a drifted PDF hash blocks the entire full-corpus docket',()=>{
 const inp=changed('mathematics10OriginalReasoningBatch2026.json',d=>{
  d.drafts[0].source.pdfSha256='0'.repeat(64)
 })
 assert.throws(()=>examine(inp),/ADOPTION_DOCKET_PDF_HASH_DRIFT/)
})
test('duplicate authored ID in supplemental vs starter file refuses merged release-readiness count',()=>{
 const id=files.find(x=>x.filename==='biology9EnglishStarter2026.json').data.drafts[0].id
 const inp=changed('mathematics10OriginalReasoningBatch2026.json',d=>{d.drafts[0].id=id})
 assert.throws(()=>examine(inp),/ADOPTION_DOCKET_DUPLICATE_QUESTION_ID/)
})
test('authoring queue with fabricated question stem cannot inflate 2,581 research count',()=>{
 const inp=changed('biology9Chapter1AuthoringQueue.json',d=>{
  d.items[0].stem='Synthetic injected question stem'
 })
 assert.throws(()=>examine(inp),/FULL_EVIDENCE_PARTIAL_AUTHORSHIP|FULL_EVIDENCE_UNSAFE_PUBLISH_FLAG/)
})
test('supplemental content with an enabled live-import flag is never treated as academic evidence',()=>{
 const inp=changed('english9CompetencyOriginals2026.json',d=>{d.liveImportAllowed=true})
 assert.throws(()=>examine(inp),/FULL_EVIDENCE_UNSAFE_PUBLISH_FLAG/)
})
test('file-input order does not change audited exact question or blocker numbers or cohort ordering',()=>{
 const a=examine(input),b=examine({...input,documents:files.slice().reverse()})
 assert.deepEqual(a.totals,b.totals)
 assert.deepEqual(a.fullCohorts.map(x=>[x.sourceRecordId,x.stagedDrafts]),b.fullCohorts.map(x=>[x.sourceRecordId,x.stagedDrafts]))
 assert.deepEqual(a.secondaryLanguageSources,b.secondaryLanguageSources)
})
test('metadata-only output omits raw copyrighted question stems and never asserts academic approval',()=>{
 const d=examine(input)
 const json=JSON.stringify(d)
 assert.equal(json.includes('By the time the assembly began'),false)
 assert.equal(json.includes('Which field examines how characteristics'),false)
 assert.equal(d.sourceIdentityIntegrity.humanQuestionApprovals,0)
 assert.ok(d.fullCohorts.every(x=>x.approvedQuestionCount===0))
})
