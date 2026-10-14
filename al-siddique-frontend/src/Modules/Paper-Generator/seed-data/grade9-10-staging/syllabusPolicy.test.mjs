import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchesSyllabus} from './syllabusPolicy.mjs';
import {newTopicDraft,projectTopicTree,validateQuestionBlocks} from './topicWorkspaceEngine.mjs';
import {selectApprovedQuestions} from './questionContract.mjs';
const ledger=JSON.parse(readFileSync(new URL('./biology9EnglishEvidenceLedger.json',import.meta.url)));
// Synthetic eligibility and questions below are test fixtures, not real ALP evidence.
const draft=id=>newTopicDraft({id,ledger,chapterId:ledger.chapters[0].id,topicId:'1.1',
 type:'short',origin:'additional',en:'Synthetic prompt '+id,answerEn:'Synthetic answer',
 evidencePage:6,marks:2}).question;
const eligible=id=>{
 const q=draft(id);
 q.syllabusScope={alpStatus:'included',examYear:2026,evidenceUrl:'https://example.org/test-alp.pdf',
  evidenceSha256:'a'.repeat(64),verifiedBy:'test-syllabus'};
 q.review.checks.syllabus=true;q.review.reviewers={syllabus:'test-syllabus'};
 return q;
};
const ids=tree=>tree.flatMap(ch=>ch.topics.flatMap(t=>t.questions.map(q=>q.id)));
test('full is default and preserves every valid ALP state without mutating records',()=>{
 const qs=['included','excluded','unverified','not-applicable'].map((status,i)=>{
  const q=draft('Q'+i);q.syllabusScope.alpStatus=status;return q;
 });
 const before=JSON.stringify(qs);
 for(const q of qs)assert.equal(matchesSyllabus(q),true);
 assert.equal(ids(projectTopicTree({ledger,questions:qs})).length,4);
 assert.equal(JSON.stringify(qs),before);
});
test('ALP requires included status, year, checksum and a matching independent review',()=>{
 const q=eligible('OK');assert.equal(matchesSyllabus(q,{syllabusMode:'alp',examYear:2026}),true);
 assert.equal(matchesSyllabus(q,{syllabusMode:'alp',examYear:2027}),false);
 assert.equal(matchesSyllabus(q,{syllabusMode:'alp'}),false);
 for(const patch of [{alpStatus:'excluded'},{alpStatus:'unverified'},{alpStatus:'not-applicable'},
  {evidenceSha256:''},{evidenceUrl:''},{verifiedBy:'other'}]){
  const changed=structuredClone(q);Object.assign(changed.syllabusScope,patch);
  assert.equal(matchesSyllabus(changed,{syllabusMode:'alp',examYear:2026}),false);
 }
 q.review.checks.syllabus=false;
 assert.equal(matchesSyllabus(q,{syllabusMode:'alp',examYear:2026}),false);
 assert.equal(matchesSyllabus(q,{syllabusMode:'unknown'}),false);
});
test('ALP tree filters individual questions and hides unverified empty topics',()=>{
 const yes=eligible('YES'),no=draft('NO');
 assert.deepEqual(ids(projectTopicTree({ledger,questions:[yes,no],syllabusMode:'alp',examYear:2026})),['YES']);
 assert.deepEqual(projectTopicTree({ledger,questions:[no],syllabusMode:'alp',examYear:2026}),[]);
 assert.equal(projectTopicTree({ledger,questions:[no]}).length,11);
});
test('switching full to ALP validates existing blocks without deleting or changing them',()=>{
 const yes=eligible('YES'),no=draft('NO');
 const blocks=[{type:'short',questionIds:['YES','NO'],attemptAny:1}],before=JSON.stringify(blocks);
 assert.equal(validateQuestionBlocks(blocks,[yes,no]).totalMarks,2);
 const alp=validateQuestionBlocks(blocks,[yes,no],{syllabusMode:'alp',examYear:2026});
 assert.equal(alp.valid,false);assert.equal(alp.totalMarks,null);
 assert.match(alp.errors.join('|'),/outside selected syllabus: NO/);
 assert.equal(JSON.stringify(blocks),before);
 assert.equal(validateQuestionBlocks(blocks,[yes,no]).valid,true);
});
test('full coverage never makes an unapproved question selectable',()=>{
 const q=draft('DRAFT');q.syllabusScope.alpStatus='excluded';
 assert.equal(selectApprovedQuestions([q],{syllabusMode:'full'}).length,0);
});
test('UI defaults to full with an explicit optional ALP year and keeps exports full-book',()=>{
 const ui=readFileSync(new URL('../../TopicWiseCurriculumWorkspace.jsx',import.meta.url),'utf8');
 assert.match(ui,/setSyllabusMode\]=useState\('full'\)/);
 assert.match(ui,/aria-label="Syllabus coverage"/);assert.match(ui,/ALP examination year/);
 assert.match(ui,/bankCoverage:'full-textbook'/);assert.match(ui,/selectionValidation:inspected/);
 assert.match(ui,/No verified ALP-eligible questions/);
});
