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

test('source promotion is fail-closed and ordered before authoring',()=>{
 assert.deepEqual(data.sourcePromotionStates,['DISCOVERED','OFFICIAL_CATALOG_LINK_VERIFIED','BYTES_HASHED','VISUALLY_INSPECTED','CONTENT_MAP_VERIFIED','AUTHORING_ELIGIBLE']);
 assert.match(data.promotionRules['BYTES_HASHED->VISUALLY_INSPECTED'],/visually inspected/i);
});

test('language acquisition queue cannot skip byte hashing',()=>{
 assert.equal(data.currentAcquisitionQueue.length,6);
 const academic=data.currentAcquisitionQueue.filter(x=>x.requiredRole==='ACADEMIC_CONTENT');
 assert(academic.every(x=>x.state==='BYTES_HASHED'));
 assert(academic.every(x=>x.nextGate==='VISUALLY_INSPECTED'));
 assert(data.currentAcquisitionQueue.every(x=>['BYTES_HASHED','VISUALLY_INSPECTED'].includes(x.state)));
 assert(data.currentAcquisitionQueue.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert(data.currentAcquisitionQueue.every(x=>x.byteLength>0));
});

test('image-only actual papers require renderer inspection before promotion',()=>{
 const papers=data.currentAcquisitionQueue.filter(x=>x.requiredRole==='ACTUAL_PAPER_SKILL_TAXONOMY');
 assert.equal(papers.length,2);
 assert(papers.every(x=>x.structuralPreflight.scanMode==='IMAGE_ONLY_CCITT_FAX'));
 assert(papers.every(x=>x.structuralPreflight.visualInspectionStatus==='PENDING_RENDERER'));
 assert.match(data.visualInspectionPolicy.rule,/Render pages and inspect visible/i);
 assert.match(data.visualInspectionPolicy.ocrRole,/NOT_AUTHORITY/);
});

test('rendered Multan language bundles are classified as keys, never full papers',()=>{
 const p=data.currentAcquisitionQueue.filter(x=>x.id.includes('MULTAN'));
 assert.deepEqual(p.map(x=>x.renderedPageCount),[24,25]);
 assert(p.every(x=>x.state==='VISUALLY_INSPECTED'));
 assert(p.every(x=>x.artifactClassification==='OFFICIAL_OBJECTIVE_ANSWER_KEY_BUNDLE'));
 assert(p.every(x=>x.patternHierarchyEligible===false));
 assert.match(data.actualPaperClassificationRule,/does not make an answer-key bundle a full actual question paper/i);
});
