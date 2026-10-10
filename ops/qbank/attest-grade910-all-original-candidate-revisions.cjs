#!/usr/bin/env node
'use strict'
// Read-only preservation of ALL original authored candidate question revisions.
// Cryptographic source identity DOES NOT imply source adoption or academic correctness.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const prior=require('./attest-grade910-all-mcq-source-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_ALL_2581_CANDIDATE_SOURCE_REVISIONS_20261010'
const FROZEN_SHA='7be7cb31744ecc2705d3cd5213d81480ce45e601d246626fffa9780ce5fa611d'
const SHA=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const fail=x=>{throw Error('FULL2581_'+x)}
const missing=Object.freeze({
 'urdu9LiteratureStarter2026.json':'3fcdb266dcbe2e6e9f9e564d98bfaaa3238ba3d14c8acdb0d74235c21ca9e537',
 'urdu10LiteratureStarter2026.json':'7dc183c6bb84f8cf37d44b60210f4a30718290c7d20417a57d64ca957f4792c4'
})
function loadInputs(){return{documents:collectDocuments(),rawOverrides:{}}}
function stem(q){return String(q?.question_text||q?.questionText||q?.stem||q?.content?.en?.stem||q?.content?.ur?.stem||'').trim()}
function build({documents,rawOverrides={}}){
 const inherited=prior.assertFrozen({documents})
 if(inherited.countOfDistinctOriginalMcqResearchCandidates!==875||
  inherited.originalMcqSourceFiles!==71||inherited.academicallyApproved!==0||
  inherited.verifiedPublished!==0||inherited.publicationDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  fail('INHERITED_875_ORIGINAL_MCQ_SOURCE_RELEASE_DRIFT')
 if(!Array.isArray(documents)||new Set(documents.map(x=>x.file)).size!==documents.length)
  fail('ORIGINAL_DOCUMENT_SET_INVALID_OR_DUPLICATE')
 const securedMCQ=new Map(inherited.originalQuestionFiles.map(x=>[x.sourceFile,x.originalRawFileSha256]))
 const files=[],ids=new Set(),kinds={},seen=new Set()
 for(const entry of documents){
  if(!entry.data)continue
  const rows=[...(entry.data?.drafts||[]),...(entry.data?.items||[])]
  if(!rows.length)continue
  const original=rows.filter(q=>q?.id&&stem(q))
  if(!original.length)continue
  if(original.length!==rows.length)fail('INCOMPLETE_ORIGINAL_AUTHORING_FILE:'+entry.file)
  if(!entry.file.endsWith('.json')||entry.file.includes('/')||entry.file.includes('\\')||
    seen.has(entry.file))fail('DUPLICATE_OR_UNTRUSTED_SOURCE_FILE')
  seen.add(entry.file)
  if(entry.data.publicationAllowed!==false||entry.data.liveImportAllowed!==false)
    fail('ORIGINAL_CANDIDATES_INCORRECTLY_PUBLICATION_ENABLED')
  const filename=path.join(SRC,entry.file)
  if(!fs.existsSync(filename))fail('ORIGINAL_CANDIDATE_FILE_MISSING')
  const raw=Object.hasOwn(rawOverrides,entry.file)?rawOverrides[entry.file]:fs.readFileSync(filename)
  if(!Buffer.isBuffer(raw))fail('ORIGINAL_SOURCE_BYTES_INVALID')
  let physical
  try{physical=JSON.parse(raw)}catch(_){fail('ORIGINAL_SOURCE_JSON_INVALID:'+entry.file)}
  if(JSON.stringify(physical)!==JSON.stringify(entry.data))
    fail('ORIGINAL_SOURCE_OR_IN_MEMORY_REVISION_DRIFT:'+entry.file)
  const rawHash=SHA(raw),inheritedHash=securedMCQ.get(entry.file)
  if(inheritedHash&&rawHash!==inheritedHash)
    fail('INHERITED_MCQ_FILE_FINGERPRINT_DRIFT:'+entry.file)
  if(!inheritedHash&&rawHash!==missing[entry.file])
    fail('PREVIOUSLY_UNSEALED_ORIGINAL_SOURCE_HASH_DRIFT:'+entry.file)
  const revisions=original.map(q=>{
    if(typeof q.id!=='string'||ids.has(q.id))
      fail('ORIGINAL_QUESTION_ID_MISSING_OR_DUPLICATE')
    ids.add(q.id)
    kinds[q.type]=(kinds[q.type]||0)+1
    return{originalQuestionId:q.id,originalQuestionRevisionSha256:SHA(JSON.stringify(q)),
     originalQuestionType:q.type,marks:q.marks??null,
     originalReviewStatus:q.review?.status??null,
     independentAcademicQuestionReviewVerified:false,
     originalEditionExercisePageSchoolAdoptionVerified:false,
     academicallyApproved:false,published:false}
  })
  files.push({originalAuthoredFile:entry.file,originalFileSha256:rawHash,
   originalQuestionCount:revisions.length,inherited875McqFileFreeze:Boolean(inheritedHash),
   originalQuestionRevisions:revisions})
 }
 const originals=files.reduce((n,f)=>n+f.originalQuestionCount,0)
 const mcqFiles=files.filter(f=>f.inherited875McqFileFreeze)
 const other=files.filter(f=>!f.inherited875McqFileFreeze)
 if(originals!==2581||ids.size!==2581||files.length!==73||
    mcqFiles.length!==71||other.length!==2||other.reduce((n,f)=>n+f.originalQuestionCount,0)!==117||
    kinds.mcq!==875||kinds.short!==908||kinds.long!==564||kinds.numerical!==91||
    new Set(other.map(f=>f.originalAuthoredFile)).size!==2||
    other.some(f=>!Object.hasOwn(missing,f.originalAuthoredFile)))
  fail('ORIGINAL_AUTHORING_COHORT_OR_TOTALS_DRIFT')
 return{schemaVersion:'assps-grade910-original-2581-source-revision-frozen-v1',
  originalAuthoredQuestionCandidates:2581,distinctOriginalIds:2581,
  originalAuthoredFiles:73,filesPreviouslyMcqSourceFrozen:71,
  newlyFrozenUrduLiteratureFiles:2,newlyFrozenUrduLiteratureQuestionRevisions:117,
  originalQuestionTypeCounts:kinds,sourceByteIntegrity:true,
  independentAdoptedTextbookAndPrintedPageCertification:false,
  qualifiedIndependentReviewerSignatures:0,
  academicallyApproved:0,verifiedPublished:0,
  productionImportApproved:false,
  releaseDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  files}
}
function assertFrozen(input,overrideBytes){
 let bytes
 try{bytes=overrideBytes??fs.readFileSync(path.join(DOC,NAME+'.json'))}
 catch(_){fail('FROZEN_MANIFEST_MISSING')}
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==FROZEN_SHA)fail('FROZEN_MANIFEST_RAW_SHA_DRIFT')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){fail('FROZEN_MANIFEST_JSON_INVALID')}
 const current=build(input)
 if(JSON.stringify(saved)!==JSON.stringify(current))fail('FROZEN_ORIGINAL_Q_SOURCE_REVISION_DRIFT')
 return current
}
function markdown(d){
 return ['# ASSPS Grade IX-X — All 2,581 original research question revisions protected','',
 '**Candidate-data preservation only; NOT actual textbook adoption, scientific answer verification, faculty approval or publication.**','',
 'Existing 71 source-file MCQ manifest remains mandatory. Added raw source+individual question SHA256 pins for the last **2 Urdu Literature sources with 117 short/long questions**.',
 'Combined **73 authored source files**, **2,581 distinct original question IDs**, no old source edits or new approved question rows.','',
 '| Original source file | Raw source SHA256 | Original question IDs | Previously MCQ-frozen |',
 '|---|---|---:|---|',
 ...d.files.map(f=>'| '+f.originalAuthoredFile+' | '+f.originalFileSha256+' | '+f.originalQuestionCount+' | '+(f.inherited875McqFileFreeze?'YES':'NEW')+' |'),
 '','All original question texts and answer keys are unchanged. Source hashes establish revision identity, NOT academic correctness.',
 'Original 43 historical papers are not future content dependencies; preserve Paper Workspace functional structure, hierarchy, scoring, Urdu/English font and print parity.',
 '**Human academic approval: 0. Academic release: '+d.releaseDecision+'.** SaaS Core solely controls production.',''
 ].join('\n')
}
function main(){
 const x=build(loadInputs()),file=path.join(DOC,NAME)
 fs.writeFileSync(file+'.json',JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(file+'.md',markdown(x))
 console.log(JSON.stringify({originalQuestions:x.originalAuthoredQuestionCandidates,
  files:x.originalAuthoredFiles,previouslyOutsideMcqFreeze:x.newlyFrozenUrduLiteratureQuestionRevisions,
  sha256:SHA(fs.readFileSync(file+'.json')),approved:x.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertFrozen,markdown,SHA,NAME}
