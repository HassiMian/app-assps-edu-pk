import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectTopicTree,validateQuestionBlocks} from './topicWorkspaceEngine.mjs';
const ledger=JSON.parse(readFileSync(new URL('./biology9EnglishEvidenceLedger.json',import.meta.url)));
const examples=JSON.parse(readFileSync(new URL('./biology9TopicResearchDrafts.json',import.meta.url)));
test('topic-authored samples are sourced ORIGINAL, never textbook exercise or live seed',()=>{
 assert.equal(examples.drafts.length,6);
 assert.equal(examples.publicationAllowed,false);assert.equal(examples.liveImportAllowed,false);
 assert.deepEqual(examples.verifiedReadingPages,[6,7]);
 assert.ok(examples.drafts.every(q=>q.chapter.id===ledger.chapters[0].id&&q.topicId==='1.1'
  &&q.source.pdfSha256===ledger.source.pdfSha256&&[6,7].includes(q.source.page)
  &&q.source.exerciseRef===null&&q.review.status==='draft'&&q.syllabusScope.alpStatus==='unverified'));
 assert.equal(examples.drafts.filter(q=>q.type==='mcq'&&q.origin==='additional').length,2);
 assert.equal(examples.drafts.filter(q=>q.type==='short'&&q.origin==='conceptual').length,4);
});
test('question-type-first UI engine independently projects MCQs/shorts under topic 1.1',()=>{
 const opts={ledger,questions:examples.drafts,showEmptyTopics:false};
 const mcq=projectTopicTree({...opts,type:'mcq',language:'dual'});
 const shorts=projectTopicTree({...opts,type:'short'});
 assert.equal(mcq.length,1);assert.equal(mcq[0].topics.length,1);assert.equal(mcq[0].topics[0].questions.length,2);
 assert.equal(shorts[0].topics[0].questions.length,4);
 assert.equal(projectTopicTree({...opts,type:'short',language:'dual'}).length,0);
 assert.equal(projectTopicTree({...opts,type:'mcq',language:'hi'})[0].topics[0].questions.length,2);
});
test('research sample MCQ option IDs and keys are stable across original draft languages',()=>{
 for(const q of examples.drafts.filter(q=>q.type==='mcq')){
  const ids=q.content.en.options.map(o=>o.id);
  assert.deepEqual(ids,['A','B','C','D']);
  for(const language of ['ur','hi']){
   assert.deepEqual(q.content[language].options.map(o=>o.id),ids);
   assert.equal(q.content[language].answer,q.content[language].options.find(o=>o.id===q.correctOptionId).text);
  }
  assert.equal(q.review.checks.translation,false);assert.equal(q.review.checks.hindi,false);
 }
});
test('sample paper preview has correct weighted attempt-any marks and no publication claim',()=>{
 const short=examples.drafts.filter(q=>q.type==='short'),mcq=examples.drafts.filter(q=>q.type==='mcq');
 const r=validateQuestionBlocks([{type:'mcq',questionIds:mcq.map(q=>q.id),attemptAny:2},
  {type:'short',questionIds:short.map(q=>q.id),attemptAny:3}],examples.drafts);
 assert.equal(r.valid,true);assert.equal(r.totalMarks,8);
});
