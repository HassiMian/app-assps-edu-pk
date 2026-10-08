'use strict'
const fs=require('node:fs')
const crypto=require('node:crypto')
const path=require('node:path')
const {OUT,DOCKET,IN,FILES,canonicalOptions}=require('./build-chemistry9-mcq-editorial-rev2.cjs')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const ROOT=path.resolve(__dirname,'../..')
function verify({packageBytes=fs.readFileSync(OUT),docketBytes=fs.readFileSync(DOCKET),readFile=file=>fs.readFileSync(path.join(IN,file))}={}){
 const packet=JSON.parse(packageBytes),docket=JSON.parse(docketBytes)
 if(packet.schemaVersion!=='assps-chemistry9-mcq-ch10-ch13-editorial-rev2-v1'||
    docket.schemaVersion!=='assps-chemistry9-mcq-ch10-ch13-editorial-docket-v1'||
    sha(packageBytes)!==docket.revisionFileSha256||
    packet.releaseEligible!==false||packet.liveImportAllowed!==false||
    packet.approved!==false||packet.published!==false||
    packet.independentlyReviewed!==false||
    docket.questionSourceVerified!==0||docket.independentlyReviewed!==0||
    docket.approved!==0||docket.published!==0||
    packet.editedExistingQuestionCount!==20||docket.editedExistingQuestionCount!==20||
    packet.newQuestionCount!==0||docket.items?.length!==20||packet.questions?.length!==20)
  throw Error('UNSAFE_OR_STALE_MCQ_EDITORIAL_PACKET')
 const originalById=new Map(),configs=new Map(FILES.map(x=>[x.file,x]))
 for(const f of docket.sourceFiles){
  const config=configs.get(f.file)
  if(!config)throw Error('UNKNOWN_SOURCE_FILE')
  const bytes=readFile(f.file)
  if(sha(bytes)!==f.fileSha256||sha(bytes)!==config.expectedSha256)
   throw Error('ORIGINAL_MCQ_SOURCE_SHA_CHANGED:'+f.file)
  const d=JSON.parse(bytes)
  for(const q of d.drafts.filter(x=>x.type==='mcq')){
   if(originalById.has(q.id))throw Error('DUPLICATE_SOURCE_MCQS')
   originalById.set(q.id,{q,file:f.file})
  }
 }
 if(originalById.size!==20)throw Error('SOURCE_MCQ_COUNT_CHANGED')
 const verified=[],seen=new Set()
 for(const row of docket.items){
  if(seen.has(row.questionId))throw Error('DUPLICATE_MCQ_DOCKET_ID')
  seen.add(row.questionId)
  const parent=originalById.get(row.questionId)
  const changed=packet.questions.find(q=>q.id===row.questionId)
  if(!parent||!changed||parent.file!==row.originalAuthoringFile||
     row.originalQuestionSha256!==sha(JSON.stringify(parent.q))||
     row.proposedQuestionSha256!==sha(JSON.stringify(changed))||
     changed.editorialCandidate?.sourceQuestionSha256!==row.originalQuestionSha256||
     row.originalCorrectOption!=='A'||row.proposedCorrectOption!==changed.correctOptionId||
     row.answerTextPreserved!==true||row.optionTextMultisetPreserved!==true||
     row.approved!==false||row.published!==false||row.independentReviewerId!==null||
     row.academicApproverId!==null||row.independentAnswerVerified!==false||
     changed.editorialCandidate.academicApproval!==false||
     changed.editorialCandidate.publicationAllowed!==false||
     changed.editorialCandidate.liveImportAllowed!==false)
   throw Error('PROPOSAL_MCQ_REVIEW_BINDING_INVALID:'+row.questionId)
  const opts=changed.content?.en?.options,orig=parent.q.content?.en?.options
  if(!Array.isArray(opts)||opts.length!==4||
     opts.map(x=>x.id).join('')!=='ABCD'||
     opts['ABCD'.indexOf(changed.correctOptionId)]?.text!==parent.q.content.en.answer||
     JSON.stringify(canonicalOptions(opts))!==JSON.stringify(canonicalOptions(orig))||
     changed.content.en.stem!==parent.q.content.en.stem||
     changed.content.en.answer!==parent.q.content.en.answer||
     changed.marks!==parent.q.marks||changed.topicId!==parent.q.topicId||
     JSON.stringify(changed.source)!==JSON.stringify(parent.q.source))
   throw Error('MCQ_OPTION_OR_ANSWER_MUTATED:'+row.questionId)
  verified.push({
    questionId:row.questionId,parentQuestionSha256:row.originalQuestionSha256,
    proposedRevisionSha256:row.proposedQuestionSha256,revisionFile:path.relative(ROOT,OUT),
    revisionFileSha256:sha(packageBytes),
    reviewStatus:'PENDING_INDEPENDENT_CHEMISTRY_SOURCE_ANSWER_EDITORIAL_REVIEW',
    approved:false
  })
 }
 if(verified.length!==20)throw Error('INCOMPLETE_MCQ_EDITORIAL_DOCKET')
 return verified.sort((a,b)=>a.questionId.localeCompare(b.questionId))
}
module.exports={verify}
