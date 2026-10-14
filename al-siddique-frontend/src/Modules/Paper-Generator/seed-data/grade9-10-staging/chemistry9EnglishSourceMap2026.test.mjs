import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./chemistry9EnglishSourceMap2026.json',import.meta.url),'utf8'));
const m=JSON.parse(fs.readFileSync(new URL('./officialSourceManifest.json',import.meta.url),'utf8'));
test('Chemistry IX English official bytes and chapter map are verified',()=>{assert.match(d.source.sha256,/^[a-f0-9]{64}$/);assert.equal(d.source.pageCount,192);assert.equal(d.chapters.length,13);assert.deepEqual(d.chapters.map(x=>x.number),[1,2,3,4,5,6,7,8,9,10,11,12,13]);assert.equal(d.verification.chapterIndexStatus,'VERIFIED');});
test('chapter start pages are source-bound and unique',()=>{assert.equal(new Set(d.chapters.map(x=>x.pdfStartPage)).size,13);assert(d.chapters.every(x=>x.title&&x.printedStartPage>0&&x.pdfStartPage>0));assert.deepEqual(d.chapters.map(x=>x.pdfStartPage),d.verification.chapterStartPagesRendered);});
test('authoring remains blocked until exercise/topic evidence is complete',()=>{assert.equal(d.verification.exerciseIndexStatus,'PARTIAL');assert.equal(d.verification.topicPageRangesStatus,'PARTIAL_CHAPTER1_VERIFIED');assert.equal(d.verification.authoringEligible,false);assert.equal(d.rules.questionAuthoringRequiresTopicAndExerciseVerification,true);assert.equal(d.rules.copyTextbookPassages,false);});
test('official manifest now preserves Chemistry IX verified bytes without faking exercise review',()=>{const e=m.entries.find(x=>x.recordId==='pectaa-catalog-007');assert.equal(e.pdfSha256,d.source.sha256);assert.equal(e.pdfPageCount,192);assert.equal(e.downloadStatus,'PDF_BYTES_VERIFIED');assert.equal(e.chapterIndexStatus,'VERIFIED');assert.equal(e.exerciseIndexStatus,'PENDING');assert.match(e.questionGenerationStatus,/^BLOCKED/);});

test('Chemistry exercise-family discovery is partial and cannot authorize individual items',()=>{
 const e=d.exerciseEvidence;assert.equal(e.status,'PARTIAL_VISUAL_OCR_REVIEW');
 assert.equal(e.individualQuestionPageMapStatus,'PENDING');
 assert.deepEqual(e.chaptersWithVisibleExerciseFamilies,[1,2,3,4,5,6,7,8,9,10,11,12,13]);
 assert.equal(e.chapter1Status,'EXERCISE_FAMILIES_CONFIRMED_ON_PDF_PAGES_19_20');
 assert.deepEqual(e.chapter1ExercisePages,[19,20]);
 assert.equal(d.verification.exerciseIndexStatus,'PARTIAL');
 assert.equal(d.verification.authoringEligible,false);
});

test('chapter 2 start is corrected from TOC visual evidence',()=>{const c=d.chapters.find(x=>x.number===2);assert.equal(c.printedStartPage,17);assert.equal(c.pdfStartPage,21);assert.equal(d.verification.chapterStartPagesRendered[1],21);});
