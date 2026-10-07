import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url),'utf8'));
test('source catalog manifest is well-formed and IDs unique',()=>{
 assert.equal(m.authority,'PECTAA');
 assert.ok(m.entries.length>=25);
 assert.equal(new Set(m.entries.map(s=>s.recordId)).size,m.entries.length);
});
test('Biology IX English and Urdu have verified PDF bytes; ALL edition/page/exercise audits remain pending',()=>{
 const downloaded=new Map([
  ['pectaa-catalog-007',{bytes:56635737,sha:'05e0fcca2e1762cc8d9122546d4ff4a612f18f8f061db1a5c04f17d99315b518',pages:192,status:'PDF_BYTES_VERIFIED',chapter:'VERIFIED'}],
  ['pectaa-catalog-009',{bytes:31362949,sha:'f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5'}],
  ['pectaa-catalog-010',{bytes:84697797,sha:'7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd',pages:212}],
 ]);
 for(const e of m.entries){
   if(downloaded.has(e.recordId)){
     const expected=downloaded.get(e.recordId);
     assert.match(e.pdfUrl,/drive.google.com/);
     assert.equal(e.downloadStatus,expected.status||'PDF_BYTES_VERIFIED_EDITION_UNREVIEWED');
     assert.equal(e.downloadByteLength,expected.bytes);
     assert.equal(e.pdfSha256,expected.sha);
     if(expected.pages)assert.equal(e.pdfPageCount,expected.pages);
     if(expected.chapter)assert.equal(e.chapterIndexStatus,expected.chapter);
   }else{
     assert.equal(e.pdfUrl,null);
     assert.equal(e.pdfSha256,null);
   }
   if(!downloaded.get(e.recordId)?.chapter) assert.equal(e.chapterIndexStatus,'PENDING');
   assert.equal(e.exerciseIndexStatus,'PENDING');
   assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});
test('revised cohorts remain independently catalogued',()=>{
 assert.ok(m.entries.some(s=>s.grade===9&&s.edition==='2025-26'));
 assert.ok(m.entries.some(s=>s.grade===10&&s.edition==='2026-27'));
 assert.equal(m.liveSeedCount,0);
});

test('current Urdu science catalogue dates are resolved without pretending provider access equals content verification',()=>{
 const chem=m.entries.find(x=>x.recordId==='pectaa-catalog-008');
 const bio=m.entries.find(x=>x.recordId==='pectaa-catalog-010');
 assert.equal(chem.edition,'2026-09-03');
 assert.equal(bio.edition,'2026-09-03');
 for(const e of [chem,bio]){
  assert.equal(e.catalogLinkCheckedOn,'2026-10-06');
  assert.match(e.providerAccessState,/AUTH_REQUIRED_OR_401|SIGN_IN_PAGE/);
  assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});

test('current science provider access failures remain separate from official catalogue identity',()=>{
 for(const rid of ['pectaa-catalog-005','pectaa-catalog-006','pectaa-catalog-007','pectaa-catalog-011','pectaa-catalog-012']){
  const e=m.entries.find(x=>x.recordId===rid);assert(e);assert.equal(e.catalogLinkCheckedOn,'2026-10-06');assert(e.providerAccessState);assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});

test('Grade X current catalogue refresh preserves unresolved medium/session facts explicitly',()=>{
 for(const rid of ['pectaa-catalog-015','pectaa-catalog-016','pectaa-catalog-017','pectaa-catalog-018','pectaa-catalog-019','pectaa-catalog-020','pectaa-catalog-021','pectaa-catalog-022','pectaa-catalog-023','pectaa-catalog-024','pectaa-catalog-025']){
  const e=m.entries.find(x=>x.recordId===rid);assert(e);assert.equal(e.catalogLinkCheckedOn,'2026-10-06');assert(e.providerAccessState);assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-017').medium,'UNSPECIFIED_BY_CATALOG_LABEL');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-024').medium,'UNSPECIFIED_BY_CATALOG_LABEL');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-025').medium,'UNSPECIFIED_BY_CATALOG_LABEL');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-018').edition,'CURRENT_CATALOG_LABEL_NO_SESSION');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-019').edition,'CURRENT_CATALOG_LABEL_NO_SESSION');
});

test('Grade IX Matric-Tech catalogue identities are expanded without collapsing media or similarly named subjects',()=>{
 const tech=m.entries.filter(x=>x.grade===9&&x.curriculumTrack==='MATRIC_TECH');
 assert.equal(tech.length,17);
 assert(tech.every(x=>x.stream==='Matric-Tech'&&x.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'&&x.catalogAssetUrl&&x.questionGenerationStatus==='BLOCKED_PENDING_SOURCE'));
 assert.equal(m.additionalCatalogStreamsPending.includes('Matric-Tech IX'),false);
 assert(tech.some(x=>x.subject==='Computer-Tech'));
 assert(tech.some(x=>x.subject==='Computer Science & Entrepreneurship-Tech'));
 assert.notEqual(tech.find(x=>x.subject==='Computer-Tech').catalogAssetUrl,tech.find(x=>x.subject==='Computer Science & Entrepreneurship-Tech').catalogAssetUrl);
 const bio=tech.filter(x=>x.subject==='Biology-Tech');assert.deepEqual(new Set(bio.map(x=>x.medium)),new Set(['English','Urdu']));
 const physics=tech.filter(x=>x.subject==='Physics-Tech');assert.deepEqual(new Set(physics.map(x=>x.medium)),new Set(['English','Urdu']));
});

test('Grade X Matric-Tech current catalogue identities are represented without equivalence guessing',()=>{
 const tech=m.entries.filter(x=>x.grade===10&&x.curriculumTrack==='MATRIC_TECH');
 assert.equal(tech.length,17);assert(tech.every(x=>x.stream==='Matric-Tech'&&x.catalogAssetUrl&&x.questionGenerationStatus==='BLOCKED_PENDING_SOURCE'));
 assert.equal(m.additionalCatalogStreamsPending.includes('Matric-Tech X'),false);
 assert(tech.some(x=>x.subject==='Computer-Tech'));assert(tech.some(x=>x.subject==='Computer Science-Tech'));assert(tech.some(x=>x.subject==='Computer (Matric-Tech catalog identity)'));
 const physics=tech.filter(x=>x.subject==='Physics-Tech');assert.deepEqual(new Set(physics.map(x=>x.medium)),new Set(['English','Urdu']));
 const bio=tech.filter(x=>x.subject==='Biology-Tech');assert.deepEqual(new Set(bio.map(x=>x.medium)),new Set(['English','Urdu']));
});

test('Grade IX/X arts and shared IX-X elective catalogue identities are represented separately',()=>{
 const arts=m.entries.filter(x=>['Arts/Elective','IX–X Arts Supplement'].includes(x.stream));
 assert.equal(arts.length,18);
 assert.equal(arts.filter(x=>x.grade===9).length,5);
 assert.equal(arts.filter(x=>x.grade===10).length,5);
 assert.equal(arts.filter(x=>x.grade===0).length,8);
 assert.equal(m.additionalCatalogStreamsPending.includes('Humanities/Arts'),false);
 const art9=arts.filter(x=>x.grade===9&&x.subject==='Art & Model Drawing');assert.deepEqual(new Set(art9.map(x=>x.medium)),new Set(['English','Urdu']));
 const econ=arts.filter(x=>x.grade===0&&x.subject==='Economics');assert.deepEqual(new Set(econ.map(x=>x.medium)),new Set(['English','Urdu']));
 assert(arts.every(x=>x.questionGenerationStatus==='BLOCKED_PENDING_SOURCE'&&x.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'));
});
