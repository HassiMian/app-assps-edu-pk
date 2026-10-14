import test from 'node:test'
import assert from 'node:assert/strict'
import {
 grade910ClassNumber,adaptVerifiedPaperRecord,verifyWorkspaceApprovedImports,requireVerifiedResolution,createGrade910ApprovedSection,rehydrateGrade910VerifiedPaper
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
