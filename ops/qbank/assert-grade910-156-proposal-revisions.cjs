#!/usr/bin/env node
'use strict'
// Separate tamper-evident draft-revision pin. NOT an academic signature or approval.
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_156_PROPOSED_ANSWER_REVISION_PINS_20261009.json')
const EXPECTED_MANIFEST_SHA256='27a71ee1c79d2373b2e7c5322c831e7db2f3664a9e262b31e61e2ccd3c945784'
const hash=data=>crypto.createHash('sha256').update(data).digest('hex')
const fail=(code,detail)=>{throw Error('PROPOSAL_REVISION_'+code+(detail?':'+detail:''))}
const ANSWER_FIELDS=['proposedEnglishModelAnswer','proposedOriginalEnglishExplanatoryAnswer',
 'proposedIndependentEnglishExplanation']
const POINT_FIELDS=['proposedSeparateMarkingCriteria','proposedSeparateMarkingPoints',
 'proposedIndependentMarkingPoints','proposedDistinctMarkingPoints']
function exactlyOne(obj,fields,kind){
 const present=fields.filter(k=>Object.hasOwn(obj,k))
 if(present.length!==1)fail('UNKNOWN_OR_AMBIGUOUS_'+kind+'_SCHEMA',present.join(','))
 return obj[present[0]]
}
function buildManifest(groups){
 if(!Array.isArray(groups)||groups.length!==19)fail('SOURCE_COHORT_COUNT_DRIFT')
 const seen=new Set(),cohorts=[],revisions=[]
 for(const g of groups){
  if(typeof g.source!=='string'||typeof g.packet!=='string'||!g.payload)
   fail('COHORT_IDENTITY_ABSENT')
  const list=g.payload.items||g.payload.proposals
  if(!Array.isArray(list))fail('COHORT_RESEARCH_PACKET_INVALID',g.packet)
  const cohort={sourceFile:g.source,proposalPacket:g.packet,
   packetContentSha256:hash(JSON.stringify(g.payload)),proposals:list.length}
  cohorts.push(cohort)
  for(const item of list){
   if(typeof item.questionId!=='string'||seen.has(item.questionId))
    fail('DUPLICATE_OR_MISSING_ORIGINAL_ID',String(item.questionId))
   seen.add(item.questionId)
   const answer=exactlyOne(item,ANSWER_FIELDS,'ANSWER')
   const points=exactlyOne(item,POINT_FIELDS,'MARKING_POINTS')
   if(typeof answer!=='string'||answer.trim().length<200||
      !Array.isArray(points)||points.length!==item.marks||
      points.some(s=>typeof s!=='string'||s.trim().length<8))
    fail('DRAFT_CONTENT_INCOMPLETE',item.questionId)
   const immutableContent={originalId:item.questionId,originalSource:g.source,
    originalPacket:g.packet,marks:item.marks,language:'English',
    proposedAnswer:answer,proposedMarkingCriteria:points}
   revisions.push({questionId:item.questionId,originalSource:g.source,
    packet:g.packet,markingPoints:item.marks,
    proposedAnswerRevisionSha256:hash(JSON.stringify(immutableContent)),
    reviewStatus:'UNAPPROVED_RESEARCH_REVISION',independentQualifiedFacultyReviewed:false,
    sourceSchoolEditionPageConfirmed:false,urduEquivalenceConfirmed:false,
    published:false})
  }
 }
 if(revisions.length!==156||new Set(revisions.map(x=>x.questionId)).size!==156||
    revisions.reduce((n,x)=>n+x.markingPoints,0)!==798)
  fail('EXPECTED_CANDIDATE_SCOPE_DRIFT')
 return {schemaVersion:'assps-grade910-156-proposed-answer-immutable-revision-pins-v1',
  explanation:'Content-addressed unapproved answer text and proposed marks; neither human reviewer signoff nor textbook adoption evidence.',
  admissionDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  eligibleForAcademicPublication:0,
  distinctOriginalIdsWithDraftAnswers:revisions.length,
  proposedMarkingPoints:798,cohorts,revisions}
}
function assertFrozenProposals(groups,{manifestBytes}={}){
 let bytes,manifest
 try{bytes=manifestBytes===undefined?fs.readFileSync(MANIFEST):manifestBytes}
 catch(e){fail('MANIFEST_MISSING_OR_INVALID',e.code||e.message)}
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==EXPECTED_MANIFEST_SHA256)
  fail('FROZEN_MANIFEST_BYTE_SHA_DRIFT')
 try{manifest=JSON.parse(bytes)}catch(e){fail('MANIFEST_JSON_INVALID',e.message)}
 const current=buildManifest(groups)
 if(JSON.stringify(current)!==JSON.stringify(manifest))
  fail('ANSWER_TEXT_MARKING_REVISION_OR_PACKET_TAMPERED')
 return {pinnedManifestSha256:EXPECTED_MANIFEST_SHA256,
  unchangedProposals:current.distinctOriginalIdsWithDraftAnswers,
  protectedCriteria:current.proposedMarkingPoints,
  admissionDecision:current.admissionDecision}
}
module.exports={buildManifest,assertFrozenProposals,hash,MANIFEST}
