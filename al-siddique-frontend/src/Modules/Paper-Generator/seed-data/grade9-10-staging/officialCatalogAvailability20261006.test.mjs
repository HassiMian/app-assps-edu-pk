import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./officialCatalogAvailability20261006.json',import.meta.url),'utf8'));
test('current Grade IX core catalogue identities are explicit',()=>{assert.equal(d.grade9Core.length,9);assert(d.grade9Core.every(x=>x.catalogCurrent===true&&x.driveId&&x.catalogLabel));assert(d.grade9Core.some(x=>x.subject==='Chemistry'&&x.medium==='Urdu'&&x.editionOrSession==='2026-09-03'));assert(d.grade9Core.some(x=>x.subject==='Biology'&&x.medium==='Urdu'&&x.editionOrSession==='2026-09-03'));});
test('provider auth failures never become fake PDF verification',()=>{assert.equal(d.guards.signInPageIsNotPdfBytes,true);for(const x of d.grade9Core.filter(x=>!x.bytesVerified)) assert.equal(x.authoringEligible,false);assert.equal(d.guards.noQuestionGenerationFromCatalogMetadataAlone,true);});
test('previously verified Biology hashes survive current provider access failure without approving authoring',()=>{const bio=d.grade9Core.filter(x=>x.subject==='Biology');assert.equal(bio.length,2);assert(bio.every(x=>x.bytesVerified&&/^[a-f0-9]{64}$/.test(x.knownSha256)));assert(bio.every(x=>x.authoringEligible===false));assert.equal(d.guards.knownHistoricalHashMayBePreserved,true);});

test('Grade X 2026-27 catalogue is tracked without inventing missing medium labels',()=>{
 assert.equal(d.grade10Core.length,11);
 assert(d.grade10Core.every(x=>x.catalogCurrent===true&&x.driveId&&x.catalogLabel&&x.authoringEligible===false));
 assert(d.grade10Core.some(x=>x.subject==='Mathematics'&&x.medium==='UNSPECIFIED_BY_CATALOG_LABEL'));
 assert(d.grade10Core.some(x=>x.subject==='Physics'&&x.medium==='UNSPECIFIED_BY_CATALOG_LABEL'));
 assert.match(d.grade10PatternSeparationRule,/does not establish.*Grade X paper pattern/i);
});
