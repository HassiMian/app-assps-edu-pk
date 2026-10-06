import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=new URL('./grade9EnglishCompetencyMap2026.json',import.meta.url);
const data=JSON.parse(fs.readFileSync(p,'utf8'));
test('Grade IX English map covers all eleven current textbook units',()=>{
 assert.equal(data.units.length,11);
 assert.deepEqual(data.units.map(x=>x.unit),[1,2,3,4,5,6,7,8,9,10,11]);
 assert(data.units.every(x=>x.title&&x.printedStartPage>0&&x.pdfStartPage>0));
});
test('unit title evidence is page-bound and never inferred from past papers',()=>{
 assert(data.units.every(x=>['OCR_FROM_RENDERED_SOURCE_PAGE','EMBEDDED_TEXT_SOURCE_PAGE'].includes(x.titleVerification)));
 assert.equal(data.authoringRules.copyPastPaperStems,false);
 assert.equal(data.authoringRules.copySourcePassages,false);
});
test('Grade IX grammar map exposes verified competency categories',()=>{
 const c=data.grammarAuthority.grade9Competencies;
 for(const k of ['Vocabulary','Forms of Verb','Tenses','Translation','Parts of Speech','Story Writing','Comprehension','Paragraph Writing','Active and Passive Voice','Direct and Indirect Speech']) assert(c.includes(k));
 assert.equal(data.authoringRules.mapEveryQuestionToUnitOrGrammarCompetency,true);
 assert.equal(data.authoringRules.answerAndRubricRequired,true);
});
test('map remains fail-closed before authoring review',()=>{
 assert.equal(data.status,'SOURCE_STRUCTURE_VERIFIED_AUTHORING_PENDING');
 assert.equal(data.authoringRules.releaseState,'NOT_AUTHORING_ELIGIBLE_UNTIL_CONTENT_MAP_REVIEW');
});
