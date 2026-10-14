import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./grade9EnglishExtractionCoverage2026.json',import.meta.url),'utf8'));
test('all eleven units have explicit extraction state',()=>{assert.equal(d.units.length,11);assert.deepEqual(d.units.map(x=>x.unit),[1,2,3,4,5,6,7,8,9,10,11]);});
test('image-only ranges fail closed rather than erasing competencies',()=>{assert.deepEqual(d.units.filter(x=>x.textLayer==='IMAGE_ONLY_RANGE').map(x=>x.unit),[1,4,5]);assert.equal(d.rules.missingTextLayerMeansNoCompetency,false);assert.equal(d.rules.ocrCanApproveAcademicContent,false);});
test('authoring remains dependent on reviewed unit content maps',()=>{assert.equal(d.rules.unitAuthoringRequiresReviewedContentMap,true);assert(d.discoveryTaxonomy.includes('critical_thinking'));});
