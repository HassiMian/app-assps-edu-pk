import test from 'node:test'
import assert from 'node:assert/strict'
import {
 grade910ClassNumber,adaptVerifiedPaperRecord,verifyWorkspaceApprovedImports,requireVerifiedResolution,createGrade910ApprovedSection,rehydrateGrade910VerifiedPaper,paperForCanonicalVerifiedRendering
} from './grade910PaperWorkspaceVerifiedBridge.js'
import { createManualAssessmentDocument } from './AssessmentStudio/core/manualAssessmentDocument.js'
const H='a'.repeat(64),J='b'.repeat(64),K='c'.repeat(64)
const scope={grade:9,subject:'Biology',section:'Usman'}
const accepted={
 originalQuestionId:'IX-BIO-PROOF-001',revision:2,questionSha:H,answerSha:J,
 publicationGrantSha:K,verifiedReviewPacketSha:H,
 grade:9,subject:'Biology',medium:'english',
 academicallyVerified:true,paperStudioSelectable:true,
 paperPayload:{originalQuestionId:'IX-BIO-PROOF-001',questionRevision:2,
  finalQuestion:{type:'mcq',marks:1,text:'Which organelle makes ATP?',options:[
   {key:'A',text:'Mitochondrion'},{key:'B',text:'Cell wall'},
   {key:'C',text:'Nucleus'},{key:'D',text:'Ribosome'}]},
  finalAnswer:{correctOption:'A'}}
}
const envelope=record=>({data:{success:true,academicallyApprovedOnly:true,
 source:'server-signed-restricted-verified-publications',records:[record]}})
const copy=q=>JSON.parse(JSON.stringify(q))
const withSection=q=>({mcq:[q],mcq_marks:q.marks,official_section:[createGrade910ApprovedSection(q,1)]})
test('only genuine 9th/10th school labels enable verified import',()=>{
 assert.equal(grade910ClassNumber('Class 9th Usman'),9)
 assert.equal(grade910ClassNumber('10th - Fatma'),10)
 assert.equal(grade910ClassNumber('Class 8'),null)
})
test('certified endpoint response maps exact MCQ into real paper editor question',()=>{
 const fresh=requireVerifiedResolution(envelope(accepted),accepted,scope)
 const q=adaptVerifiedPaperRecord(fresh,scope)
 assert.equal(q.type,'mcq')
 assert.equal(q.marks,1)
 assert.equal(q.options.length,4)
 assert.equal(q.options.filter(x=>x.correct).length,1)
 assert.equal(q.verifiedAcademicRef.section,'Usman')
 assert.equal(q.verifiedAcademicRef.questionSha,H)
})
test('existing manual drafts are not silently relabeled verified',async()=>{
 const r=await verifyWorkspaceApprovedImports({mcq:[{id:'manual',en:'Original manually written question'}]},scope,()=>{
  throw Error('manual draft triggered certified fetch')
 })
 assert.deepEqual(r,[])
})
test('Save/Print resolves every unchanged signed revision with server',async()=>{
 const item=adaptVerifiedPaperRecord(accepted,scope)
 let requests=0
 const verified=await verifyWorkspaceApprovedImports(withSection(item),scope,async p=>{
  requests++
  assert.equal(p.section,'Usman');assert.equal(p.questionSha,H)
  return envelope(accepted)
 })
 assert.equal(requests,1)
 assert.deepEqual(verified,[{id:accepted.originalQuestionId,revision:2,questionSha:H,answerSha:J,grantSha:K}])
})
test('changing imported text invalidates server Save/Print check',async()=>{
 const q=copy(adaptVerifiedPaperRecord(accepted,scope));q.en='Different answer after approval'
 await assert.rejects(verifyWorkspaceApprovedImports(withSection(q),scope,()=>envelope(accepted)),/VERIFIED_QUESTION_EDITED/)
})
test('changing MCQ answer options invalidates immutable local snapshot',async()=>{
 const q=copy(adaptVerifiedPaperRecord(accepted,scope));const paper=withSection(q);q.options[0].correct=false
 await assert.rejects(verifyWorkspaceApprovedImports(paper,scope,()=>envelope(accepted)),/VERIFIED_QUESTION_EDITED/)
})
test('changing displayed section marks from reviewed marks is blocked',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 await assert.rejects(verifyWorkspaceApprovedImports({...withSection(q),mcq_marks:2},scope,()=>envelope(accepted)),/VERIFIED_SECTION_MARKS_CHANGED/)
})
test('changing a reviewed chapter or language is blocked',async()=>{
 const q=structuredClone(adaptVerifiedPaperRecord(accepted,scope));q.medium='urdu';q.chapterId='Other Chapter'
 await assert.rejects(verifyWorkspaceApprovedImports(withSection(q),scope,()=>envelope(accepted)),/VERIFIED_QUESTION_EDITED/)
})
test('revoked or stale revision cannot be inserted',()=>{
 assert.throws(()=>requireVerifiedResolution(envelope({...accepted,publicationGrantSha:H}),accepted,scope),/VERIFIED_REVISION_CHANGED/)
 assert.throws(()=>requireVerifiedResolution({data:{success:false,records:[]}},accepted,scope),/VERIFIED_REVISION_NOT_AUTHENTICATED/)
})
test('paper changed to wrong subject/grade is blocked before use',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 await assert.rejects(verifyWorkspaceApprovedImports(withSection(q),{...scope,subject:'Chemistry'},()=>envelope(accepted)),/DIFFERENT_GRADE_OR_SUBJECT/)
})
test('no raw provisional row is importable based on frontend flag',()=>{
 assert.throws(()=>adaptVerifiedPaperRecord({...accepted,questionSha:'not-signed'},scope),/UNSUPPORTED_VERIFIED_PAPER_QUESTION_FORMAT/)
 assert.throws(()=>adaptVerifiedPaperRecord({...accepted,paperPayload:{...accepted.paperPayload,finalQuestion:{...accepted.paperPayload.finalQuestion,options:[]}}},scope),/INVALID_VERIFIED_MCQ/)
})
test('verified question renders into actual canonical paper section and MCQ answer key',()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 const section=createGrade910ApprovedSection(q,1)
 assert.equal(section.layoutPreset,'mcq')
 assert.match(section.content,/Mitochondrion/)
 assert.equal(section.answerKey['1'],'A')
 assert.equal(section.marks,1)
 assert.equal(section.verifiedAcademicRef.questionSha,H)
})
test('missing rendered section blocks the Paper Workspace save',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 await assert.rejects(verifyWorkspaceApprovedImports({mcq:[q]},scope,()=>envelope(accepted)),/VERIFIED_CANONICAL_SECTION_MISMATCH/)
})
test('altered rendered answer key blocks Paper Workspace print',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 const paper=withSection(q);paper.official_section[0].answerKey={'1':'B'}
 await assert.rejects(verifyWorkspaceApprovedImports(paper,scope,()=>envelope(accepted)),/VERIFIED_PAPER_RENDERED_CONTENT_TAMPERED/)
})
test('a new server-published answer revision invalidates old saved question',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 await assert.rejects(verifyWorkspaceApprovedImports(withSection(q),scope,()=>envelope({...accepted,answerSha:H})),/VERIFIED_REVISION_CHANGED/)
})


test('verified questions persist in canonical PaperDocument, then reload and revalidate',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 const paper=withSection(q)
 const canonicalDocument=createManualAssessmentDocument({
  paper:{...paper,userAuthored:true},
  config:{className:'9th',subjectName:'Biology',examType:'Weekly Assessment',totalMarks:1,language:'english'},
  paperSettings:{schoolName:'ASSPS'}
 })
 assert.equal(canonicalDocument.sections.length,1)
 assert.equal(canonicalDocument.academicVerifiedSelections.rows.length,1)
 assert.equal(canonicalDocument.academicVerifiedSelections.rows[0].questionSha,H)
 assert.equal(canonicalDocument.academicVerifiedSelections.alwaysRequireServerReverification,true)
 const restored=rehydrateGrade910VerifiedPaper({canonicalDocument,official_section:[],mcq:[],short:[],long:[]})
 assert.equal(restored.mcq.length,1)
 assert.equal(restored.official_section.length,1)
 const verified=await verifyWorkspaceApprovedImports(restored,scope,()=>envelope(accepted))
 assert.equal(verified.length,1)
})
test('tampered canonical paper reload fails closed instead of silently allowing print',async()=>{
 const q=adaptVerifiedPaperRecord(accepted,scope)
 const canonicalDocument=createManualAssessmentDocument({
  paper:withSection(q),
  config:{className:'9th',subjectName:'Biology',totalMarks:1},
  paperSettings:{}
 })
 canonicalDocument.academicVerifiedSelections.rows[0].section.content='1. Different question'
 const restored=rehydrateGrade910VerifiedPaper({canonicalDocument,official_section:[],mcq:[],short:[],long:[]})
 assert.equal(restored.academicVerifiedRestoreError,'CANONICAL_SIGNED_REFERENCE_TAMPERED')
 await assert.rejects(verifyWorkspaceApprovedImports(restored,scope,()=>envelope(accepted)),/CANONICAL_SIGNED_REFERENCE_TAMPERED/)
})

test('actual printable projection renders certified canonical section exactly once',()=>{
 const verified=adaptVerifiedPaperRecord(accepted,scope)
 const other={id:'teacher-owned-draft',en:'Independently authored',type:'short'}
 const paper={...withSection(verified),short:[other],short_marks:2}
 const projected=paperForCanonicalVerifiedRendering(paper)
 assert.equal(projected.mcq.length,0)
 assert.equal(projected.short.length,1)
 assert.equal(projected.official_section.length,1)
 assert.equal(paper.mcq.length,1)
})

test('legacy and protected completed papers render identically when no verified revisions are present',()=>{
 const unchanged={
  documentFormat:'official-v12',
  mcq:[{id:'existing-mcq',en:'A completed historical question',marks:1}],
  short:[{id:'old-short',en:'Preserve school paper',marks:2}],
  official_section:[{id:'old-official',content:'Original printed paper',marks:6}],
  long:[{id:'old-long',en:'Teacher source',marks:4}],
 }
 const result=paperForCanonicalVerifiedRendering(unchanged)
 assert.deepEqual(result,unchanged)
 assert.deepEqual(result.official_section,unchanged.official_section)
})


const Z='0'.repeat(64)
const advisoryDraft={
 ...accepted,
 originalQuestionId:'IX-BIO-INSTITUTIONAL-DRAFT-001',revision:1,
 publicationGrantSha:Z,verifiedReviewPacketSha:Z,
 academicallyApproved:false,academicallyVerified:false,
 tier:'institutional-draft',pipelineState:'AI_ADVISORY',
 paperPayload:{...accepted.paperPayload,
  originalQuestionId:'IX-BIO-INSTITUTIONAL-DRAFT-001',questionRevision:1}
}
const draftEnvelope=record=>({data:{
 success:true,source:'server-institutional-draft-question-bank',
 academicallyApprovedOnly:false,tier:'institutional-draft',schoolScoped:true,
 records:[record]
}})
test('institutional draft Save/Print uses draft resolver while preserving approved-only gate',async()=>{
 const q=adaptVerifiedPaperRecord(advisoryDraft,scope)
 const paper=withSection(q)
 let approvedCalls=0,draftCalls=0
 const result=await verifyWorkspaceApprovedImports(paper,scope,()=>{
  approvedCalls++;throw Error('NEVER_PROMOTE_DRAFT')
 },()=>{
  draftCalls++;return draftEnvelope(advisoryDraft)
 })
 assert.equal(approvedCalls,0)
 assert.equal(draftCalls,1)
 assert.equal(result[0].tier,'institutional-draft')
 assert.equal(q.verifiedAcademicRef.academicallyApproved,false)
 assert.match(paper.official_section[0].heading,/Draft Candidate.*AI Advisory/)
})
test('institutional draft content editing may save/print, but remains marked advisory',async()=>{
 const q=adaptVerifiedPaperRecord(advisoryDraft,scope)
 const paper=withSection(q)
 q.en='Teacher-adapted classroom question'
 paper.official_section[0].content='1. Teacher-adapted classroom question'
 const result=await verifyWorkspaceApprovedImports(paper,scope,()=>{throw Error('DO_NOT_USE_APPROVED')},
  ()=>draftEnvelope(advisoryDraft))
 assert.equal(result[0].tier,'institutional-draft')
 assert.match(paper.official_section[0].heading,/Draft Candidate/)
})
test('draft source change or a forged official grant fails closed',async()=>{
 const q=adaptVerifiedPaperRecord(advisoryDraft,scope),paper=withSection(q)
 const modified=copy(advisoryDraft)
 modified.paperPayload.finalQuestion.options[0].text='Altered source option'
 await assert.rejects(
  verifyWorkspaceApprovedImports(paper,scope,()=>{throw Error('NO_APPROVED')},()=>draftEnvelope(modified)),
  /DRAFT_QUESTION_SOURCE_CHANGED/)
 q.verifiedAcademicRef.academicallyApproved=true
 await assert.rejects(
  verifyWorkspaceApprovedImports(paper,scope,()=>{throw Error('NO_APPROVED')},()=>draftEnvelope(advisoryDraft)),
  /DRAFT_CANNOT_CLAIM_OFFICIAL_APPROVAL/)
})
test('draft missing advisory heading must not print',async()=>{
 const q=adaptVerifiedPaperRecord(advisoryDraft,scope),paper=withSection(q)
 paper.official_section[0].heading='Official examination - misrepresented'
 await assert.rejects(verifyWorkspaceApprovedImports(paper,scope,()=>{},()=>draftEnvelope(advisoryDraft)),
  /DRAFT_ADVISORY_HEADING_REQUIRED/)
})
test('draft remains draft after canonical reconstruction even with edited classroom content',async()=>{
 const q=adaptVerifiedPaperRecord(advisoryDraft,scope)
 const section=createGrade910ApprovedSection(q,1)
 q.en='Adapted question for classroom practice'
 section.content='1. Adapted question for classroom practice'
 const row={originalQuestionId:q.verifiedAcademicRef.originalQuestionId,
  revision:q.verifiedAcademicRef.revision,questionSha:q.verifiedAcademicRef.questionSha,
  answerSha:q.verifiedAcademicRef.answerSha,publicationGrantSha:q.verifiedAcademicRef.publicationGrantSha,
  question:q,section}
 const paper={canonicalDocument:{academicVerifiedSelections:{
  schemaVersion:'assps-grade910-canonical-approved-revisions-v1',
  alwaysRequireServerReverification:true,rows:[row]}},
  mcq:[],short:[],long:[],official_section:[],mcq_marks:1}
 const restored=rehydrateGrade910VerifiedPaper(paper)
 assert.equal(restored.academicVerifiedRestoreError,undefined)
 assert.equal(restored.mcq[0].en,'Adapted question for classroom practice')
 assert.equal(restored.official_section[0].content,'1. Adapted question for classroom practice')
 const result=await verifyWorkspaceApprovedImports(restored,scope,()=>{},()=>draftEnvelope(advisoryDraft))
 assert.equal(result[0].tier,'institutional-draft')
})


test('mixed approved and advisory draft selections resolve through separate trust channels',async()=>{
 const approved=adaptVerifiedPaperRecord(accepted,scope)
 const draft=adaptVerifiedPaperRecord(advisoryDraft,scope)
 const paper={mcq:[approved,draft],mcq_marks:1,official_section:[
  createGrade910ApprovedSection(approved,1),createGrade910ApprovedSection(draft,2)]}
 let approvedCalls=0,draftCalls=0
 const result=await verifyWorkspaceApprovedImports(paper,scope,
  ()=>{approvedCalls++;return envelope(accepted)},
  ()=>{draftCalls++;return draftEnvelope(advisoryDraft)})
 assert.equal(approvedCalls,1)
 assert.equal(draftCalls,1)
 assert.equal(result.length,2)
 assert.equal(result.filter(x=>x.tier==='institutional-draft').length,1)
})
test('missing dedicated draft verification must fail closed, without using approved resolver',async()=>{
 const draft=adaptVerifiedPaperRecord(advisoryDraft,scope)
 const paper=withSection(draft)
 await assert.rejects(verifyWorkspaceApprovedImports(paper,scope,()=>envelope(accepted)),
  /DRAFT_RESOLVER_REQUIRED/)
})
