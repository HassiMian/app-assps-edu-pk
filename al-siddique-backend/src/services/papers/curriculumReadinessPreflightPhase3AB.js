// Phase3AB informational preflight ONLY. It never activates publisher/printing/deployment.
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const str=x=>typeof x==='string'&&x.trim().length>0
const pos=x=>Number.isSafeInteger(x)&&x>0
const requiredReviews=['signedPublisherKeyCustody','independentSubjectGrantLiveSource',
 'isolatedDbCredentialsAndRls','institutionalBackupRestore',
 'teacherStudentResponsePrivacy','multiInstanceIntentSafety',
 'bilingualPrintWordPdfParity','canaryRollbackApproved']
function auditPhase3ABReadiness({manifest,grade,subject,editionEvidence,
 signedPublication,operationalReviews}={}){
 const blockers=[]
 if(!pos(grade)||!str(subject)){blockers.push('SCOPE_MISSING')}
 const entries=Array.isArray(manifest?.entries)?manifest.entries:[]
 if(manifest?.schemaVersion!=='assps-official-manifest-v1')
  blockers.push('OFFICIAL_MANIFEST_UNVERIFIED')
 if(manifest?.liveSeedCount===0||!pos(manifest?.liveSeedCount))
  blockers.push('NO_APPROVED_LIVE_ACADEMIC_RECORDS')
 const pair={}
 for(const [lang,medium] of [['en','English'],['ur','Urdu']]){
  const matches=entries.filter(e=>e.grade===grade&&
   typeof e.subject==='string'&&e.subject.toLowerCase()===String(subject).toLowerCase()&&
   e.medium===medium)
  if(matches.length!==1){blockers.push(lang.toUpperCase()+'_OFFICIAL_SOURCE_NOT_UNIQUE');continue}
  const e=matches[0];pair[lang]=e
  if(!sha(e.pdfSha256)||!str(e.pdfUrl)||
     !['PDF_BYTES_VERIFIED_EDITION_REVIEWED','FULLY_INDEPENDENTLY_VERIFIED'].includes(e.downloadStatus))
   blockers.push(lang.toUpperCase()+'_OFFICIAL_PDF_NOT_APPROVED')
  if(!str(e.edition)||['VERIFY','UNCONFIRMED','PENDING'].includes(e.edition))
   blockers.push(lang.toUpperCase()+'_EDITION_NOT_APPROVED')
  if(e.chapterIndexStatus!=='INDEPENDENTLY_VERIFIED')
   blockers.push(lang.toUpperCase()+'_CHAPTER_INDEX_PENDING')
  if(e.exerciseIndexStatus!=='INDEPENDENTLY_VERIFIED')
   blockers.push(lang.toUpperCase()+'_EXERCISE_INDEX_PENDING')
  if(e.questionGenerationStatus!=='PUBLISHED_APPROVED')
   blockers.push(lang.toUpperCase()+'_ACADEMIC_QUESTION_RELEASE_PENDING')
 }
 if(editionEvidence?.status!=='INDEPENDENTLY_APPROVED'||
    !str(editionEvidence.evidenceId)||!pos(editionEvidence.reviewerId)||
    !pair.en||!pair.ur||editionEvidence.enPdfSha256!==pair.en.pdfSha256||
    editionEvidence.urPdfSha256!==pair.ur.pdfSha256)
  blockers.push('BILINGUAL_EDITION_EQUIVALENCE_NOT_APPROVED')
 if(signedPublication?.status!=='PUBLISHED_APPROVED'||
    signedPublication?.trustOrigin!=='SERVER_INDEPENDENT_AUDIT'||
    signedPublication?.signatureVerification!=='PINNED_ED25519_VERIFIED'||
    !str(signedPublication?.publicationId)||!pos(signedPublication?.revision)||
    !sha(signedPublication?.recordsDigest)||
    !pos(signedPublication?.recordCount)||signedPublication?.syntheticFixture!==false)
  blockers.push('GENUINE_SIGNED_CURRICULUM_PUBLICATION_MISSING')
 for(const name of requiredReviews){
  const r=operationalReviews?.[name]
  if(r?.status!=='INDEPENDENTLY_APPROVED'||!str(r.evidenceId)||!pos(r.reviewerId))
   blockers.push('STAGING_REVIEW_'+name.toUpperCase()+'_PENDING')
 }
 return Object.freeze({schema:'assps-phase3ab-readiness-preflight-v1',
  status:blockers.length?'BLOCKED':'EVIDENCE_COMPLETE_NOT_AUTHORIZED',
  scope:{grade:grade??null,subject:subject??null},
  blockers:Object.freeze(blockers),
  // A status report is not trusted issuer verification or permission to alter production.
  authorizesPublication:false,authorizesStagingActivation:false,
  authorizesPrinting:false,authorizesProduction:false})
}
module.exports={auditPhase3ABReadiness,requiredReviews}
