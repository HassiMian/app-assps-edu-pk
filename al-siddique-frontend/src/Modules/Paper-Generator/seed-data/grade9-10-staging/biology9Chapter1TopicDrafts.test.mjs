import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateQuestion,selectApprovedQuestions,duplicateDiagnostics} from './questionContract.mjs';
import {projectTopicTree,validateQuestionBlocks} from './topicWorkspaceEngine.mjs';
import {dryRunStaging} from './releaseAudit.mjs';
import {buildCurriculumSupervisedReview} from './curriculumSupervisedAdapter.mjs';
const json=name=>JSON.parse(readFileSync(new URL('./'+name,import.meta.url)));
const batch=json('biology9Chapter1TopicDrafts.json'),en=json('biology9EnglishEvidenceLedger.json');
const ur=json('biology9UrduEvidenceLedger.json'),old=json('biology9TopicResearchDrafts.json');
const manifest=json('officialSourceManifest.json');
const ids=tree=>tree.flatMap(c=>c.topics.flatMap(t=>t.questions.map(q=>q.id)));
test('full-book batch covers eight topics with original Additional/Conceptual drafts',()=>{
 assert.deepEqual(batch.totals,{drafts:48,approved:0,mcq:16,short:26,long:6,additional:38,conceptual:10,exercise:0});
 assert.equal(batch.drafts.length,48);assert.equal(batch.topicCoverage.length,8);
 assert.equal(batch.publicationAllowed,false);assert.equal(batch.liveImportAllowed,false);
 assert.equal(new Set(batch.drafts.map(q=>q.id)).size,48);
 assert.deepEqual([...new Set(batch.drafts.map(q=>q.topicId))],en.chapters[0].topics.map(t=>t.id));
 for(const t of batch.topicCoverage){
  for(const type of ['mcq','short','long'])assert.equal(t[type],batch.drafts.filter(q=>q.topicId===t.topicId&&q.type===type).length);
  assert.equal(t.exercise,0);assert.match(t.coverageStatus,/NOT_EXHAUSTIVE/);
 }
 assert.deepEqual(duplicateDiagnostics([...old.drafts,...batch.drafts]),[]);
});
test('every new question keeps one bilingual identity and separately bound source evidence',()=>{
 for(const q of batch.drafts){
  assert.equal(validateQuestion(q).valid,true,q.id);
  assert.equal(q.medium,'dual');assert.equal(q.chapter.id,en.chapters[0].id);
  for(const [language,ledger] of [['en',en],['ur',ur]]){
   const s=q.source.languages[language],t=ledger.chapters[0].topics.find(t=>t.id===q.topicId);
   assert.equal(s.pdfSha256,ledger.source.pdfSha256);assert.ok(s.anchor.length>0);
   for(const p of s.pages)assert.ok(p>=t.verifiedPhysicalStartPage&&p<=t.verifiedPhysicalEndPage,q.id);
   assert.ok(s.pages.includes(s.page),q.id);assert.ok(q.content[language].stem&&q.content[language].answer);
  }
  assert.equal(q.source.exerciseRef,null);assert.equal(q.syllabusScope.alpStatus,'unverified');
  for(const e of q.source.relatedEvidence){
   assert.equal(e.enPdfSha256,en.source.pdfSha256);assert.equal(e.urPdfSha256,ur.source.pdfSha256);
   for(const [pages,ledger] of [[e.enPages,en],[e.urPages,ur]]){
    const t=ledger.chapters[0].topics.find(t=>t.id===e.topicId);
    assert.ok(t);assert.ok(pages.every(p=>p>=t.verifiedPhysicalStartPage&&p<=t.verifiedPhysicalEndPage));
   }
  }
 }
});
test('new bilingual MCQs keep keyed options and exactly one aligned answer',()=>{
 for(const q of batch.drafts.filter(q=>q.type==='mcq')){
  assert.deepEqual(q.content.en.options.map(o=>o.id),['A','B','C','D']);
  assert.deepEqual(q.content.ur.options.map(o=>o.id),['A','B','C','D']);
  for(const l of ['en','ur']){
   assert.equal(new Set(q.content[l].options.map(o=>o.text)).size,4);
   assert.equal(q.content[l].answer,q.content[l].options.find(o=>o.id===q.correctOptionId).text);
  }
 }
});
test('all draft review checks stay pending and approved selection/import stay zero',()=>{
 for(const q of batch.drafts){
  assert.equal(q.review.status,'draft');assert.ok(Object.values(q.review.checks).every(v=>v===false));
  assert.equal(q.review.draftEditorialPass.publicationApproval,false);
  assert.equal(q.review.draftEditorialPass.independentVisualSourceReview,'COMPLETED_ITEM_DRAFTS_ONLY_EDITION_PENDING');
 }
 assert.equal(selectApprovedQuestions(batch.drafts).length,0);
 const dry=dryRunStaging({staged:batch.drafts,manifest});
 assert.equal(dry.counts.wouldInsert,0);assert.equal(dry.counts.rejected,48);assert.equal(dry.counts.existingWrites,0);
 const supervised=buildCurriculumSupervisedReview({questions:batch.drafts,manifest,subjectId:'BIO-IX'});
 assert.equal(supervised.counts.academicallyReady,0);assert.equal(supervised.directCommitAllowed,false);
});
test('topic tree exposes 48 source-backed bilingual drafts while ALP exposes zero unverified items',()=>{
 for(const language of ['en','ur','dual']){
  assert.equal(ids(projectTopicTree({ledger:en,questions:batch.drafts,type:'mcq',language})).length,16);
  assert.equal(ids(projectTopicTree({ledger:en,questions:batch.drafts,type:'short',language})).length,26);
  assert.equal(ids(projectTopicTree({ledger:en,questions:batch.drafts,type:'long',language})).length,6);
 }
 assert.equal(projectTopicTree({ledger:en,questions:batch.drafts,type:'mcq',syllabusMode:'alp',examYear:2026}).length,0);
});
test('Dual block preview counts each identity once and uses attempt-any marks',()=>{
 const mcq=batch.drafts.filter(q=>q.type==='mcq').slice(0,2);
 const shorts=batch.drafts.filter(q=>q.type==='short').slice(0,3);
 const long=batch.drafts.filter(q=>q.type==='long').slice(0,1);
 const blocks=[{type:'mcq',questionIds:mcq.map(q=>q.id),attemptAny:2},
  {type:'short',questionIds:shorts.map(q=>q.id),attemptAny:2},
  {type:'long',questionIds:long.map(q=>q.id),attemptAny:1}];
 const x=validateQuestionBlocks(blocks,batch.drafts,{language:'dual'});
 assert.equal(x.valid,true);assert.equal(x.totalMarks,11);
 assert.equal(validateQuestionBlocks(blocks,batch.drafts,{language:'dual',syllabusMode:'alp',examYear:2026}).valid,false);
 for(const q of batch.drafts.filter(q=>q.type==='long'))assert.equal(q.markingRubric.reduce((n,r)=>n+r.marks,0),q.marks);
});
test('inclusive boundaries preserve adjacent-topic continuation and exclude chapter summaries',()=>{
 assert.deepEqual(en.chapters[0].topics.map(t=>t.verifiedPhysicalEndPage),[8,10,12,13,14,16,17,20]);
 assert.deepEqual(ur.chapters[0].topics.map(t=>t.verifiedPhysicalEndPage),[8,9,11,13,14,17,17,21]);
 assert.equal(en.chapters[0].summaryEvidence.physicalPage,21);assert.equal(ur.chapters[0].summaryEvidence.physicalPage,22);
 assert.equal(en.chapters[0].topicBoundaryAudit.independentAcademicApproval,false);
});

test('open source conflicts remain separate from answer keys and do not authorize release',()=>{
 const issues=json('biology9Chapter1SourceIssues.json');
 assert.equal(issues.issues.length,2);assert.ok(issues.issues.every(i=>i.status==='OPEN'));
 assert.equal(issues.sourcePdfSha256,en.source.pdfSha256);assert.equal(issues.urduSourcePdfSha256,ur.source.pdfSha256);
 for(const q of batch.drafts.filter(q=>q.topicId==='1.7'))
  assert.doesNotMatch(q.content.en.stem+' '+q.content.en.answer,/theor(?:y|ies).*(?:become|turn into).*law/i);
 for(const q of batch.drafts.filter(q=>q.topicId==='1.8'))
  assert.doesNotMatch(q.content.en.stem+' '+q.content.en.answer,/1878|1880|1897/);
});
