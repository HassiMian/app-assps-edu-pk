// Real Paper Workspace bridge: only server-published, exact-revision, approved Grade IX/X questions.
// Approval cannot be granted or modified in this client module.
const HASH = /^[0-9a-f]{64}$/
const TYPES = new Set(['mcq','short','long'])
const clean = x => String(x ?? '').trim()
function checked(response, record, scope) {
 const body=response?.data||response
 if(body?.success!==true||body?.academicallyApprovedOnly!==true||
    body?.source!=='server-signed-restricted-verified-publications'||
    !Array.isArray(body.records)||body.records.length!==1)throw Error('VERIFIED_REVISION_NOT_AUTHENTICATED')
 const q=body.records[0]
 if(q.academicallyVerified!==true||q.paperStudioSelectable!==true||
    q.originalQuestionId!==record.originalQuestionId||
    Number(q.revision)!==Number(record.revision)||
    q.questionSha!==record.questionSha||q.answerSha!==record.answerSha||
    q.publicationGrantSha!==record.publicationGrantSha||
    Number(q.grade)!==Number(scope.grade)||
    clean(q.subject).toLowerCase()!==clean(scope.subject).toLowerCase())
  throw Error('VERIFIED_REVISION_CHANGED_OR_SCOPE_MISMATCH')
 for(const key of ['questionSha','answerSha','publicationGrantSha','verifiedReviewPacketSha']){
  if(!HASH.test(clean(q[key])))throw Error('MISSING_SIGNED_REVIEW_OR_HASH')
 }
 return q
}
const UNAPPROVED_SHA = '0'.repeat(64)
function isInstitutionalDraft(ref){ return ref?.tier === 'institutional-draft' }

function checkedInstitutionalDraft(response, sourceRef, scope) {
 const body=response?.data||response
 if(body?.success!==true||body?.source!=='server-institutional-draft-question-bank'||
    body?.academicallyApprovedOnly!==false||body?.tier!=='institutional-draft'||
    body?.schoolScoped!==true||!Array.isArray(body.records)||body.records.length!==1)
   throw Error('DRAFT_SOURCE_NOT_AUTHENTICATED')
 const q=body.records[0]
 if(!isInstitutionalDraft(sourceRef)||sourceRef.academicallyApproved!==false||
    sourceRef.publicationGrantSha!==UNAPPROVED_SHA||
    q.tier!=='institutional-draft'||q.academicallyApproved!==false||
    q.academicallyVerified!==false||q.pipelineState!=='AI_ADVISORY'||
    q.publicationGrantSha!==UNAPPROVED_SHA||q.verifiedReviewPacketSha!==UNAPPROVED_SHA||
    q.originalQuestionId!==sourceRef.originalQuestionId||
    Number(q.revision)!==Number(sourceRef.revision)||
    q.questionSha!==sourceRef.questionSha||q.answerSha!==sourceRef.answerSha||
    Number(q.grade)!==Number(scope.grade)||
    clean(q.subject).toLowerCase()!==clean(scope.subject).toLowerCase())
   throw Error('DRAFT_SOURCE_CHANGED_OR_FALSE_APPROVAL')
 // Compare the COMPLETE server question snapshot, including MCQ options.
 // Question/answer SHA alone is insufficient because options may change.
 const currentSource=adaptVerifiedPaperRecord(q,scope)
 if(currentSource.verifiedAcademicRef.contentSnapshot!==sourceRef.contentSnapshot)
   throw Error('DRAFT_QUESTION_SOURCE_CHANGED')
 return q
}
export function grade910ClassNumber(value){
 const raw=clean(value).toLowerCase().replace(/^class\s*/,'')
 if(/^(9|9th|ix|nine)(?:\s|$)/.test(raw))return 9
 if(/^(10|10th|x|ten)(?:\s|$)/.test(raw))return 10
 return null
}
export function verifiedQuestionContent(q){
 return JSON.stringify({
  type:q.type, en:q.en, ur:q.ur, medium:q.medium, marks:q.marks, chapterId:q.chapterId,
  options:(q.options||[]).map(o=>({key:o.key,en:o.en,ur:o.ur,correct:o.correct===true})),
  sourceAnswerSha:q.verifiedAcademicRef?.answerSha||null
 })
}
export function adaptVerifiedPaperRecord(record,scope){
 const q=record?.paperPayload?.finalQuestion
 const ans=record?.paperPayload?.finalAnswer
 if(!q||typeof q!=='object'||Array.isArray(q)||
    !ans||typeof ans!=='object'||Array.isArray(ans)||!TYPES.has(q.type)||
    ![9,10].includes(Number(scope.grade))||
    Number(record.grade)!==Number(scope.grade)||
    clean(record.subject).toLowerCase()!==clean(scope.subject).toLowerCase()||
    !HASH.test(clean(record.questionSha))||!HASH.test(clean(record.answerSha))||
    !HASH.test(clean(record.publicationGrantSha))||
    clean(record.paperPayload?.originalQuestionId)!==clean(record.originalQuestionId)||
    Number(record.paperPayload?.questionRevision)!==Number(record.revision))
   throw Error('UNSUPPORTED_VERIFIED_PAPER_QUESTION_FORMAT')
 const options=(q.options||[]).map((o,i)=>({
  key:clean(o.key||o.label||String.fromCharCode(65+i)),
  en:clean(o.text||o.en),ur:clean(o.textUrdu||o.ur||o.text||o.en),
  correct:clean(ans.correctOption||ans.option||'').toUpperCase()===clean(o.key||o.label||String.fromCharCode(65+i)).toUpperCase()
 }))
 if(q.type==='mcq'&&(options.length<2||options.filter(o=>o.correct).length!==1||
    options.some(o=>!o.en&&!o.ur)))throw Error('INVALID_VERIFIED_MCQ_OPTIONS_OR_ANSWER')
 const en=clean(q.text||q.stem||q.en),ur=clean(q.textUrdu||q.ur||q.text||q.stem||q.en)
 if(!en&&!ur)throw Error('EMPTY_VERIFIED_QUESTION')
 const marks=Number(q.marks)
 if(!Number.isFinite(marks)||marks<=0||marks>100)throw Error('VERIFIED_MARKS_NOT_SIGNED')
 const uid='verified_ixx_'+record.originalQuestionId.replace(/[^a-zA-Z0-9_-]/g,'_')+'_r'+record.revision
 const isDraft = record.tier === 'institutional-draft'
 const result={id:uid,type:q.type,medium:record.medium,
  en,ur,marks,priority:isDraft?'institutional-draft':'approved-source',chapterId:clean(q.chapter||q.chapterId),options,
  verifiedAcademicRef:{originalQuestionId:record.originalQuestionId,revision:Number(record.revision),
   questionSha:record.questionSha,answerSha:record.answerSha,
   publicationGrantSha:record.publicationGrantSha,grade:Number(scope.grade),subject:clean(scope.subject),section:clean(scope.section),
   tier:record.tier||'approved',academicallyApproved:record.academicallyApproved===true}
 }
 result.verifiedAcademicRef.contentSnapshot=verifiedQuestionContent(result)
 return result
}
export function verifiedRenderedSectionSnapshot(section){
 return JSON.stringify({
  layoutPreset:section.layoutPreset, heading:section.heading, content:section.content,
  marks:Number(section.marks),answerKey:section.answerKey||null
 })
}
export function createGrade910ApprovedSection(q,ordinal){
 const ref=q?.verifiedAcademicRef
 if(!ref||!Number.isInteger(ordinal)||ordinal<1)throw Error('VERIFIED_SECTION_REQUIRES_SOURCE')
 const stem=q.medium==='urdu'?q.ur:q.en
 const options=q.type==='mcq'?'\n'+q.options.map(o=>'('+o.key+') '+(q.medium==='urdu'?o.ur:o.en)).join('\n'):''
 const answer=q.type==='mcq'?q.options.find(o=>o.correct)?.key:null
 if(q.type==='mcq'&&!answer)throw Error('SIGNED_MCQ_ANSWER_REQUIRED')
 const isDraft = ref.tier === 'institutional-draft'
 const draftHeading = q.medium==='urdu'?'سوال نمبر '+ordinal+' (مسودہ): ('+q.marks+' نمبر)':'Q'+ordinal+' [Draft Candidate · AI Advisory]: ('+q.marks+' marks)'
 const heading = isDraft ? draftHeading : (q.medium==='urdu'?'سوال نمبر '+ordinal+': ('+q.marks+' نمبر)':'Q'+ordinal+'. ('+q.marks+' marks)')
 const section={
  id:(isDraft?'draft-grade910-':'signed-grade910-')+ref.originalQuestionId.replace(/[^a-zA-Z0-9_-]/g,'_')+'-r'+ref.revision,
  type:'official_section',layoutPreset:q.type,
  sectionKind:q.type,sourceOrder:ordinal,medium:q.medium,
  heading,text:heading,textUrdu:q.medium==='urdu'?heading:'',
  content:'1. '+stem+options,
  marks:q.marks,answerKey:answer?{'1':answer}:null,
  priority:isDraft?'institutional-draft':'verified-academic',verifiedAcademicRef:{...ref}
 }
 section.verifiedRenderSnapshot=verifiedRenderedSectionSnapshot(section)
 return section
}
export function paperForCanonicalVerifiedRendering(paper={}){
 // Render the real canonical official_section once, not its legacy q-array
 // verification mirror a second time. The source mirror is kept for review guards.
 return {
  ...paper,
  mcq:(paper.mcq||[]).filter(q=>!q.verifiedAcademicRef),
  short:(paper.short||[]).filter(q=>!q.verifiedAcademicRef),
  long:(paper.long||[]).filter(q=>!q.verifiedAcademicRef)
 }
}
export function rehydrateGrade910VerifiedPaper(paper){
 const meta=paper?.canonicalDocument?.academicVerifiedSelections
 if(!meta)return paper
 if(meta.schemaVersion!=='assps-grade910-canonical-approved-revisions-v1'||
   meta.alwaysRequireServerReverification!==true||!Array.isArray(meta.rows))
   return {...paper,academicVerifiedRestoreError:'INVALID_CANONICAL_APPROVED_REFS'}
 const copy={...paper,mcq:[...(paper.mcq||[])],short:[...(paper.short||[])],
   long:[...(paper.long||[])],official_section:[...(paper.official_section||[])]}
 for(const item of meta.rows){
  const q=item?.question,sec=item?.section,ref=q?.verifiedAcademicRef
  if(!q||!sec||!ref||
     ref.originalQuestionId!==item.originalQuestionId||ref.revision!==item.revision||
     ref.questionSha!==item.questionSha||ref.answerSha!==item.answerSha||
     ref.publicationGrantSha!==item.publicationGrantSha||
     sec.verifiedAcademicRef?.questionSha!==ref.questionSha||
     sec.verifiedAcademicRef?.originalQuestionId!==ref.originalQuestionId||
     (!isInstitutionalDraft(ref) && sec.verifiedRenderSnapshot!==verifiedRenderedSectionSnapshot(sec))||
     (!isInstitutionalDraft(ref) && ref.contentSnapshot!==verifiedQuestionContent(q)))
    return {...copy,academicVerifiedRestoreError:'CANONICAL_SIGNED_REFERENCE_TAMPERED'}
  if(!['mcq','short','long'].includes(q.type))
    return {...copy,academicVerifiedRestoreError:'CANONICAL_VERIFIED_TYPE_INVALID'}
  if(!copy[q.type].some(v=>v.id===q.id))copy[q.type].push(q)
  if(!copy.official_section.some(v=>v.id===sec.id))copy.official_section.push(sec)
 }
 return copy
}
export async function verifyWorkspaceApprovedImports(paper,scope,resolve,resolveDraft){
 if(paper?.academicVerifiedRestoreError)throw Error(paper.academicVerifiedRestoreError)
 const requests=[]
 const rendered=(paper?.official_section||[]).filter(s=>s?.verifiedAcademicRef)
 const embedded=['mcq','short','long'].flatMap(type=>(paper?.[type]||[]).filter(q=>q?.verifiedAcademicRef))
 const canonicalRows=paper?.canonicalDocument?.academicVerifiedSelections?.rows
 if(Array.isArray(canonicalRows)){
  if(embedded.length!==canonicalRows.length)throw Error('CANONICAL_VERIFIED_REVISION_COUNT_MISMATCH')
  for(const q of embedded){
   const ref=q.verifiedAcademicRef
   if(!canonicalRows.some(row=>row.originalQuestionId===ref.originalQuestionId &&
      row.revision===ref.revision && row.questionSha===ref.questionSha &&
      row.answerSha===ref.answerSha && row.publicationGrantSha===ref.publicationGrantSha))
     throw Error('CANONICAL_VERIFIED_REVISION_SOURCE_CHANGED')
  }
 }
 if(embedded.length!==rendered.length)throw Error('VERIFIED_CANONICAL_SECTION_MISMATCH')
 for(const section of rendered){
  const ref=section.verifiedAcademicRef
  const item=embedded.find(q=>q.verifiedAcademicRef?.originalQuestionId===ref.originalQuestionId&&q.verifiedAcademicRef?.revision===ref.revision)
  const draft=isInstitutionalDraft(ref)
  if(!item||section.layoutPreset!==item.type||
     (!draft && (!section.verifiedRenderSnapshot||
       section.verifiedRenderSnapshot!==verifiedRenderedSectionSnapshot(section)||
       Number(section.marks)!==Number(item.marks))))
   throw Error('VERIFIED_PAPER_RENDERED_CONTENT_TAMPERED')
  if(draft && !(/Draft Candidate.*AI Advisory/i.test(clean(section.heading))||
                 /مسودہ/.test(clean(section.heading))))
   throw Error('DRAFT_ADVISORY_HEADING_REQUIRED')
 }
 for(const type of ['mcq','short','long']){
  for(const q of paper?.[type]||[]){
   if(!q.verifiedAcademicRef)continue
   const ref=q.verifiedAcademicRef
   const draft=isInstitutionalDraft(ref)
   if(q.type!==type||!ref.contentSnapshot||
      (!draft && ref.contentSnapshot!==verifiedQuestionContent(q)))
    throw Error('VERIFIED_QUESTION_EDITED_REQUIRES_NEW_INDEPENDENT_REVIEW')
   if(draft) {
    if(ref.academicallyApproved!==false||ref.publicationGrantSha!==UNAPPROVED_SHA||
       !HASH.test(clean(ref.questionSha))||!HASH.test(clean(ref.answerSha)))
      throw Error('DRAFT_CANNOT_CLAIM_OFFICIAL_APPROVAL')
   } else {
    const sectionMarks=Number(paper?.[type+'_marks'])
    if(Number.isFinite(sectionMarks)&&sectionMarks>0&&sectionMarks!==Number(q.marks))
     throw Error('VERIFIED_SECTION_MARKS_CHANGED_REQUIRES_REVIEW')
   }
   if(Number(ref.grade)!==Number(scope.grade)||
     clean(ref.subject).toLowerCase()!==clean(scope.subject).toLowerCase())
    throw Error('VERIFIED_QUESTION_DIFFERENT_GRADE_OR_SUBJECT')
   const params={
    grade:Number(scope.grade),subject:clean(scope.subject),section:clean(ref.section||scope.section),
    originalQuestionId:ref.originalQuestionId,revision:ref.revision,questionSha:ref.questionSha
   }
   if(draft && typeof resolveDraft!=='function')throw Error('DRAFT_RESOLVER_REQUIRED')
   const raw=await (draft?resolveDraft:resolve)(params)
   const source=draft?checkedInstitutionalDraft(raw,ref,scope):checked(raw,ref,scope)
   if(source.paperPayload?.finalQuestion?.type!==q.type)
    throw Error('VERIFIED_QUESTION_TYPE_CHANGED')
   requests.push({id:ref.originalQuestionId,revision:ref.revision,
    questionSha:ref.questionSha,answerSha:ref.answerSha,grantSha:ref.publicationGrantSha,
    ...(draft?{tier:'institutional-draft'}:{})})
  }
 }
 return requests
}
export function requireVerifiedResolution(response,record,scope){
 return checked(response,record,scope)
}
