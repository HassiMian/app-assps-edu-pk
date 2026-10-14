'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const PACKET=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_20261008.json')
const DOCKET=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_DOCKET_20261008.json')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology9TopicResearchDrafts.json')
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
function verifyPacket({sourceBytes,packetBytes,docketBytes}){
 const source=JSON.parse(sourceBytes),packet=JSON.parse(packetBytes),docket=JSON.parse(docketBytes)
 if(sha(sourceBytes)!==packet.parentAuthoringSha256||sha(sourceBytes)!==docket.originalFileSha256||
    sha(packetBytes)!==docket.revisionFileSha256 ||
    packet.schemaVersion!=='assps-bio9-research-urdu-editorial-rev2-v1' ||
    docket.schemaVersion!=='assps-bio9-research-urdu-editorial-review-docket-v1' ||
    packet.academicallyApproved!==false||packet.releaseEligible!==false||
    packet.liveImportAllowed!==false||packet.translationIndependentlyReviewed!==false||
    packet.uniqueQuestionsAdded!==0 || docket.approved!==0||docket.published!==0 ||
    docket.translationReviewed!==0||docket.academicReviewed!==0 ||
    packet.questions?.length!==4||docket.items?.length!==4)
  throw Error('EDITORIAL_PACKET_IDENTITY_OR_APPROVAL_INVARIANT_FAILED')
 const mapped=new Map()
 for(const item of docket.items){
  const parent=source.drafts?.find(q=>q.id===item.questionId)
  const revision=packet.questions.find(q=>q.id===item.questionId)
  if(!parent||!revision||mapped.has(item.questionId)||
     sha(JSON.stringify(parent))!==item.originalQuestionSha256||
     sha(JSON.stringify(revision))!==item.proposedRevisionSha256||
     JSON.stringify(parent.content?.en)!==JSON.stringify(revision.content?.en)||
     !revision.content?.ur?.stem||!revision.content?.ur?.answer||
     revision.review?.status!=='draft'||item.approved!==false||
     item.semanticEquivalenceVerified!==false||item.reviewerId!==null||
     item.reviewState!=='PENDING_INDEPENDENT_TRANSLATION_AND_BIOLOGY_REVIEW')
    throw Error('EDITORIAL_QUESTION_PARENT_OR_REVIEW_IDENTITY_MISMATCH:'+item.questionId)
  mapped.set(item.questionId,{
   questionId:item.questionId,
   parentQuestionSha256:item.originalQuestionSha256,
   proposedRevisionSha256:item.proposedRevisionSha256,
   proposedRevisionFile:path.relative(ROOT,PACKET),
   editorialRevisionFileSha256:docket.revisionFileSha256,
   proposalStatus:'PENDING_INDEPENDENT_TRANSLATION_AND_BIOLOGY_REVIEW',
   approved:false
  })
 }
 if(mapped.size!==4)throw Error('EDITORIAL_PACKET_COUNT_MISMATCH')
 return [...mapped.values()].sort((a,b)=>a.questionId.localeCompare(b.questionId))
}
function loadCandidates(){
 return verifyPacket({sourceBytes:fs.readFileSync(SOURCE),
  packetBytes:fs.readFileSync(PACKET),docketBytes:fs.readFileSync(DOCKET)})
}
module.exports={verifyPacket,loadCandidates,PACKET,DOCKET,SOURCE}
