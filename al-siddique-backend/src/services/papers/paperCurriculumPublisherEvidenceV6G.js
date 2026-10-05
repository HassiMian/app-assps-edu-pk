const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {auditPhase3ABReadiness}=require('./saasReviewedContract/curriculumReadinessPreflightPhase3AB.cjs')
const PRECHECK_SHA='18d871d93648a78f13e539e4000e9dfeb20f4722f18024b8df0e8b939325084e'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const shaFile=f=>sha(fs.readFileSync(f))
const isHash=x=>/^[a-f0-9]{64}$/i.test(String(x||''))
const commit=x=>/^[a-f0-9]{40}$/i.test(String(x||''))?String(x).toLowerCase():''
const clean=x=>String(x??'').trim()
const bool=x=>x===true
function assertReviewedPreflight(){
 const f=path.join(__dirname,'saasReviewedContract','curriculumReadinessPreflightPhase3AB.cjs')
 if(shaFile(f)!==PRECHECK_SHA)throw Error('reviewed curriculum readiness preflight hash changed')
 return true
}
function safeArtifact(base,entry,label,issues){
 if(!entry||typeof entry!=='object'||!/^[A-Za-z0-9._-]+$/.test(String(entry.file||''))||!isHash(entry.sha256)){
  issues.push(`${label} artifact coordinate invalid`);return null
 }
 const f=path.join(base,entry.file)
 if(path.dirname(f)!==base){issues.push(`${label} artifact escapes evidence directory`);return null}
 try{if(shaFile(f)!==String(entry.sha256).toLowerCase())issues.push(`${label} artifact hash mismatch`);return f}
 catch{issues.push(`${label} artifact cannot be read`);return null}
}
function deriveManifestCounts(manifest){
 const entries=Array.isArray(manifest?.entries)?manifest.entries:[]
 return {
  catalogEntries:entries.length,
  verifiedPdfHashes:entries.filter(x=>isHash(x?.pdfSha256)).length,
  chapterIndexesReady:entries.filter(x=>!['',null,undefined,'PENDING'].includes(x?.chapterIndexStatus)).length,
  exerciseIndexesReady:entries.filter(x=>!['',null,undefined,'PENDING'].includes(x?.exerciseIndexStatus)).length,
  questionGenerationUnblocked:entries.filter(x=>!String(x?.questionGenerationStatus||'').startsWith('BLOCKED')).length,
 }
}
async function verifyCurriculumPublisherEvidence({env=process.env}={}){
 const issues=[]
 try{assertReviewedPreflight()}catch(e){issues.push(e.message)}
 const evidencePath=clean(env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH)
 const expectedSha=clean(env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_SHA256).toLowerCase()
 const approvedCommit=commit(env.PAPER_CURRICULUM_PUBLISHER_SOURCE_COMMIT)
 if(!evidencePath)issues.push('publisher evidence path is not configured')
 if(!isHash(expectedSha))issues.push('publisher evidence SHA-256 is not configured')
 if(!approvedCommit)issues.push('publisher source commit is not configured')
 let evidence=null,manifestSha=null,official=null,dryRun=null,preflight=null
 if(evidencePath&&isHash(expectedSha)){
  try{
   manifestSha=shaFile(evidencePath)
   if(manifestSha!==expectedSha)issues.push('publisher evidence manifest hash mismatch')
   evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'))
  }catch{issues.push('publisher evidence manifest cannot be read')}
 }
 if(evidence){
  if(evidence.architectureVersion!=='v6-g-curriculum-publisher-evidence-1')issues.push('publisher evidence architecture version mismatch')
  if(evidence.evidenceOnly!==true||evidence.approvalClaim!==false)issues.push('publisher evidence must remain evidence-only with no self-approval claim')
  if(commit(evidence.sourceCommit)!==approvedCommit)issues.push('publisher evidence source commit mismatch')
  const base=path.dirname(evidencePath)
  const officialFile=safeArtifact(base,evidence.artifacts?.officialSourceManifest,'official source manifest',issues)
  const dryFile=safeArtifact(base,evidence.artifacts?.dryRunReport,'dry run report',issues)
  try{if(officialFile)official=JSON.parse(fs.readFileSync(officialFile,'utf8'))}catch{issues.push('official source manifest JSON invalid')}
  try{if(dryFile)dryRun=JSON.parse(fs.readFileSync(dryFile,'utf8'))}catch{issues.push('dry run report JSON invalid')}
  if(official&&evidence.sourceManifestSha256!==evidence.artifacts?.officialSourceManifest?.sha256)issues.push('publisher source-manifest hash coordinate mismatch')
  if(dryRun&&evidence.dryRunReportSha256!==evidence.artifacts?.dryRunReport?.sha256)issues.push('publisher dry-run hash coordinate mismatch')
  if(official){
   const derived=deriveManifestCounts(official),declared=evidence.counts||{}
   for(const [k,v] of Object.entries(derived))if(Number(declared[k])!==v)issues.push(`publisher evidence count mismatch: ${k}`)
   if(official.schemaVersion!=='assps-official-manifest-v1')issues.push('official curriculum manifest schema is not approved')
   if(clean(official.authority)!==clean(evidence.authority))issues.push('publisher authority does not match official manifest')
  }
  if(dryRun){
   if(Number(evidence.counts?.stagedRealQuestionCount)!==Number(dryRun.stagedRealQuestionCount||0))issues.push('publisher staged real-question count mismatch')
   if(Number(evidence.counts?.wouldInsert)!==Number(dryRun.wouldInsert||0))issues.push('publisher dry-run insert count mismatch')
  }
  const scope=evidence.publicationScope||{}
  preflight=auditPhase3ABReadiness({manifest:official,grade:scope.grade,subject:scope.subject,editionEvidence:evidence.editionEvidence,signedPublication:evidence.signedPublication,operationalReviews:evidence.operationalReviews})
  if(preflight.status!=='EVIDENCE_COMPLETE_NOT_AUTHORIZED')issues.push(...preflight.blockers.map(x=>`preflight:${x}`))
  if(!Number.isSafeInteger(evidence.counts?.approvedQuestionCount)||evidence.counts.approvedQuestionCount<1)issues.push('publisher evidence has no independently approved questions')
  const required=['liveImportAuthorized','academicSignoffComplete','bilingualSignoffComplete','tenantScopedBankSnapshotReviewed','publisherKeyCustodyApproved','institutionRosterBindingApproved']
  for(const k of required)if(!bool(evidence.releaseState?.[k]))issues.push(`publisher release state incomplete: ${k}`)
  if(!Array.isArray(evidence.openIssues)||evidence.openIssues.length)issues.push('publisher evidence still declares open issues')
 }
 return {valid:issues.length===0,issues:[...new Set(issues)],manifestSha,sourceCommit:approvedCommit,architectureVersion:evidence?.architectureVersion||null,scope:evidence?.publicationScope||null,preflightStatus:preflight?.status||null,preflightBlockers:preflight?.blockers||[],approvedQuestionCount:Number(evidence?.counts?.approvedQuestionCount||0)}
}
module.exports={verifyCurriculumPublisherEvidence,assertReviewedPreflight,deriveManifestCounts}
