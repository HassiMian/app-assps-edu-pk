import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateQuestion,visibleTags,selectApprovedQuestions,duplicateDiagnostics} from './questionContract.mjs';
// Synthetic fixtures for contract tests only; not school textbook or published seed data.
const base=()=>({
 id:'test-grade9-bio-c1-q1', curriculum:{authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'pectaa-biology-9-em-2025',edition:'2025-26',syllabusVersion:'ix-2025-26'},
 chapter:{id:'verified-ch-1',number:1},topicId:'verified-topic-1',origin:'exercise',
 source:{exerciseRef:'EX-1-Q1',officialUrl:'https://pectaa.edu.pk/curriculum-compliance/',page:5},
 type:'short',difficulty:'easy',marks:2,medium:'dual',
 content:{en:{stem:'Sample English question?'},ur:{stem:'نمونہ اردو سوال؟'}},
 importance:{selected:false,reason:''},boardEvidence:[],
 syllabusScope:{examYear:2026,alpStatus:'included',evidenceUrl:'https://pectaa.edu.pk/curriculum-compliance/'},
 review:{status:'approved',checks:{source:true,academic:true,answer:true,originality:true,translation:true,syllabus:true}}
});
test('complete reviewed dual source record passes publication gate',()=>{
 assert.equal(validateQuestion(base(),{forPublication:true}).valid,true);
});
test('exercise cannot exist without exact exercise reference',()=>{
 const q=base(); delete q.source.exerciseRef;
 assert.match(validateQuestion(q).errors.join(' '),/Exercise requires/);
});
test('additional cannot claim exercise origin as a side tag',()=>{
 const q=base();q.origin='additional';
 assert.match(validateQuestion(q).errors.join(' '),/Non-exercise/);
});
test('important never appears without reason',()=>{
 const q=base();q.importance={selected:true,reason:''};
 assert.ok(!visibleTags(q).includes('important'));
 assert.match(validateQuestion(q).errors.join(' '),/rationale/);
});
test('past board tag never appears from an unsupported claim',()=>{
 const q=base(); q.boardEvidence=[{board:'Lahore',year:2026,paperUrl:''}];
 assert.ok(!visibleTags(q).includes('previously-appeared'));
 assert.match(validateQuestion(q).errors.join(' '),/Unverified board/);
});
test('verified historical evidence is independent of exercise origin',()=>{
 const q=base();q.boardEvidence=[{board:'Lahore',year:2026,session:'First Annual',
 paperUrl:'https://example.edu.pk/verified-paper',questionRef:'Section B #1',matchType:'conceptual'}];
 assert.deepEqual(visibleTags(q),['exercise','previously-appeared','easy']);
});
test('full-book selection preserves reviewed questions outside ALP',()=>{
 const excluded=base();excluded.id='excluded';excluded.syllabusScope.alpStatus='excluded';
 const unverified=base();unverified.id='unverified';unverified.syllabusScope.alpStatus='unverified';
 assert.equal(selectApprovedQuestions([base(),excluded,unverified],{origin:'exercise'}).length,3);
 assert.equal(selectApprovedQuestions([excluded,unverified],{syllabusMode:'alp',examYear:2026}).length,0);
});
test('selected chapter and origin are strict, never include blanks',()=>{
 const a=base(),b=base();b.id='other';b.chapter.id='';b.origin='additional';b.source.exerciseRef='';
 assert.deepEqual(selectApprovedQuestions([a,b],{chapterId:'verified-ch-1',origin:'exercise'}).map(q=>q.id),[a.id]);
});
test('dual MCQ must preserve exact option identity and one correct key',()=>{
 const q=base();q.type='mcq';q.marks=1;q.correctOptionId='B';
 q.content.en.options=['A','B','C','D'].map(id=>({id,text:'Option '+id}));
 q.content.ur.options=['A','C','B','D'].map(id=>({id,text:'انتخاب '+id}));
 assert.match(validateQuestion(q).errors.join(' '),/option identities/);
 q.content.ur.options=['A','B','C','D'].map(id=>({id,text:'انتخاب '+id}));
 assert.equal(validateQuestion(q,{forPublication:true}).valid,true);
});
test('unapproved or incomplete translations never become selectable',()=>{
 const q=base();q.review.checks.translation=false;
 assert.equal(selectApprovedQuestions([q],{medium:'dual'}).length,0);
});
test('grade, edition, subject and medium queries isolate a curriculum cohort',()=>{
 const q=base();
 assert.equal(selectApprovedQuestions([q],{grade:10}).length,0);
 assert.equal(selectApprovedQuestions([q],{edition:'2026-27'}).length,0);
 assert.equal(selectApprovedQuestions([q],{grade:9,edition:'2025-26',subjectId:'biology',medium:'dual'}).length,1);
});
test('duplicate IDs and bilingual academic duplicate are reported',()=>{
 const q=base(); const other=structuredClone(q);
 assert.equal(duplicateDiagnostics([q,other]).length,2);
});

test('optional ALP selection includes only year-matched reviewed evidence',()=>{
 const q=base();q.syllabusScope.evidenceSha256='a'.repeat(64);
 q.syllabusScope.verifiedBy='test-reviewer';q.review.reviewers={syllabus:'test-reviewer'};
 assert.equal(selectApprovedQuestions([q],{syllabusMode:'alp',examYear:2026}).length,1);
 assert.equal(selectApprovedQuestions([q],{syllabusMode:'alp',examYear:2027}).length,0);
 q.syllabusScope.evidenceSha256='';
 assert.equal(selectApprovedQuestions([q],{syllabusMode:'alp',examYear:2026}).length,0);
 assert.equal(selectApprovedQuestions([q]).length,1);
 q.review.checks.syllabus=false;
 assert.equal(selectApprovedQuestions([q]).length,0);
});
