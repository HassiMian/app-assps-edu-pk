import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./boardPatternAuthorityRegistry.json',import.meta.url),'utf8'));
test('revised Grade IX authority survives dead origin URL via verified official-board recovery',()=>{const s=d.sources.find(x=>x.id==='PECTAA-G9-2026-REVISED-ALP-PAIRING-MODEL');assert(s);assert.equal(s.notificationNumber,'PECTAA/C&C Unit/2025/376');assert.match(s.supersedes,/\/325/);assert.equal(s.originAvailabilityState,'ORIGIN_URL_404_RECOVERED_FROM_OFFICIAL_BOARD_MIRROR');assert.match(s.retrievedSha256,/^[a-f0-9]{64}$/);assert.equal(s.retrievedPageCount,65);assert.match(s.recoveryUrl,/bisesargodha\.edu\.pk/);});
test('Matric-Tech theory authority is separate, hash locked and ten-subject scoped',()=>{const s=d.sources.find(x=>x.id==='PECTAA-G9-2026-MATRIC-TECH-PAIRING-MODELS-SARGODHA');assert(s);assert.equal(s.curriculumTrack,'MATRIC_TECH');assert.equal(s.subjects.length,10);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.equal(s.pageCount,40);assert(s.mustNotUseFor.includes('merging-Matric-Tech-with-mainstream'));});
test('authority registry explicitly prohibits track collapse and Grade X inference',()=>{assert.match(d.trackIsolationRule,/no implicit fallback or merging/i);assert.equal(d.grade10NewEditionPattern.state,'PENDING_OFFICIAL_MODEL_PAPER_OR_PAIRING_PUBLICATION');assert.match(d.grade10NewEditionPattern.rule,/Do not infer/i);});

test('Matric-Tech practical authority is official, hash locked and dimension-isolated',()=>{
 const s=d.sources.find(x=>x.id==='PECTAA-G9-2026-MATRIC-TECH-PRACTICAL-551');
 assert(s);assert.equal(s.notificationNumber,'PECTAA/C&C Unit/2026/551');assert.equal(s.publicationDate,'2026-01-08');
 assert.equal(s.assessmentDimension,'PRACTICAL');assert.equal(s.curriculumTrack,'MATRIC_TECH');assert.equal(s.subjects.length,4);
 assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.equal(s.pageCount,17);assert(s.mustNotUseFor.includes('theory-pattern-substitution'));
 assert.match(d.trackIsolationRule,/Practical and theory assessment dimensions remain independent/i);
});
