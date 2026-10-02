import test from 'node:test';
import assert from 'node:assert/strict';
import {composeCurriculumPhase3PPreview,PHASE3P_SCHEMA} from '../editorV2/curriculumPhase3PBridge.js';
import {NEW_AUTHORING_FORMAT,NEW_AUTHORING_MODEL,createNewAuthoringPaperDocument,
 validateNewAuthoringPaperDocument,createNewAuthoringPaperFromWorkspace,
 editNewAuthoringQuestion,editNewAuthoringSection,
 editNewAuthoringMetadata,projectNewAuthoringStudentPreview}
 from '../editorV2/newAuthoringPaperDocumentPhase3R.js';
import {createPhase3QWorkspace,phase3QToggleQuestion,phase3QSwitchType}
 from '../editorV2/curriculumPreparationPhase3Q.js';
import {classifyPaperDocument,DOCUMENT_CLASSIFICATIONS} from '../migration/classifyPaperDocument.js';
import {validateCanonicalPaperDocument} from '../core/PaperDocumentV2.js';
const shaEn='a'.repeat(64),shaUr='b'.repeat(64);
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-bio-pair',edition:'2025-26',syllabusVersion:'ix-2025-26'};
function academic(id,type){
 const enOptions=['A','B','C','D'].map(v=>({id:v,text:id+' '+v}));
 const urOptions=['A','B','C','D'].map(v=>({id:v,text:'اردو '+id+' '+v}));
 return {id,type,marks:type==='mcq'?1:2,medium:'dual',
  chapter:{id:'IX-C1',number:1},topicId:'1.1',curriculum:{...identity},
  content:{en:{stem:'English '+id,answer:type==='mcq'?enOptions[1].text:'Answer '+id,
   ...(type==='mcq'?{options:enOptions}:{})},
   ur:{stem:'اردو '+id,answer:type==='mcq'?urOptions[1].text:'جواب '+id,
   ...(type==='mcq'?{options:urOptions}:{})}},
  correctOptionId:type==='mcq'?'B':null,review:{status:'approved'},
  source:{languages:{en:{pdfSha256:shaEn,page:8,paragraph:'reviewed-heading'},
   ur:{pdfSha256:shaUr,page:9,paragraph:'reviewed-heading'}}}};
}
function projection(){
 const qs=[academic('m1','mcq'),academic('m2','mcq'),academic('s1','short'),academic('s2','short')];
 return {schema:PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
  identity,sourceBookIds:{en:'book-en',ur:'book-ur'},
  sourceChecksums:{en:shaEn,ur:shaUr},selection:{syllabusMode:'full',examYear:null},
  subjects:[{id:'biology9',classId:'nine',syllabusId:'ptb'}],
  chapters:[{id:'IX-C1',subjectId:'biology9',n:1,en:'Introduction',ur:'تعارف',
   topics:[{id:'1.1',en:'Science of Biology',ur:'حیاتیات کی سائنس'}]}],
  questions:qs.map(a=>({id:a.id,subjectId:'biology9',chapterId:a.chapter.id,
   topicId:a.topicId,type:a.type,marks:a.marks,text:a.content.en.stem,
   textUrdu:a.content.ur.stem,options:a.type==='mcq'?a.content.en.options.map((o,i)=>({
    label:o.id,text:o.text,textUrdu:a.content.ur.options[i].text})):[],
   answerEn:a.content.en.answer,answerUrdu:a.content.ur.answer,
   correctOptionId:a.correctOptionId,academicRecord:a}))};
}
const blocks=[{id:'objectives',type:'mcq',questionIds:['m1','m2'],attemptAny:2},
 {id:'shorts',type:'short',questionIds:['s1','s2'],attemptAny:1}];
const handoff=(medium='en')=>composeCurriculumPhase3PPreview({projection:projection(),blocks,medium});
const create=(medium='en')=>createNewAuthoringPaperDocument({
 handoff:handoff(medium),draftId:'draft-academic-001',
 metadata:{title:'First Term Biology',session:'2026-2027'}});
test('new-authoring source identity does not masquerade as migrated V13',()=>{
 const doc=create();assert.equal(doc.format,NEW_AUTHORING_FORMAT);
 assert.equal(doc.documentModel,NEW_AUTHORING_MODEL);assert.equal(doc.schemaVersion,1);
 assert.equal(doc.status,'UNSAVED_LOCAL_DRAFT');assert.equal(doc.totalMarks,4);
 assert.equal(doc.sections.length,2);assert.equal(doc.sourceIdentity.sourcePaperId,null);
 assert.equal(doc.sourceIdentity.sourceDatasetGeneration,null);
 assert.equal(doc.sourceIdentity.authorizationState,'UNVERIFIED_CLIENT_ONLY');
 assert.equal(doc.canonicalV13MigrationClaim,false);assert.equal(doc.printApproved,false);
 assert.equal(validateNewAuthoringPaperDocument(doc).valid,true);
 assert.equal(classifyPaperDocument(doc),DOCUMENT_CLASSIFICATIONS.UNKNOWN);
 assert.equal(validateCanonicalPaperDocument(doc).valid,false);
});
test('original approved bilingual answer/evidence are preserved without source mutation',()=>{
 const h=handoff(),before=JSON.stringify(h);
 const doc=createNewAuthoringPaperDocument({handoff:h,draftId:'draft-source-123'});
 assert.equal(doc.sourceLedger.length,4);
 assert.deepEqual(doc.sourceLedger[0].academicRecord,h.sourceLedger[0].academicRecord);
 assert.equal(doc.sourceLedger[0].academicRecord.content.ur.answer,'اردو m1 B');
 assert.deepEqual(doc.sections.map(s=>s.instruction),['Attempt all','Attempt any 1']);
 assert.equal(JSON.stringify(h),before);
});
test('teacher stem edit flags answer review but leaves original academic record untouched',()=>{
 const doc=create(),after=editNewAuthoringQuestion(doc,{sectionId:'shorts',
  questionId:'s1',patch:{stem:'Custom teacher wording.'}});
 assert.equal(doc.sections[1].items[0].working.stem,'English s1');
 assert.equal(after.sections[1].items[0].working.stem,'Custom teacher wording.');
 assert.equal(after.sections[1].items[0].provenance.academicTextMutated,true);
 assert.equal(after.sections[1].items[0].provenance.answerKeyStatus,'NEEDS_TEACHER_REVIEW');
 assert.equal(after.sourceLedger[2].academicRecord.content.en.stem,'English s1');
 assert.equal(validateNewAuthoringPaperDocument(after).valid,true);
 const restored=editNewAuthoringQuestion(after,{sectionId:'shorts',questionId:'s1',
  patch:{stem:'English s1'}});
 assert.equal(restored.sections[1].items[0].provenance.answerKeyStatus,'SOURCE_VERIFIED');
});
test('MCQ option text can change but option IDs and original academic source stay safe',()=>{
 const doc=create(),opts=structuredClone(doc.sections[0].items[0].working.options);
 opts[0].text='Teacher alternative';
 const after=editNewAuthoringQuestion(doc,{sectionId:'objectives',questionId:'m1',patch:{options:opts}});
 assert.equal(after.sections[0].items[0].provenance.answerKeyStatus,'NEEDS_TEACHER_REVIEW');
 assert.equal(after.sourceLedger[0].academicRecord.content.en.options[0].text,'m1 A');
 assert.throws(()=>editNewAuthoringQuestion(doc,{sectionId:'objectives',questionId:'m1',
  patch:{options:opts.slice(1)}}),/invalid working draft/);
});
test('Attempt Any mixed marks rejects ambiguity; section-wide changes remain consistent',()=>{
 const doc=create();
 assert.throws(()=>editNewAuthoringQuestion(doc,{sectionId:'shorts',questionId:'s1',
  patch:{marks:3}}),/mixed marks/);
 const amended=editNewAuthoringSection(doc,{sectionId:'shorts',marksPerQuestion:3});
 assert.equal(amended.sections[1].totalMarks,3);assert.equal(amended.totalMarks,5);
 assert.equal(amended.sections[1].items[0].provenance.marksMutated,true);
 const all=editNewAuthoringSection(amended,{sectionId:'shorts',attemptAny:2});
 assert.equal(all.totalMarks,8);assert.equal(all.sections[1].instruction,'Attempt all');
 const mixed=editNewAuthoringQuestion(all,{sectionId:'shorts',questionId:'s1',
  patch:{marks:4,responseLines:3}});
 assert.equal(mixed.sections[1].marksPerQuestion,null);
 assert.equal(mixed.sections[1].listedPotentialMarks,7);assert.equal(mixed.totalMarks,9);
 assert.equal(validateNewAuthoringPaperDocument(mixed).valid,true);
});
test('Urdu student preview has questions, no academic answer/evidence leaked',()=>{
 const doc=create('ur'),preview=projectNewAuthoringStudentPreview(doc);
 assert.equal(preview.metadata.language,'urdu');
 assert.equal(preview.sections[0].questions[0].stem,'اردو m1');
 assert.equal(preview.totalMarks,4);assert.equal(preview.printApproved,false);
 const rendered=JSON.stringify(preview);
 for(const forbidden of ['sourceLedger','correctOptionId','sourceChecksums',
  shaEn,'reviewed-heading','academicRecord','جواب m1'])
  assert.equal(rendered.includes(forbidden),false);
});
test('metadata edit leaves protected school, source and class binding unchanged',()=>{
 const doc=create(),changed=editNewAuthoringMetadata(doc,{title:'Monthly Test',session:'2026'});
 assert.equal(changed.metadata.title,'Monthly Test');
 assert.throws(()=>editNewAuthoringMetadata(doc,{schoolName:'Untrusted Name'}),/protected/);
 assert.throws(()=>editNewAuthoringQuestion(doc,{sectionId:'shorts',questionId:'s1',
  patch:{sourceQuestionId:'other'}}),/only independently editable/);
});
test('rejects bad handoff, unapproved record, invalid ID and source hash drift',()=>{
 const h=handoff();
 for(const bad of [
  {...h,status:'LIVE_PRINT_APPROVED'},
  {...h,canonicalV13MigrationClaim:true},
  {...h,sourceLedger:h.sourceLedger.slice(1)},
  {...h,sourceChecksums:{...h.sourceChecksums,en:shaUr}},
  {...h,sourceLedger:h.sourceLedger.map((l,i)=>i===0?{...l,
   academicRecord:{...l.academicRecord,review:{status:'draft'}}}:l)}
 ])assert.throws(()=>createNewAuthoringPaperDocument({handoff:bad,
  draftId:'draft-check-123'}),/Phase3R refused/);
 assert.throws(()=>createNewAuthoringPaperDocument({handoff:h,draftId:'bad ID'}),/Phase3R refused/);
});
test('validator detects mutated totals, option identity and false answer status',()=>{
 const doc=create();
 for(const corrupt of [
  d=>{d.totalMarks=99;},
  d=>{d.sourceIdentity.sourceDatasetGeneration='v13';},
  d=>{d.sections[0].items[0].provenance.answerKeyStatus='INVALID';},
  d=>{d.sections[0].items[0].working.options[0].label='Z';},
  d=>{d.sourceLedger[0].academicRecord.source.languages.ur.pdfSha256='f'.repeat(64);},
  d=>{d.sections[1].items[0].working.stem='silent text change';}
 ]){const changed=structuredClone(doc);corrupt(changed);
  assert.equal(validateNewAuthoringPaperDocument(changed).valid,false);}
});
test('ALP selection keeps its own examined year and full mode is unchanged',()=>{
 const h=handoff();h.selection={syllabusMode:'alp',examYear:2026};
 const doc=createNewAuthoringPaperDocument({handoff:h,draftId:'draft-alp-123'});
 assert.deepEqual(doc.sourceIdentity.selection,{syllabusMode:'alp',examYear:2026});
 const invalid=handoff();invalid.selection={syllabusMode:'alp',examYear:null};
 assert.throws(()=>createNewAuthoringPaperDocument({handoff:invalid,
  draftId:'draft-alp-123'}),/Phase3R refused/);
 assert.equal(create().sourceIdentity.selection.syllabusMode,'full');
});
test('Phase3Q selection flows into new-authoring schema without legacy bank writes',()=>{
 const p=projection();let w=createPhase3QWorkspace(p);
 w=phase3QToggleQuestion(w,p,'m1');
 w=phase3QSwitchType(w,p,'short');
 w=phase3QToggleQuestion(w,p,'s1');
 const doc=createNewAuthoringPaperFromWorkspace({workspace:w,projection:p,
  draftId:'draft-flow-001',metadata:{title:'Live selection copy'}});
 assert.equal(doc.totalMarks,3);
 assert.deepEqual(doc.sections.map(s=>s.kind),['mcq','short']);
 assert.equal(doc.sourceLedger.length,2);
 assert.equal(doc.legacyBankWriteAllowed,false);
 assert.equal(doc.printApproved,false);
 assert.equal(validateNewAuthoringPaperDocument(doc).valid,true);
});
test('tampered metadata values cannot enter a validated new-authoring document',()=>{
 const doc=create();const altered=structuredClone(doc);
 altered.metadata.classLevel=10;
 assert.equal(validateNewAuthoringPaperDocument(altered).valid,false);
 assert.throws(()=>editNewAuthoringMetadata(doc,{durationMinutes:'two hours'}),
  /invalid working draft/);
});
