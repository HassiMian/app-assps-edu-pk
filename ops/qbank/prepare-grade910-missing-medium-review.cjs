#!/usr/bin/env node
'use strict'
// Research-only, frozen-original source metadata handoff. NEVER corrects originals or approves.
const fs=require('node:fs'),path=require('node:path')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const intake=require('./validate-grade910-independent-review-evidence.cjs')
const OUT=path.resolve(__dirname,'../../docs/question-bank/ASSPS_GRADE910_50_UNRESOLVED_MEDIUM_SOURCE_REVIEW_20261011.json')
function build(){
 const inputs=original.loadInputs()
 const frozen=original.assertFrozen(inputs)
 const locked=intake.indexOriginals(frozen,inputs.documents)
 const sourceFile=new Map(inputs.documents.map(d=>[d.file,d.data]))
 const missing=[]
 for(const [id,q] of locked){
  if(q.sourceMedium!=='')continue
  const doc=sourceFile.get(q.originalFile)
  const originalRow=[...(doc.drafts||[]),...(doc.items||[])].find(r=>r.id===id)
  if(!originalRow)throw Error('UNRESOLVED_MEDIUM_SOURCE_ROW_MISSING')
  const englishSource=typeof originalRow.stem==='string'||
   typeof originalRow.content?.en?.stem==='string'
  const urduTranslation=typeof originalRow.content?.ur?.stem==='string'&&
   originalRow.content.ur.stem.trim().length>0
  missing.push({
   originalQuestionId:id,
   originalQuestionRevisionSha256:q.originalQuestionRevisionSha256,
   originalSourceFile:q.originalFile,
   originalSourceFileSha256:q.sourceSha,
   sourceCatalogRecordId:originalRow.source?.catalogRecordId||doc.sourceRecordId||null,
   originalLanguageClaim:null,
   englishSourceContentPresent:englishSource,
   originalUrduTranslationDraftPresent:urduTranslation,
   originalUrduTranslationDraftMissing:q.originalFile==='biology9TopicResearchDrafts.json'&&!urduTranslation,
   languageClassificationSuggestionNotApproval:urduTranslation?'review whether dual or English-source translated draft':'review English-only source claim',
   adoptionAndEditionVerified:false,
   independentUrduEquivalenceVerified:false,
   reviewerIdentity:null,
   authenticatedAcademicApproval:false,
   published:false,
   reviewDecision:'HOLD_FOR_QUALIFIED_SOURCE_LANGUAGE_REVIEW'
  })
 }
 const byFile=Object.fromEntries([...new Set(missing.map(r=>r.originalSourceFile))].sort()
  .map(f=>[f,missing.filter(r=>r.originalSourceFile===f).length]))
 if(missing.length!==50||byFile['biology9TopicResearchDrafts.json']!==6||
    byFile['english9CompetencyOriginals2026.json']!==44||
    Object.keys(byFile).length!==2||missing.filter(r=>r.originalUrduTranslationDraftPresent).length!==2||
    missing.filter(r=>r.originalUrduTranslationDraftMissing).length!==4)
   throw Error('UNRESOLVED_MEDIUM_SOURCE_COHORT_DRIFT')
 return {schemaVersion:'assps-grade910-50-unresolved-original-medium-review-v1',
  underlyingShaFrozenOriginalCandidates:2581,
  previouslyUnfilledGrade9BiologyUrduDraftCount:4,
  unresolvedOriginalMediumCandidates:50,
  sourceFileCounts:byFile,
  academicApprovalCount:0,publisherSelectableCount:0,
  publicationDecision:'DENY',
  originalQuestionContentModified:false,
  notes:'Language suggestions are research triage, never ASSPS school adoption or independent Urdu teacher approval.',
  missingMediumOriginals:missing.sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))}
}
if(require.main===module){
 const result=build()
 if(process.argv.includes('--write')){
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
  console.log('RESEARCH_ONLY_MEDIUM_DOCKET_WRITTEN '+result.unresolvedOriginalMediumCandidates)
 }else console.log(JSON.stringify({count:result.unresolvedOriginalMediumCandidates,byFile:result.sourceFileCounts,publicationDecision:result.publicationDecision}))
}
module.exports={build,OUT}
