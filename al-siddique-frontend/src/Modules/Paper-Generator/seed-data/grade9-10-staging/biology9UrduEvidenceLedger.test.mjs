import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync(new URL('./biology9UrduEvidenceLedger.json',import.meta.url)));
test('Urdu Biology binary and all eleven chapter openings are separately verified',()=>{
 assert.equal(d.source.catalogRecordId,'pectaa-catalog-010');
 assert.equal(d.source.pdfBytes,84697797);assert.equal(d.source.pdfPages,212);
 assert.equal(d.source.pdfSha256,'7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd');
 assert.equal(d.chapters.length,11);
 assert.deepEqual(d.chapters.map(c=>c.verifiedPhysicalStartPage),[4,26,44,69,87,104,124,136,152,173,192]);
 assert.deepEqual(d.chapters.map(c=>c.titleEnglishPrinted),['The Science of Biology','Biodiversity','The Cell','Cell Cycle',
  'Tissues, Organs, and Organ Systems','Biomolecules','Enzymes','Bioenergetics','Plant Physiology','Reproduction in Plants','Biostatistics']);
 assert.equal(d.glossary.verifiedPhysicalStartPage,204);
});
test('Urdu Chapter 1 topic pages are independently mapped, not copied from English pagination',()=>{
 const t=d.chapters[0].topics;
 assert.equal(t.length,8);
 assert.deepEqual(t.map(x=>x.verifiedPhysicalStartPage),[5,8,9,12,13,14,17,18]);
 assert.deepEqual(t.map(x=>x.verifiedPhysicalEndPage),[8,9,11,13,14,17,17,21]);
 assert.ok(t.every(x=>x.pageAuditStatus==='VISUALLY_CHECKED'));
});
test('Urdu Chapter 1 exercise visibly supplies A/B/C/D section evidence',()=>{
 const e=d.chapters[0].exercise;
 assert.deepEqual([e.firstPhysicalPage,e.lastPhysicalPage],[23,25]);
 assert.deepEqual(e.sections.map(s=>[s.label,s.type,s.count]),[
  ['A','mcq',10],['B','short',6],['C','long',7],['D','inquisitive',2]]);
 const refs=e.sections.flatMap(s=>s.questionSourceRefs);
 assert.equal(refs.length,25);assert.equal(new Set(refs).size,25);
 assert.ok(e.sections.every(s=>s.questionTextIncluded===false));
});
test('Urdu evidence still blocks academic release and edition equivalence claims',()=>{
 assert.equal(d.curriculum.editionReview,'PENDING_INDEPENDENT_EQUIVALENCE_REVIEW');
 assert.equal(d.release.realApprovedQuestionCount,0);
 assert.equal(d.release.tenantSeedAction,'NEVER_RUN');
 assert.equal(d.release.bilingualSemanticReview,'PENDING');
});
