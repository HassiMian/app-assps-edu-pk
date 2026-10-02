import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHASE3P_SCHEMA} from '../editorV2/curriculumPhase3PBridge.js';
import {createPhase3QWorkspace,phase3QSelectTopic,phase3QSetMedium,phase3QAddBlock,
 phase3QSwitchType,phase3QActivateBlock,phase3QToggleQuestion,phase3QSetAttemptAny,
 phase3QRemoveBlock,phase3QRemoveSelectedQuestion,phase3QMoveSelectedQuestion,
 phase3QTopicMenu,phase3QPreview} from '../editorV2/curriculumPreparationPhase3Q.js';
const q=(id,type,topicId,marks=type==='mcq'?1:2)=>({
 id,type,chapterId:'canonical-ch1',topicId,subjectId:'subject-9',marks,
 text:'English '+id,textUrdu:'اردو '+id,answerEn:'Answer '+id,answerUrdu:'جواب '+id,
 options:type==='mcq'?['A','B','C','D'].map(label=>({label,text:'Answer '+label,textUrdu:'جواب '+label})):[],
 academicRecord:{id,review:{status:'approved'},curriculum:{edition:'2025-26'},
 content:{en:{stem:'English '+id,answer:'Answer '+id},ur:{stem:'اردو '+id,answer:'جواب '+id}},
 source:{languages:{en:{page:8},ur:{page:9}}}}
});
const make=()=>({schema:PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
 identity:{authority:'PECTAA',grade:9,subjectId:'biology',edition:'2025-26'},
 subjects:[{id:'subject-9',classId:'nine',syllabusId:'ptb'}],
 sourceBookIds:{en:'en-book',ur:'ur-book'},
 sourceChecksums:{en:'a'.repeat(64),ur:'b'.repeat(64)},selection:{syllabusMode:'full',examYear:null},
 chapters:[{id:'canonical-ch1',subjectId:'subject-9',n:1,en:'Science of Biology',ur:'حیاتیات کی سائنس',
  topics:[{id:'t1',en:'Scientific Study',ur:'سائنسی مطالعہ'},
  {id:'t2',en:'Scientific Method',ur:'سائنسی طریقہ'}]}],
 questions:[q('mcq1','mcq','t1'),q('mcq2','mcq','t1'),q('short1','short','t1'),
 q('short2','short','t2'),q('short3','short','t2'),q('short4','short','t2'),q('shortX','short','t2',3)]});
test('pending snapshot exposes no demo or draft questions',()=>{
 const pending=createPhase3QWorkspace();assert.equal(pending.status,'WAITING_FOR_APPROVED_SOURCE');
 assert.equal(pending.blocks.length,0);
 const empty=make();empty.questions=[];
 assert.equal(createPhase3QWorkspace(empty).status,'WAITING_FOR_APPROVED_SOURCE');
 const draft=make();draft.questions[0].academicRecord.review.status='draft';
 assert.throws(()=>createPhase3QWorkspace(draft),/complete reviewed Phase3P projection/);
});
test('topic filtering is type-specific, persistent MCQ and Short tabs and live preview',()=>{
 const p=make(),before=JSON.stringify(p);let w=createPhase3QWorkspace(p);
 assert.deepEqual(phase3QTopicMenu(w,p).chapters[0].topics[0].questions.map(x=>x.id),['mcq1','mcq2']);
 w=phase3QToggleQuestion(w,p,'mcq1');assert.equal(phase3QPreview(w,p).composition.totalMarks,1);
 w=phase3QSwitchType(w,p,'short');assert.equal(w.blocks.length,2);
 assert.deepEqual(phase3QTopicMenu(w,p).chapters[0].topics[0].questions.map(x=>x.id),['short1']);
 w=phase3QToggleQuestion(w,p,'short1');
 assert.equal(phase3QPreview(w,p).composition.totalMarks,3);
 w=phase3QSwitchType(w,p,'mcq');assert.deepEqual(w.blocks[0].questionIds,['mcq1']);
 assert.equal(phase3QPreview(w,p).sourceLedger.length,2);
 assert.equal(JSON.stringify(p),before,'source projection remains completely unmodified');
});
test('chapter/topic navigation and restrictions reject off-topic selections',()=>{
 const p=make();let w=createPhase3QWorkspace(p);
 assert.throws(()=>phase3QToggleQuestion(w,p,'short2'),/outside the visible/);
 assert.throws(()=>phase3QSelectTopic(w,p,'made-up','t1'),/not registered/);
 w=phase3QSwitchType(w,p,'short');w=phase3QSelectTopic(w,p,'canonical-ch1','t2');
 w=phase3QToggleQuestion(w,p,'short2');assert.deepEqual(w.blocks[1].questionIds,['short2']);
 assert.equal(phase3QTopicMenu(w,p).chapters[0].topics[1].questions.length,4);
});
test('Attempt Any choice, automatic marks and lossless original answer/source',()=>{
 const p=make();let w=createPhase3QWorkspace(p);
 w=phase3QToggleQuestion(w,p,'mcq1');w=phase3QSwitchType(w,p,'short');
 w=phase3QSelectTopic(w,p,'canonical-ch1','t2');
 for(const id of ['short2','short3','short4'])w=phase3QToggleQuestion(w,p,id);
 w=phase3QSetAttemptAny(w,p,2);
 const out=phase3QPreview(w,p);
 assert.equal(out.composition.totalMarks,5);assert.equal(out.composition.blocks[1].instruction,'Attempt any 2');
 assert.equal(out.sourceLedger.length,4);
 assert.equal(out.sourceLedger[1].academicRecord.id,'short2');
 assert.equal(out.sourceLedger[1].academicRecord.source.languages.ur.page,9);
 assert.equal(out.liveEditorMounted,false);assert.equal(out.canonicalV13MigrationClaim,false);
 assert.equal(out.printApproved,false);assert.equal(out.legacyBankWriteAllowed,false);
});
test('source edition/selection and question catalog replacement invalidates open workspace',()=>{
 const p=make(),w=createPhase3QWorkspace(p),changed=structuredClone(p);
 changed.sourceChecksums.ur='9'.repeat(64);
 assert.throws(()=>phase3QPreview(w,changed),/stale or unapproved/);
 const changedSelection=structuredClone(p);changedSelection.selection={syllabusMode:'alp',examYear:2026};
 assert.throws(()=>phase3QTopicMenu(w,changedSelection),/stale or unapproved/);
 const different=structuredClone(p);different.questions[0].marks=7;
 assert.throws(()=>phase3QToggleQuestion(w,different,'mcq1'),/stale or unapproved/);
 const textDrift=structuredClone(p);textDrift.questions[0].text='Changed without revision';
 assert.throws(()=>phase3QPreview(w,textDrift),/stale or unapproved/);
 const optionsDrift=structuredClone(p);optionsDrift.questions[0].options[0].text='Replaced';
 assert.throws(()=>phase3QPreview(w,optionsDrift),/stale or unapproved/);
 const revisionDrift=structuredClone(p);revisionDrift.revision=2;
 assert.throws(()=>phase3QPreview(w,revisionDrift),/stale or unapproved/);
});
test('reject duplicate selection, mixed marks, out-of-range attempts and wrong media',()=>{
 const p=make();let w=createPhase3QWorkspace(p);
 w=phase3QSwitchType(w,p,'short');w=phase3QSelectTopic(w,p,'canonical-ch1','t2');
 w=phase3QToggleQuestion(w,p,'short2');
 assert.throws(()=>phase3QToggleQuestion(w,p,'shortX'),/different marks/);
 assert.throws(()=>phase3QSetAttemptAny(w,p,2),/Attempt Any/);
 assert.throws(()=>phase3QSetMedium(w,p,'hi'),/EN\/UR/);
 w=phase3QAddBlock(w,p,'short');
 assert.throws(()=>phase3QToggleQuestion(w,p,'short2'),/separate paper blocks/);
 assert.throws(()=>phase3QActivateBlock(w,p,'not-a-block'),/unknown question block/);
});
test('right-side Remove/Reorder works without mutating source and renumbers correctly',()=>{
 const p=make(),original=JSON.stringify(p);let w=createPhase3QWorkspace(p);
 w=phase3QToggleQuestion(w,p,'mcq1');w=phase3QToggleQuestion(w,p,'mcq2');
 w=phase3QMoveSelectedQuestion(w,p,'block-1','mcq2',-1);
 assert.deepEqual(w.blocks[0].questionIds,['mcq2','mcq1']);
 let out=phase3QPreview(w,p);
 assert.deepEqual(out.composition.blocks[0].questions.map(x=>x.questionId),['mcq2','mcq1']);
 assert.deepEqual(out.composition.blocks[0].questions.map(x=>x.number),[1,2]);
 w=phase3QRemoveSelectedQuestion(w,p,'block-1','mcq2');
 assert.deepEqual(w.blocks[0].questionIds,['mcq1']);
 assert.equal(JSON.stringify(p),original);
});
test('Urdu selection and MCQ original options survive the full Phase3P composition',()=>{
 const p=make();let w=createPhase3QWorkspace(p);
 w=phase3QSetMedium(w,p,'ur');w=phase3QToggleQuestion(w,p,'mcq1');
 const out=phase3QPreview(w,p);
 assert.equal(out.composition.blocks[0].questions[0].text,'اردو mcq1');
 assert.deepEqual(out.composition.blocks[0].questions[0].options.map(x=>x.text),['جواب A','جواب B','جواب C','جواب D']);
 assert.deepEqual(out.sourceLedger[0].academicRecord,p.questions[0].academicRecord);
});
test('empty blocks are omitted from preview, last editor block cannot be deleted',()=>{
 const p=make();let w=createPhase3QWorkspace(p);
 assert.equal(phase3QPreview(w,p).status,'EMPTY_UNSAVED_PREVIEW');
 assert.throws(()=>phase3QRemoveBlock(w,p,'block-1'),/at least one/);
 w=phase3QToggleQuestion(w,p,'mcq1');w=phase3QAddBlock(w,p,'long');
 assert.equal(phase3QPreview(w,p).composition.blocks.length,1);
 w=phase3QRemoveBlock(w,p,'block-2');assert.equal(w.blocks.length,1);
});
test('UI stays dormant: no network/browser persistence/production route injection',()=>{
 const src=readFileSync(new URL('../editorV2/CurriculumPaperStudioPhase3Q.jsx',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../editorV2/curriculumPreparationPhase3Q.js',import.meta.url),'utf8');
 assert.match(src,/data-phase3q-paper-studio/);assert.match(src,/Live Paper/);
 assert.doesNotMatch(src+engine,/fetch\(|axios|localStorage|window\.|savePaper\(|print\(/);
});
