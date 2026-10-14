import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync(new URL('./biology9EnglishEvidenceLedger.json',import.meta.url)));
test('visual Biology IX EM index maps eleven distinct chapters and 57 listed topics',()=>{
 assert.equal(d.chapters.length,11);
 assert.equal(d.totals.topicIndexEntries,57);
 assert.equal(new Set(d.chapters.map(c=>c.id)).size,11);
 assert.ok(d.chapters.every(c=>c.verifiedPhysicalStartPage-c.tocStartPage===4));
 const ch1=d.chapters[0];
 assert.deepEqual(ch1.topics.map(t=>t.verifiedPhysicalStartPage),[6,8,10,12,13,14,16,17]);
 assert.ok(ch1.topics.every(t=>t.actualPage===t.verifiedPhysicalStartPage&&t.pageAuditStatus==='VISUALLY_CHECKED'));
 assert.ok(d.chapters.slice(1).every(c=>c.topics.every(t=>t.actualPage===null&&t.pageAuditStatus.startsWith('PENDING'))));
});
test('exercise identity index preserves exactly 320 physical numbered source refs',()=>{
 const refs=d.chapters.flatMap(c=>c.exercise.sections.flatMap(s=>s.questionSourceRefs));
 assert.equal(refs.length,320);
 assert.equal(new Set(refs).size,320);
 assert.ok(d.chapters.every(c=>c.exercise.sections.every(s=>s.questionSourceRefs.length===s.count&&s.questionTextIncluded===false)));
 assert.equal(d.chapters[0].exercise.sections[2].visibleLabel,null);
 assert.equal(d.totals.unlabelledSourceRefs,7);
 assert.equal(d.chapters[0].exercise.sections[2].crossEditionCorroboration.urduVisibleLabel,'C');
 assert.match(d.chapters[0].exercise.sections[2].crossEditionCorroboration.status,/ENGLISH_HEADING_STILL_ABSENT/);
});
test('metadata evidence does not approve or seed copyrighted source questions',()=>{
 assert.equal(d.release.realApprovedQuestionCount,0);
 assert.equal(d.release.tenantSeedAction,'NEVER_RUN');
 assert.equal(d.curriculum.editionReview,'PENDING_INDEPENDENT_REVIEW');
 assert.match(d.source.pdfSha256,/^[0-9a-f]{64}$/);
});
