import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASE3O_QUESTION_MENU,buildRegisteredTopicMenu,composeTopicPaperBlocks}
 from '../editorV2/topicQuestionComposerPhase3O.js';
const subjects=[{id:'bio9',classId:'nine',syllabusId:'ptb',name:'Biology'},
 {id:'bio10',classId:'ten',syllabusId:'ptb',name:'Biology'}];
const chapters=[{id:'bio9_c1',subjectId:'bio9',n:1,en:'Introduction to Biology',ur:'حیاتیات کا تعارف',
 topics:[{id:'bio9_c1_t1',en:'Biology',ur:'حیاتیات'},
  {id:'bio9_c1_t2',en:'Branches of Biology',ur:'حیاتیات کی شاخیں'}]},
 {id:'bio10_c1',subjectId:'bio10',n:1,en:'Gaseous Exchange',ur:'گیسی تبادلہ',
 topics:[{id:'bio10_c1_t1',en:'Respiration',ur:'تنفس'}]}];
const option=(v)=>({label:v,text:'Answer '+v,textUrdu:'جواب '+v,textHindi:'उत्तर '+v});
const questions=[
 {id:'m1',subjectId:'bio9',type:'mcq',chapter:'Introduction to Biology',
  topic:'Biology',text:'What is biology?',textUrdu:'حیاتیات کیا ہے؟',
  options:['A','B','C','D'].map(option),marks:1},
 {id:'m2',subjectId:'bio9',type:'mcq',chapter:'bio9_c1',topicId:'bio9_c1_t2',
  text:'What is its branch?',textUrdu:'اس کی شاخ کون سی ہے؟',
  options:['A','B','C','D'].map(option),marks:1},
 {id:'s1',subjectId:'bio9',type:'short',chapter:'Introduction to Biology',
  topic:'Biology',text:'Define biology.',textUrdu:'حیاتیات کی تعریف کریں۔',marks:2},
 {id:'s2',subjectId:'bio9',type:'short',chapter:'Introduction to Biology',
  topic:'Branches of Biology',text:'List branches.',textUrdu:'شاخیں لکھیں۔',marks:2},
 {id:'legacy',subjectId:'bio9',type:'short',chapter:'Introduction to Biology',
  topic:'Unverified proposed topic',text:'Unmapped question.',marks:2},
 {id:'off',subjectId:'bio10',type:'short',chapter:'Gaseous Exchange',
  topic:'Respiration',text:'Explain respiration.',marks:2},
];
const base={subjects,chapters,questions,subjectId:'bio9'};
const compose=blocks=>composeTopicPaperBlocks({...base,medium:'en',blocks});
test('question menu supports independently chosen MCQ, short and long blocks',()=>{
 assert.ok(['mcq','short','long'].every(t=>PHASE3O_QUESTION_MENU.includes(t)));
});
test('registered topics show only correct subject AND selected question type',()=>{
 const mcq=buildRegisteredTopicMenu({...base,type:'mcq'});
 assert.deepEqual(mcq.chapters[0].topics.map(t=>t.questions.map(q=>q.id)),[['m1'],['m2']]);
 assert.equal(mcq.legacyUnmapped,undefined);
 const shorts=buildRegisteredTopicMenu({...base,type:'short'});
 assert.deepEqual(shorts.chapters[0].topics.map(t=>t.questions.map(q=>q.id)),[['s1'],['s2']]);
 assert.equal(shorts.needsMapping,1);
 assert.deepEqual(shorts.chapters[0].unmapped.map(t=>t.id),['legacy']);
 assert.equal(shorts.outside.length,0);
});
test('paper blocks preserve original questions, multiple short choice blocks and auto totals',()=>{
 const before=JSON.stringify(questions);
 const out=compose([
  {id:'mcq-A',type:'mcq',questionIds:['m1','m2'],attemptAny:2},
  {id:'short-A',type:'short',questionIds:['s1','s2'],attemptAny:1},
 ]);
 assert.equal(out.totalMarks,4);
 assert.deepEqual(out.blocks.map(b=>b.totalMarks),[2,2]);
 assert.equal(out.blocks[1].instruction,'Attempt any 1');
 assert.deepEqual(out.blocks[1].questions.map(x=>x.number),[1,2]);
 assert.equal(out.sourcePaperUpdated,false);
 assert.equal(out.existingQuestionBankMutated,false);
 assert.equal(JSON.stringify(questions),before);
});
test('wrong class/subject, invented topic, duplicate question or block fails closed',()=>{
 for(const wrong of [
  [{id:'a',type:'short',questionIds:['legacy'],attemptAny:1}],
  [{id:'a',type:'short',questionIds:['off'],attemptAny:1}],
  [{id:'a',type:'short',questionIds:['s1','s1'],attemptAny:1}],
  [{id:'a',type:'short',questionIds:['s1'],attemptAny:1},
   {id:'a',type:'short',questionIds:['s2'],attemptAny:1}],
  [{id:'a',type:'mcq',questionIds:['s1'],attemptAny:1}],
 ])assert.throws(()=>compose(wrong),/Phase3O refused/u);
});

test('invalid attempt-any and unauthorized marks changes do not silently change source totals',()=>{
 for(const block of [
  {id:'a',type:'short',questionIds:['s1','s2'],attemptAny:0},
  {id:'a',type:'short',questionIds:['s1','s2'],attemptAny:3},
  {id:'a',type:'short',questionIds:['s1'],attemptAny:1,marksPerQuestion:10},
 ])assert.throws(()=>compose([block]),/Phase3O refused/u);
});
test('missing original Urdu/Hindi text or MCQ option fails, never fabricate translation',()=>{
 const hi=()=>composeTopicPaperBlocks({...base,medium:'hi',
  blocks:[{id:'a',type:'short',questionIds:['s1'],attemptAny:1}]});
 assert.throws(hi,/unavailable original question language/u);
 const broken=questions.map(q=>q.id==='m1'?{...q,options:q.options.map((o,i)=>
  i===2?{...o,textUrdu:''}:o)}:q);
 assert.throws(()=>composeTopicPaperBlocks({...base,questions:broken,medium:'ur',
  blocks:[{id:'a',type:'mcq',questionIds:['m1'],attemptAny:1}]}),/MCQ options required/u);
});
test('exact English and Urdu Question Bank source fields are retained without text rewriting',()=>{
 const output=composeTopicPaperBlocks({...base,medium:'ur',
  blocks:[{id:'short-urdu',type:'short',questionIds:['s1'],attemptAny:1}]});
 assert.equal(output.blocks[0].questions[0].text,'حیاتیات کی تعریف کریں۔');
 assert.equal(output.blocks[0].medium,'ur');
 const ur=buildRegisteredTopicMenu({...base,type:'short',medium:'ur'});
 assert.equal(ur.chapters[0].title,'حیاتیات کا تعارف');
 assert.equal(ur.chapters[0].topics[0].title,'حیاتیات');
});
test('reject nonregistered or ambiguous curriculum references rather than mislabeling them',()=>{
 assert.throws(()=>buildRegisteredTopicMenu({...base,subjectId:'nonexistent'}),/unknown school subject/u);
 assert.throws(()=>buildRegisteredTopicMenu({...base,type:'mcq',medium:'fake'}),/registered subject/u);
 const repeated=[...chapters,{id:'different',subjectId:'bio9',n:2,en:'Other',ur:'دیگر',
  topics:[{id:'bio9_c1_t1',en:'Duplicated ID',ur:'مکرر'}]}];
 assert.throws(()=>buildRegisteredTopicMenu({...base,chapters:repeated,type:'mcq'}),/cross-chapter duplicate/u);
});

test('real registered 2026 PTB Grade 9 and 10 Biology chapter structures stay separate',async()=>{
 const {SUBJECTS,CHAPTERS}=await import('../../data/questionBank.js');
 const nine=buildRegisteredTopicMenu({subjects:SUBJECTS,chapters:CHAPTERS,
  questions:[],subjectId:'bio9',type:'short',medium:'en'});
 const ten=buildRegisteredTopicMenu({subjects:SUBJECTS,chapters:CHAPTERS,
  questions:[],subjectId:'bio10',type:'mcq',medium:'ur'});
 assert.equal(nine.classId,'nine');assert.equal(ten.classId,'ten');
 assert.ok(nine.chapters.length>0);
 assert.equal(ten.chapters.length,0,'Grade 10 Biology has no verified chapter source entries yet'); assert.equal(ten.missingVerifiedChapterCatalog,true); assert.equal(nine.missingVerifiedChapterCatalog,false);
 assert.ok(nine.chapters.every(ch=>ch.meta.subjectId==='bio9'));
 assert.ok(ten.chapters.every(ch=>ch.meta.subjectId==='bio10'));
 assert.ok(nine.chapters.every(ch=>ch.topics.every(t=>t.id.startsWith('bio9_'))));
});
test('visual selector is intentionally dormant, independently keyed by topic and block',async()=>{
 const fs=await import('node:fs');
 const path=await import('node:path');
 const ui=fs.readFileSync(new URL('../editorV2/TopicQuestionSelectorPhase3O.jsx',import.meta.url),'utf8');
 assert.match(ui,/data-phase3o-topic-selector/);
 assert.match(ui,/data-topic-id/);
 assert.match(ui,/PHASE3O_QUESTION_MENU/);
 assert.match(ui,/composeTopicPaperBlocks/);
 assert.match(ui,/Preview selected paper blocks \(no save\)/);
 const route=fs.readFileSync(new URL('../editorV2/PaperEditorRouter.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(route,/TopicQuestionSelectorPhase3O/u);
 assert.doesNotMatch(ui,/fetch\(|axios|localStorage|window\.|savePaper\(/u);
});
