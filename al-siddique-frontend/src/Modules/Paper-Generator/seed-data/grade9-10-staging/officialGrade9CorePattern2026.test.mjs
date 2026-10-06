import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./officialGrade9CorePattern2026.json',import.meta.url),'utf8'));
const by=Object.fromEntries(d.subjects.map(x=>[x.subject,x]));
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
test('revised Grade IX authority identity is hash/page locked',()=>{assert.equal(d.notification.number,'PECTAA/C&C Unit/2025/376');assert.match(d.artifact.sha256,/^[a-f0-9]{64}$/);assert.equal(d.artifact.pageCount,65);assert.equal(d.notification.supersedes.includes('/325'),true);});
test('Physics Chemistry and Biology each reconcile to 60 marks',()=>{for(const k of ['Physics','Chemistry','Biology']){const s=by[k];assert.equal(s.totalMarks,60);assert.equal(s.objective.marks,12);assert.equal(sum(s.objective.chapterCounts),12);assert.equal(s.subjective.shortQuestions.reduce((a,q)=>a+q.attempt*q.marksEach,0),30);assert.equal(s.subjective.longQuestions.attempt*s.subjective.longQuestions.marksEach,18);assert.equal(12+30+18,60);}});
test('short-question offered pools exactly match official counts',()=>{for(const s of d.subjects){for(const q of s.subjective.shortQuestions||[]){if(q.chapterCounts)assert.equal(sum(q.chapterCounts),q.offered);else assert.match(q.distributionState,/VERIFIED/);}}});
test('Mathematics reconciles 15 objective plus 60 subjective marks',()=>{const s=by.Mathematics;assert.equal(s.totalMarks,75);assert.equal(sum(s.objective.chapterCounts),15);const shorts=s.subjective.shortQuestions.reduce((a,q)=>a+q.attempt*q.marksEach,0);const longs=s.subjective.longPartII.attempt*s.subjective.longPartII.marksEach+s.subjective.longPartIII.attempt*s.subjective.longPartIII.marksEach;assert.equal(shorts,36);assert.equal(longs,24);assert.equal(15+shorts+longs,75);});
test('pattern taxonomy never replaces full-book corpus or ASSPS layout',()=>{assert.equal(d.rules.fullBookQuestionBankDefault,true);assert.equal(d.rules.alpIsOptionalExamFilter,true);assert.equal(d.rules.patternControlsTaxonomyNotASSPSVisualTemplate,true);assert.equal(d.rules.pastPaperStemsMayNotBeCopied,true);});

test('Computer Science & Entrepreneurship reconciles to 50 marks and preserves chapter exclusions',()=>{
 const s=by['Computer Science & Entrepreneurship'];assert(s);
 assert.equal(s.totalMarks,50);assert.equal(sum(s.objective.chapterCounts),10);
 assert.equal(Object.hasOwn(s.objective.chapterCounts,'5'),false);
 assert.equal(Object.hasOwn(s.objective.chapterCounts,'12'),false);
 const shorts=s.subjective.shortQuestions.reduce((a,q)=>a+q.attempt*q.marksEach,0);
 const longs=s.subjective.longQuestions.attempt*s.subjective.longQuestions.marksEach;
 assert.equal(shorts,24);assert.equal(longs,16);assert.equal(10+shorts+longs,50);
 assert.deepEqual(s.subjective.longQuestions.questionChapterRules['7'],[9,12]);
});

test('current revised Islamiat structure reconciles to 100 marks without inventing chapter distribution',()=>{
 const s=by.Islamiat;assert(s);assert.equal(s.totalMarks,100);assert.equal(s.objective.marks,20);assert.equal(s.objective.mcqs,20);assert.equal('chapterCounts' in s.objective,false);
 const shorts=s.subjective.shortQuestions.reduce((a,q)=>a+q.attempt*q.marksEach,0);assert.equal(shorts,40);
 const specials=s.subjective.specialQuestions.reduce((a,q)=>a+q.sectionMarks,0);assert.equal(specials,40);assert.equal(20+shorts+specials,100);
 assert.deepEqual(s.subjective.shortQuestions.map(q=>[q.attempt,q.offered]),[[6,9],[6,9],[8,12]]);
 assert.deepEqual(s.subjective.specialQuestions.map(q=>[q.attempt,q.offered]),[[2,4],[2,4],[2,4]]);
});
