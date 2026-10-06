import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('./sourceAuthorityRegistry2026.json',import.meta.url),'utf8'));

test('revised Grade IX 2026 authority supersedes the earlier notification',()=>{
 const a=data.authorities.find(x=>x.id==='PECTAA-G9-2026-REVISED-ALP');
 assert.equal(a.notification,'PECTAA/C&C Unit/2025/376');
 assert.match(a.supersedes,/2025\/325/);
 assert.equal(a.status,'OFFICIAL_CURRENT_AUTHORITY');
});

test('academic content and assessment pattern authorities are separated',()=>{
 assert.match(data.rules.academicContentAuthority,/TEXTBOOK|GRAMMAR/);
 assert.match(data.rules.assessmentPatternAuthority,/MODEL|PAIRING|ACTUAL/);
 assert.equal(data.rules.alpRole,'OPTIONAL_EXAM_FILTER_NEVER_CANONICAL_CORPUS_DELETION');
});

test('past papers cannot become question-content authority',()=>{
 assert.match(data.rules.actualPaperContentUse,/NO_STEM_PASSAGE_ANSWER_COPY/);
});

test('source identity includes curriculum track medium and edition',()=>{
 assert.deepEqual(data.rules.identityFields,['grade','subject','curriculumTrack','medium','editionOrSession']);
 assert.equal(data.trackSeparation.required,true);
});

test('technical practical package is separately registered',()=>{
 const a=data.authorities.find(x=>x.id==='PECTAA-G9-TECH-PRACTICAL-2026');
 assert.equal(a.notification,'PECTAA/C&C Unit/2026/551');
 assert.deepEqual(a.subjects,['Agriculture Sciences','Health Sciences','Fashion Designing','ICT']);
});

test('release guards fail closed on unresolved evidence',()=>{
 assert(data.releaseGuards.includes('BLOCK_AUTHORING_IF_CURRENT_TEXTBOOK_EDITION_UNRESOLVED'));
 assert(data.releaseGuards.includes('BLOCK_PAGE_METADATA_IF_PAGE_NOT_VISUALLY_VERIFIED'));
 assert(data.releaseGuards.includes('BLOCK_ACADEMIC_REVIEW_CLAIM_WITHOUT_REVIEW_EVIDENCE'));
});
