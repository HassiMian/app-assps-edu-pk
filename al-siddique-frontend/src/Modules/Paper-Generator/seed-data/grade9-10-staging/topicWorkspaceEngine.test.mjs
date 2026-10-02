import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newTopicDraft,projectTopicTree,validateQuestionBlocks,topicIdentity,viewLanguage} from './topicWorkspaceEngine.mjs';
const ledger=JSON.parse(readFileSync(new URL('./biology9EnglishEvidenceLedger.json',import.meta.url)));
const urduLedger=JSON.parse(readFileSync(new URL('./biology9UrduEvidenceLedger.json',import.meta.url)));
const ch1=ledger.chapters[0],ch2=ledger.chapters[1],topic1=ch1.topics[0],topic2=ch2.topics[0];
const draft=(id,changes={})=>newTopicDraft({id,ledger,urduLedger,chapterId:ch1.id,topicId:topic1.id,
 type:'short',origin:'conceptual',en:'Explain an original concept.',answerEn:'Source-bound model answer.',marks:2,evidencePage:6,
 ...changes});
test('original topic-authored questions retain a stable verified chapter/topic binding',()=>{
 const d=draft('D1');
 assert.equal(d.valid,true);assert.equal(d.question.topicId,'1.1');
 assert.equal(d.question.review.status,'draft');
 assert.equal(d.question.source.catalogRecordId,'pectaa-catalog-009');
 assert.equal(d.question.source.exerciseRef,null);
 assert.equal(d.question.syllabusScope.alpStatus,'unverified');
});
test('identical topic titles in separate chapters never merge into one group',()=>{
 const fixture=structuredClone(ledger);
 const second=fixture.chapters[1].topics[0];
 second.title=fixture.chapters[0].topics[0].title;
 second.verifiedPhysicalStartPage=25;second.verifiedPhysicalEndPage=26;second.pageAuditStatus='VISUALLY_CHECKED';
 const a=newTopicDraft({id:'A',ledger:fixture,chapterId:fixture.chapters[0].id,topicId:fixture.chapters[0].topics[0].id,
  type:'short',origin:'conceptual',en:'First chapter question',answerEn:'Answer A',marks:2,evidencePage:6}).question;
 const b=newTopicDraft({id:'B',ledger:fixture,chapterId:fixture.chapters[1].id,topicId:second.id,
  type:'short',origin:'additional',en:'Other chapter question',answerEn:'Other answer',marks:2,evidencePage:25}).question;
 assert.ok(a&&b);assert.notEqual(topicIdentity(a),topicIdentity(b));
 const tree=projectTopicTree({ledger:fixture,questions:[a,b],type:'short',showEmptyTopics:false});
 assert.equal(tree[0].topics[0].questions.length,1);assert.equal(tree[1].topics[0].questions.length,1);
 assert.equal(tree[0].count,1);assert.equal(tree[1].count,1);
});
test('question type and editorial flags are independent of origin',()=>{
 const a=draft('A',{importance:true,importanceReason:'Source-specified core objective',traditional:true}).question;
 const b=draft('B',{type:'long',origin:'additional'}).question;
 assert.deepEqual(projectTopicTree({ledger,questions:[a,b],type:'short',importantOnly:true,traditionalOnly:true,
  showEmptyTopics:false}).flatMap(c=>c.topics.flatMap(t=>t.questions.map(q=>q.id))),['A']);
 assert.deepEqual(projectTopicTree({ledger,questions:[a,b],type:'long',origin:'additional',
  showEmptyTopics:false}).flatMap(c=>c.topics.flatMap(t=>t.questions.map(q=>q.id))),['B']);
});
test('exercise cannot masquerade as a topic-authored conceptual origin',()=>{
 assert.equal(draft('bad',{origin:'exercise'}).valid,false);
 assert.equal(draft('bad2',{origin:'conceptual',exerciseRef:'EX-1'}).valid,false);
 assert.equal(draft('bad3',{importance:true}).valid,false);
});
test('MCQ retains ONE correct option ID across all author languages',()=>{
 const d=draft('MCQ',{type:'mcq',en:'Which branch studies tissues?',answerEn:'',
  optEn:['Zoology','Histology','Ecology','Genetics'],correctOptionId:'B',
  ur:'بافتوں کا مطالعہ کون سی شاخ کرتی ہے؟',urduEvidencePage:5,optUr:['علم حیوانات','علم الانسجہ','ماحولیات','جینیات'],
  hi:'ऊतकों का अध्ययन कौन करता है?',optHi:['प्राणि विज्ञान','ऊतक विज्ञान','पारिस्थितिकी','आनुवंशिकी']});
 assert.equal(d.valid,true);
 assert.equal(d.question.correctOptionId,'B');
 for(const lang of ['en','ur','hi']){
  assert.deepEqual(d.question.content[lang].options.map(o=>o.id),['A','B','C','D']);
  assert.equal(d.question.content[lang].answer,d.question.content[lang].options[1].text);
 }
 assert.equal(d.question.review.checks.hindi,false);
 assert.equal(draft('badMCQ',{type:'mcq',en:'Which?',answerEn:'',optEn:['A','','C','D']}).valid,false);
});
test('optional Urdu/Hindi draft views do not imply approved translation',()=>{
 const q=draft('D1',{ur:'تجزیاتی سوال',answerUr:'جواب',urduEvidencePage:5,hi:'नमूना प्रश्न',answerHi:'उत्तर'}).question;
 assert.equal(viewLanguage(q,'dual'),true);
 assert.equal(viewLanguage(q,'hi'),true);
 assert.equal(q.review.checks.translation,false);
 assert.equal(q.review.checks.hindi,false);
});
test('multiple attempt-any blocks recalculate and reject duplicate or mixed marks',()=>{
 const a=draft('A').question,b=draft('B').question,c=draft('C',{type:'long',marks:5}).question;
 const x=validateQuestionBlocks([{type:'short',questionIds:['A','B'],attemptAny:1},
  {type:'long',questionIds:['C'],attemptAny:1}],[a,b,c]);
 assert.equal(x.valid,true);assert.equal(x.totalMarks,7);
 assert.equal(x.sections[0].totalMarks,2);
 const dup=validateQuestionBlocks([{type:'short',questionIds:['A','B'],attemptAny:2},
  {type:'short',questionIds:['A'],attemptAny:1}],[a,b,c]);
 assert.equal(dup.valid,false);assert.match(dup.errors.join('|'),/Duplicate question identity/);
 assert.equal(validateQuestionBlocks([{type:'short',questionIds:['A','C'],attemptAny:1}],[a,c]).valid,false);
});
test('every author-origin draft needs a real source page and complete optional translated answer',()=>{
 assert.equal(draft('missing',{evidencePage:null}).valid,false);
 assert.equal(draft('out-of-range',{evidencePage:181}).valid,false);
 assert.equal(draft('bad-level',{difficulty:'guessed'}).valid,false);
 assert.equal(draft('missingUrduKey',{ur:'نمونہ سوال',answerUr:''}).valid,false);
 assert.equal(draft('missingHindiKey',{hi:'नमूना प्रश्न',answerHi:''}).valid,false);
 assert.equal(draft('clean',{evidencePage:7}).valid,true);
});
