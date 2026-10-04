import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const m=load('./officialGrade9LanguageModelHierarchy2026.json');
const paper=load('./boardPaperFirstAuthoringPolicy.json');
const english=m.patterns.find(x=>x.subject==='English');
const urdu=m.patterns.find(x=>x.subject==='Urdu');
const find=(model,label)=>model.sections.find(x=>x.label===label);
test('official scan identity and source page ranges are fully pinned',()=>{
 const s=m.sourceDocument;
 assert.equal(s.documentType,'OFFICIAL_MODEL');
 assert.equal(s.pdfSha256,'528a6627b7c027c685671de831889aa07aaa36676edf5c5d9e0d93833c46fcef');
 assert.equal(s.byteLength,29595552);
 assert.equal(s.pdfPhysicalPages,65);
 assert.deepEqual(s.evidencePages.englishModel,[57,58,59,60]);
 assert.deepEqual(s.evidencePages.urduModel,[50,51,52,53]);
 assert.equal(s.actual2026AnnualQuestionPaperVerified,false);
});
test('English and Urdu model totals and timings balance independently',()=>{
 assert.equal(m.patterns.length,2);
 for(const p of m.patterns){
  assert.equal(p.questionCount,9);
  assert.equal(p.sections.length,9);
  assert.deepEqual(p.sections.map(s=>s.label),Array.from({length:9},(_,i)=>'Q'+(i+1)));
  assert.equal(p.totalMarks,75);
  assert.equal(p.objectiveMarks+p.subjectiveMarks,75);
  assert.equal(p.totalDurationMinutes,150);
  assert.equal(p.objectiveDurationMinutes+p.subjectiveDurationMinutes,150);
  assert.equal(p.sections.reduce((a,s)=>a+s.sectionMarks,0),75);
  assert.equal(p.sections.filter(s=>s.paperPart==='OBJECTIVE').reduce((a,s)=>a+s.sectionMarks,0),p.objectiveMarks);
  assert.equal(p.sections.filter(s=>s.paperPart==='SUBJECTIVE').reduce((a,s)=>a+s.sectionMarks,0),p.subjectiveMarks);
 }
 assert.deepEqual(english.sections.map(s=>s.sectionMarks),[19,10,8,5,5,8,10,5,5]);
 assert.deepEqual(urdu.sections.map(s=>s.sectionMarks),[15,10,10,10,5,5,10,5,5]);
});
test('English MCQ and Q2 choice hierarchy match source pages',()=>{
 assert.equal(english.objectiveMarks,19);
 assert.deepEqual(find(english,'Q1').children.map(x=>x.sectionMarks),[5,4,5,5]);
 assert.deepEqual(find(english,'Q2').children.map(x=>x.sectionMarks),[6,4]);
 assert.deepEqual(find(english,'Q2').children.map(x=>[x.attempt,x.offered,x.marksPerItem]),[[3,5,2],[1,2,4]]);
});
test('English comprehension, translation, poetry and composition retain actual model choices',()=>{
 assert.deepEqual([find(english,'Q3').attempt,find(english,'Q3').offered,find(english,'Q3').marksPerAttempt],[2,3,4]);
 assert.equal(find(english,'Q4').choiceRule,'ONE_OF_TWO_EXCLUSIVE_ALTERNATIVES');
 assert.deepEqual([find(english,'Q5').attempt,find(english,'Q5').offered],[5,8]);
 assert.deepEqual([find(english,'Q6').attempt,find(english,'Q6').offered],[1,3]);
 assert.deepEqual([find(english,'Q7').attempt,find(english,'Q7').marksPerAttempt],[5,2]);
 assert.equal(find(english,'Q8').children.find(c=>c.exclusiveAlternative).taskSubtype,'ten_sentence_paragraph_english_medium_only');
 assert.equal(find(english,'Q9').taskSubtype,'voice_change');
});
test('Urdu objective 10 literary MCQs plus 5 grammar MCQs',()=>{
 assert.equal(urdu.objectiveMarks,15);
 assert.deepEqual(find(urdu,'Q1').children.map(x=>x.sectionMarks),[10,5]);
 assert.equal(find(urdu,'Q1').children[0].taskSubtype,'prose_7_nazm_2_ghazal_1');
});
test('Urdu poetry explanation means THREE nazm plus TWO ghazal, each TWO marks, NOT two times five',()=>{
 const q=find(urdu,'Q2');
 assert.equal(q.sectionMarks,10);
 assert.deepEqual(q.children.map(x=>[x.attempt,x.offered,x.marksPerItem,x.sectionMarks]),[[3,4,2,6],[2,3,2,4]]);
});
test('Urdu prose passage explanation rubric totals 1+1+3+5',()=>{
 const q=find(urdu,'Q3');
 assert.deepEqual(q.children.map(x=>x.sectionMarks),[1,1,3,5]);
 assert.equal(q.children.reduce((a,x)=>a+x.sectionMarks,0),10);
});
test('Urdu remaining short and writing categories keep candidate counts and marks',()=>{
 assert.deepEqual([find(urdu,'Q4').attempt,find(urdu,'Q4').offered,find(urdu,'Q4').marksPerAttempt],[5,8,2]);
 assert.deepEqual([find(urdu,'Q5').attempt,find(urdu,'Q5').offered],[1,2]);
 assert.deepEqual([find(urdu,'Q6').attempt,find(urdu,'Q6').offered],[1,2]);
 assert.equal(find(urdu,'Q7').choiceRule,'APPLICATION_OR_LETTER');
 assert.equal(find(urdu,'Q8').choiceRule,'STORY_OR_DIALOGUE');
 assert.deepEqual([find(urdu,'Q9').attempt,find(urdu,'Q9').offered],[5,7]);
 assert.deepEqual(find(urdu,'Q9').children.map(x=>x.offered),[4,3]);
});
test('all asserted model categories have exact physical page evidence',()=>{
 const allowed={English:new Set([55,56,57,58,59,60]),Urdu:new Set([46,47,48,49,50,51,52,53])};
 for(const p of m.patterns)for(const s of p.sections){
  assert.equal(s.authorityState,'VERIFIED_MODEL');
  assert.equal(s.sourceDocumentId,m.sourceDocument.id);
  assert(s.sourcePages.length>0&&s.sourcePages.every(n=>allowed[p.subject].has(n)));
  for(const c of s.children)assert(c.sourcePages.length>0&&c.sourcePages.every(n=>allowed[p.subject].has(n)));
 }
});
test('paper-first policy references real verified model while actual 2026 paper remains pending',()=>{
 const r=paper.sourceReferences.find(x=>x.id===m.sourceDocument.id);
 assert(r&&r.verifiedPatternHierarchy===true&&r.documentType==='OFFICIAL_MODEL');
 assert.equal(r.pdfSha256,m.sourceDocument.pdfSha256);
 assert.equal(paper.verifiedHierarchyEntries.length,2);
 assert(paper.verifiedHierarchyEntries.every(x=>x.authorityState==='VERIFIED_MODEL'&&!x.actualAnnualPaperVerified));
 assert(paper.priorityAcquisitionQueue.filter(x=>x.grade===9).every(x=>x.allowModelCategoryTaxonomy===true&&x.allowPatternApproval===false));
});
test('model evidence cannot copy prompts or authorize textbook question content or live import',()=>{
 assert.equal(m.segregation.copyModelPaperQuestionsOrPassages,false);
 assert.equal(m.segregation.originalQuestionContentAuthority,'CURRENT_OFFICIAL_TEXTBOOK_OR_GRAMMAR_SOURCE_ONLY');
 assert.equal(m.segregation.preserveASSPSPaperDocumentVisualFormat,true);
 assert.equal(m.segregation.fullTextbookBankDefault,true);
 assert.equal(m.segregation.grade9ALP2026AppliesOnlyWhenExamYearFilterSelected,true);
 assert.equal(m.segregation.releaseApproved,false);
 assert.equal(m.segregation.productionWrites,0);
 assert.equal(m.segregation.academicApprovedQuestionCountDelta,0);
 assert.equal(paper.verifiedQuestionTextCopiedFromPapers,0);
 assert.equal(paper.verifiedAcademicContentSeededByThisPolicy,0);
 assert.equal(paper.productionWrites,0);
 assert.equal(paper.releaseApproved,false);
 assert(m.pendingActualPaperVerification.every(x=>x.state==='ACTUAL_EXAM_PAGES_PENDING'));
});
