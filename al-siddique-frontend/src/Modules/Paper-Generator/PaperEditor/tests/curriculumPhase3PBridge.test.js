import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectCurriculumSupervisedPhase3P,composeCurriculumPhase3PPreview,PHASE3P_SCHEMA}
 from '../editorV2/curriculumPhase3PBridge.js';

const E='a'.repeat(64),U='b'.repeat(64),A='c'.repeat(64);
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'IX-BIO-PAIR',edition:'2025-26',syllabusVersion:'ix-2025-26'};
const schoolSubject={id:'bio9',classId:'nine',syllabusId:'ptb',curriculumBinding:identity};
const chapter=(lang)=>({id:'IX-BIO-C01',number:1,title:lang==='en'?'The Science of Biology':'حیاتیات کی سائنس',
 topics:[{id:'1.1',title:lang==='en'?'Biology and its Branches':'حیاتیات اور اس کی شاخیں',
 pageStart:5,pageEnd:16,exerciseRefs:[]},
 {id:'1.2',title:lang==='en'?'Scientific Method':'سائنسی طریقہ',
 pageStart:17,pageEnd:28,exerciseRefs:[]}]});
const manifest={entries:['en','ur'].map(lang=>({
 recordId:'BOOK-'+lang,grade:9,subjectId:'biology',edition:'2025-26',
 syllabusVersion:'ix-2025-26',medium:lang,downloadStatus:'VERIFIED_PDF',
 pdfSha256:lang==='en'?E:U,pdfUrl:'https://example.test/'+lang+'.pdf',chapterIndexStatus:'VERIFIED',
 exerciseIndexStatus:'VERIFIED',chapterIndex:[chapter(lang)]}))};
const clone=v=>JSON.parse(JSON.stringify(v));
const question=(type='short',id='Q-PERM-001')=>({
 id,type,authorId:'author-a',curriculum:{...identity,catalogRecordIds:{en:'BOOK-en',ur:'BOOK-ur'}},
 chapter:{id:'IX-BIO-C01',number:1},topicId:'1.1',
 origin:'conceptual',difficulty:'medium',difficultyRationale:'Reasoning across two terms',
 marks:type==='mcq'?1:2,medium:'dual',importance:{selected:true,reason:'Core learning objective'},
 editorial:{traditional:true},source:{officialUrl:'https://example.test/book.pdf',page:8,
  languages:{en:{pdfSha256:E,page:8},ur:{pdfSha256:U,page:9}}},
 content:type==='mcq'?{
  en:{stem:'Original English MCQ?',answer:'Second answer',
   options:['A','B','C','D'].map((id,i)=>({id,text:['First','Second answer','Third','Fourth'][i]}))},
  ur:{stem:'اصل اردو سوال؟',answer:'دوسرا جواب',
   options:['A','B','C','D'].map((id,i)=>({id,text:['پہلا','دوسرا جواب','تیسرا','چوتھا'][i]}))}
 }:{en:{stem:'Explain the original verified topic.',answer:'Preserve the full English answer.'},
    ur:{stem:'اصل موضوع کی وضاحت کریں۔',answer:'اصل مکمل اردو جواب محفوظ رکھیں۔'}},
 correctOptionId:type==='mcq'?'B':null,
 syllabusScope:{coverage:'full-textbook',alpStatus:'unverified'},boardEvidence:[],
 review:{status:'approved',checks:{source:true,academic:true,answer:true,english:true,
  urdu:true,translation:true,syllabus:true,duplicate:true},reviewers:{academic:'reviewer-b'}}
});
function wrap(q){
 const options=q.type==='mcq'?q.content.en.options.map((o,i)=>({
  id:o.id,label:o.id,text:o.text,textUrdu:q.content.ur.options[i].text})):[];
 return {id:q.id,candidate:{
  id:q.id,subjectId:'bio9',type:q.type,source:'assps-curriculum-approved-v2',
  chapterId:q.chapter.id,topicId:q.topicId,marks:q.marks,
  text:q.content.en.stem,textUrdu:q.content.ur.stem,
  answer:q.type==='mcq'?q.correctOptionId:q.content.en.answer,
  answerUrdu:q.type==='mcq'?q.correctOptionId:q.content.ur.answer,
  correctOptionId:q.correctOptionId,options,curriculumQuestion:clone(q)}};
}
function reviewed(...qs){return {mode:'SUPERVISED_REVIEW_ONLY_NO_COMMIT',directCommitAllowed:false,
 bankCoverage:'full-textbook',selection:{syllabusMode:'full',examYear:null},
 ready:qs.map(wrap),rejected:[],counts:{academicallyReady:qs.length}};}
let verified=0;
const academicAudit=(q,m,selection)=>{
 verified++;
 return {valid:q.review?.status==='approved'&&m===manifest&&selection.syllabusMode==='full',errors:[]};
};
const project=(review,changes={})=>projectCurriculumSupervisedPhase3P({
 review,manifest,schoolSubject,identity,auditPublicationCandidate:academicAudit,...changes});

test('projects approved bilingual academic record without replacing original source data',()=>{
 const q=question(),before=JSON.stringify(q),r=reviewed(q),originalReview=JSON.stringify(r);
 const x=project(r);
 assert.equal(x.schema,PHASE3P_SCHEMA);assert.equal(verified>0,true);
 assert.equal(x.questions[0].id,q.id);assert.equal(x.questions[0].text,q.content.en.stem);
 assert.equal(x.questions[0].answerUrdu,q.content.ur.answer);
 assert.deepEqual(x.questions[0].academicRecord,q);
 assert.deepEqual(x.chapters[0].topics.map(t=>t.id),['1.1','1.2']);
 assert.equal(x.sourceChecksums.en,E);assert.equal(x.sourceChecksums.ur,U);
 assert.equal(x.legacyBankWriteAllowed,false);
 assert.equal(JSON.stringify(q),before);assert.equal(JSON.stringify(r),originalReview);
});
test('existing Phase3O composes exact source questions while Phase3P retains all metadata',()=>{
 const qs=[question('short'),question('short','Q-PERM-002'),question('mcq','Q-PERM-MCQ')];
 qs[1].content.en.stem='Compare the original evidence.';
 qs[1].content.ur.stem='اصل شواہد کا موازنہ کریں۔';
 const x=project(reviewed(...qs));
 const blocks=[{id:'choice',type:'short',questionIds:['Q-PERM-001','Q-PERM-002'],attemptAny:1},
  {id:'objective',type:'mcq',questionIds:['Q-PERM-MCQ'],attemptAny:1}];
 const result=composeCurriculumPhase3PPreview({projection:x,blocks,medium:'ur'});
 assert.equal(result.composition.totalMarks,3);
 assert.equal(result.composition.blocks[0].instruction,'Attempt any 1');
 assert.equal(result.composition.blocks[0].questions[0].text,qs[0].content.ur.stem);
 assert.deepEqual(result.composition.blocks[1].questions[0].options.map(o=>o.label),['A','B','C','D']);
 assert.equal(result.sourceLedger.length,3);
 assert.deepEqual(result.sourceLedger[0].academicRecord,qs[0]);
 assert.equal(result.sourceLedger[0].academicRecord.source.languages.ur.pdfSha256,U);
 assert.equal(result.sourceLedger[0].academicRecord.importance.reason,'Core learning objective');
 assert.equal(result.status,'UNSAVED_PREVIEW_AWAITING_NEW_AUTHORING_PAPERDOCUMENT_ADAPTER');
 assert.equal(result.canonicalV13MigrationClaim,false);
 assert.equal(result.liveEditorMounted,false);
});
test('rejects draft, omitted authority callback, forged review or mismatched cohort',()=>{
 const q=question(),review=reviewed(q);
 const cases=[
  ()=>project(review,{auditPublicationCandidate:null}),
  ()=>project({...review,directCommitAllowed:true}),
  ()=>project(review,{identity:{...identity,grade:10}}),
  ()=>project(review,{schoolSubject:{...schoolSubject,id:'bio10'}}),
  ()=>project(review,{auditPublicationCandidate:()=>({valid:false,errors:['pending']})}),
  ()=>project(reviewed({...q,review:{status:'draft'}})),
  ()=>project(review,{manifest:{entries:manifest.entries.map(e=>({...e,chapterIndexStatus:'PENDING'}))}})
 ];
 for(const failure of cases)assert.throws(failure,/Phase3P refused/);
});
test('rejects academic identity drift, stale flat fields, incorrect options, missing topic and duplicate IDs',()=>{
 const q=question(),altered=reviewed(q);
 altered.ready[0].candidate.text='Quietly replaced question';
 assert.throws(()=>project(altered),/display fields changed/);
 const badTopic=question();badTopic.topicId='999.1';
 assert.throws(()=>project(reviewed(badTopic)),/verified chapter\/topic/);
 const badHash=question();badHash.source.languages.ur.pdfSha256=A;
 assert.throws(()=>project(reviewed(badHash)),/source hash\/page/);
 assert.throws(()=>project(reviewed(q,q)),/duplicate permanent/);
 const mcq=reviewed(question('mcq'));mcq.ready[0].candidate.options[2].textUrdu='changed';
 assert.throws(()=>project(mcq),/option\/correct-answer drift/);
 const unsupported=question('poetry');
 assert.throws(()=>project(reviewed(unsupported)),/not supported by Phase3O/);
});
test('ALP selection is fail-closed and does not alter Full textbook projection',()=>{
 const q=question(),r=reviewed(q);
 assert.equal(project(r).selection.syllabusMode,'full');
 assert.throws(()=>project(r,{syllabusMode:'alp',examYear:2026}),/mismatched supervised selection/);
 const alp={...r,selection:{syllabusMode:'alp',examYear:2026}};
 assert.throws(()=>project(alp,{syllabusMode:'alp',examYear:2026,
  auditPublicationCandidate:()=>({valid:false,errors:['ALP evidence unverified']})}),/publication audit rejected/);
});
test('cannot compose unknown, duplicate or cross-type question IDs; route remains dormant',()=>{
 const x=project(reviewed(question()));
 for(const blocks of [
  [{id:'a',type:'short',questionIds:['not-approved'],attemptAny:1}],
  [{id:'a',type:'long',questionIds:['Q-PERM-001'],attemptAny:1}],
  [{id:'a',type:'short',questionIds:['Q-PERM-001','Q-PERM-001'],attemptAny:1}]
 ])assert.throws(()=>composeCurriculumPhase3PPreview({projection:x,blocks}),/Phase3O refused/);
 assert.throws(()=>composeCurriculumPhase3PPreview({projection:x,
  blocks:[{id:'x',type:'short',questionIds:['Q-PERM-001'],attemptAny:1}],medium:'hi'}),/Phase3P refused/);
 const source=readFileSync(new URL('../editorV2/curriculumPhase3PBridge.js',import.meta.url),'utf8');
 const route=readFileSync(new URL('../editorV2/PaperEditorRouter.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(route,/curriculumPhase3PBridge|TopicQuestionSelectorPhase3O/);
 assert.doesNotMatch(source,/localStorage|fetch\(|axios|savePaper\(|insertInto|\.\.[/\\]\.\.[/\\]\.\.[/\\]ASSPS_GRADE9/u);
});
