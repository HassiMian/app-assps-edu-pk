#!/usr/bin/env node
'use strict'
// Source-frozen IN-MEMORY bilingual research completion preview. Publication remains DENY.
const fs=require('node:fs'),path=require('node:path')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const parity=require('./audit-bilingual-structural-parity.cjs')
const author=require('./author-biology9-four-urdu-parity-drafts.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const MANIFEST=author.NAME+'.json'
const MANIFEST_SHA='fd4d98b7de73b77bcf2aeaf4391caeeae97e1e9c79fb04e5e27ea4b978e245f6'
const fail=x=>{throw Error('BIO9_URDU_PREVIEW_'+x)}
function loadInputs(){return{documents:collectDocuments(),
 original:author.loadInputs(),manifestBytes:fs.readFileSync(path.join(DOC,MANIFEST))}}
function attest({documents,original,manifestBytes}){
 if(!Buffer.isBuffer(manifestBytes)||author.sha(manifestBytes)!==MANIFEST_SHA)fail('PROPOSED_URDU_REVISION_CHANGED')
 const expected=author.build(original)
 let manifest
 try{manifest=JSON.parse(manifestBytes)}catch(_){fail('PROPOSAL_JSON_INVALID')}
 if(JSON.stringify(expected)!==JSON.stringify(manifest))fail('UNREVIEWED_PROPOSALS_CHANGED')
 const before=parity.audit(documents)
 if(before.totalBilingual!==54||before.structuralPass!==50||before.structuralFail!==4||
   before.independentlyReviewed!==0||before.independentlyEquivalent!==0||
   before.approved!==0||before.published!==0)
  fail('PREVIEW_ORIGINAL_BILINGUAL_RESEARCH_BASE_DRIFT')
 const orig=documents.find(x=>x.file===manifest.originalSourceFile)
 if(!orig||!Array.isArray(orig.data?.drafts)||orig.data.drafts.length!==6||
  JSON.stringify(orig.data)!==JSON.stringify(original.original))fail('MISSING_OR_CHANGED_ORIGINAL_DOCUMENT')
 const cloned=documents.map(x=>x===orig?{file:x.file,data:structuredClone(x.data)}:x)
 const target=cloned.find(x=>x.file===manifest.originalSourceFile)
 const touched=[]
 for(const proposed of manifest.rows){
  const q=target.data.drafts.find(x=>x.id===proposed.originalQuestionId)
  if(!q||q.content?.ur?.stem!==''||q.content?.ur?.answer!==''||
    author.sha(JSON.stringify(q))!==proposed.sourceOriginalQuestionRevisionSha256||
    proposed.qualifiedIndependentUrduReviewed!==false||
    proposed.englishUrduMeaningParityIndependentlyReviewed!==false||
    proposed.academicallyApproved!==false||proposed.published!==false||
    proposed.independentReviewerId!==null)
   fail('QUESTION_ID_SOURCE_OR_REVIEW_STATUS_CHANGED')
  // Isolated preview only. Original source and school database are NEVER written.
  q.content.ur={stem:proposed.unreviewedUrduStem,answer:proposed.unreviewedUrduAnswer}
  touched.push(q.id)
 }
 if(new Set(touched).size!==4)fail('BILINGUAL_PREVIEW_DUPLICATE_ID')
 const simulated=parity.audit(cloned)
 if(simulated.totalBilingual!==54||simulated.structuralPass!==54||
    simulated.structuralFail!==0||simulated.independentlyReviewed!==0||
    simulated.independentlyEquivalent!==0||simulated.approved!==0||simulated.published!==0)
  fail('PREVIEW_STRUCTURAL_PARITY_NOT_COMPLETED')
 return {schemaVersion:'assps-grade9-biology-four-urdu-candidate-preview-not-human-review-v1',
  inheritedUnmodifiedBilingualRecords:54,inheritedOriginalStructuralPass:50,
  inheritedOriginalMissingUrduStemAnswerRecords:4,
  newlyDraftedStandaloneUrduQuestions:4,structurallyCompleteOnlyInMemoryPreview:54,
  originalBilingualSourceUnchanged:true,originalUnreviewedUrduFieldsStillEmpty:4,
  grammarScientificAndTranslationParityHumanValidated:false,
  originalSourceShasMaintained:true,academicallyApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  originalQuestionIds:touched,proposedManifestSha256:MANIFEST_SHA}
}
function main(){const r=attest(loadInputs());console.log(JSON.stringify(r))}
if(require.main===module)main()
module.exports={loadInputs,attest,MANIFEST_SHA}
