import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url),'utf8'));
test('source catalog manifest is well-formed and IDs unique',()=>{
 assert.equal(m.authority,'PECTAA');
 assert.ok(m.entries.length>=25);
 assert.equal(new Set(m.entries.map(s=>s.recordId)).size,m.entries.length);
});
test('downloaded official sources carry hash/page evidence while unreviewed sources remain blocked',()=>{
 const locked=new Map([
  ['pectaa-catalog-002',{bytes:25011563,sha:'8e1977a8fcc90dcc2babf87d76c1a1b1bc015252aee9e1bc37718cfdffce806b',pages:170}],
  ['pectaa-catalog-004',{bytes:19576377,sha:'737ab5481acbdf11240b23e535aa301b15b8eb4ee71f414d8ef6958bdcf41bdf',pages:168}],
  ['pectaa-catalog-005',{bytes:113912128,sha:'181f1316aef57a681e2ad37d2d4c00e1fdc92656a3efc7422ddd2939dc08cbe1',pages:288}],
  ['pectaa-catalog-007',{bytes:56635737,sha:'05e0fcca2e1762cc8d9122546d4ff4a612f18f8f061db1a5c04f17d99315b518',pages:192}],
  ['pectaa-catalog-009',{bytes:31362949,sha:'f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5',pages:180}],
  ['pectaa-catalog-010',{bytes:84697797,sha:'7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd',pages:212}],
  ['pectaa-catalog-011',{bytes:51384536,sha:'a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794',pages:204}],
  ['pectaa-catalog-015',{bytes:86277897,sha:'9889e3bbf04e83de3a7cbc1d9fb9e7ca1287fdba45dbd2adac1c2241fe81da16',pages:164}],
  ['pectaa-catalog-016',{bytes:48593549,sha:'61c864f306e9de9d0d7f938a0dc80922a5ec46822acf84027b6257b665631a07',pages:132}],
  ['pectaa-catalog-017',{bytes:103679382,sha:'4c0e41ae91ecd2d8f391ed5d474276069b898546d3998a4af553baf965a6bece',pages:248}],
  ['pectaa-catalog-019',{bytes:103176678,sha:'430551b660fb2379c5cf6c3327ddf91bc073f26f22f258e59538c8e07497cf9a',pages:156}],
  ['pectaa-catalog-020',{bytes:51021585,sha:'ad602022755a9b298cf26c9c184afbbd81ec9ad32f690e1beb220ecfb268b97b',pages:132}],
  ['pectaa-catalog-024',{bytes:122695379,sha:'47e5654f4fc691741f0afc7dd80148b121601eef11767de7cd3a87255c5a879f',pages:204}],
  ['pectaa-catalog-025',{bytes:94367319,sha:'acefc9ba9e8c60baa66df7f222db169def63a93b69df3f664c14841ac009474a',pages:152}],
 ]);
 for(const e of m.entries){
  if(e.pdfUrl){
   assert.match(e.pdfSha256,/^[a-f0-9]{64}$/);assert.match(e.downloadStatus||'',/^PDF_BYTES_VERIFIED/);
   assert(Number(e.downloadByteLength)>0,e.recordId);assert(Number(e.pdfPageCount)>0,e.recordId);
  } else assert.equal(e.pdfSha256,null);
  assert.equal(e.exerciseIndexStatus,'PENDING');
  if(e.questionGenerationStatus==='PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW'){
   if(e.chapterIndexStatus!=='VERIFIED'){assert.match(e.contentMapStatus||'',/VERIFIED|CROSS_CHECKED.*PENDING|PENDING.*VERIFIED|PARTIAL_VERIFIED/,e.recordId);assert(e.contentMapEvidence,e.recordId);assert.match(e.authoringBoundary||'',/^PROVISIONAL_/);}
  } else assert.match(e.questionGenerationStatus,/^BLOCKED/,e.recordId);
 }
 for(const [rid,x] of locked){const e=m.entries.find(v=>v.recordId===rid);assert(e,rid);assert.equal(e.downloadByteLength,x.bytes);assert.equal(e.pdfSha256,x.sha);assert.equal(e.pdfPageCount,x.pages);}
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
  if(['pectaa-catalog-004','pectaa-catalog-005','pectaa-catalog-006','pectaa-catalog-008','pectaa-catalog-010','pectaa-catalog-011','pectaa-catalog-012','pectaa-catalog-015','pectaa-catalog-016','pectaa-catalog-017','pectaa-catalog-018','pectaa-catalog-019','pectaa-catalog-020','pectaa-catalog-021','pectaa-catalog-022','pectaa-catalog-024','pectaa-catalog-025'].includes(e.recordId)) assert.equal(e.questionGenerationStatus,'PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW'); else assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});

test('current science provider access failures remain separate from official catalogue identity',()=>{
 for(const rid of ['pectaa-catalog-005','pectaa-catalog-006','pectaa-catalog-007','pectaa-catalog-011','pectaa-catalog-012']){
  const e=m.entries.find(x=>x.recordId===rid);assert(e);assert.equal(e.catalogLinkCheckedOn,'2026-10-06');assert(e.providerAccessState);if(['pectaa-catalog-004','pectaa-catalog-005','pectaa-catalog-006','pectaa-catalog-008','pectaa-catalog-010','pectaa-catalog-011','pectaa-catalog-012','pectaa-catalog-015','pectaa-catalog-016','pectaa-catalog-017','pectaa-catalog-018','pectaa-catalog-019','pectaa-catalog-020','pectaa-catalog-021','pectaa-catalog-022','pectaa-catalog-024','pectaa-catalog-025'].includes(e.recordId)) assert.equal(e.questionGenerationStatus,'PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW'); else assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});

test('Grade X current catalogue refresh preserves unresolved medium/session facts explicitly',()=>{
 for(const rid of ['pectaa-catalog-015','pectaa-catalog-016','pectaa-catalog-017','pectaa-catalog-018','pectaa-catalog-019','pectaa-catalog-020','pectaa-catalog-021','pectaa-catalog-022','pectaa-catalog-023','pectaa-catalog-024','pectaa-catalog-025']){
  const e=m.entries.find(x=>x.recordId===rid);assert(e);assert.equal(e.catalogLinkCheckedOn,'2026-10-06');assert(e.providerAccessState);if(['pectaa-catalog-004','pectaa-catalog-005','pectaa-catalog-006','pectaa-catalog-008','pectaa-catalog-010','pectaa-catalog-011','pectaa-catalog-012','pectaa-catalog-015','pectaa-catalog-016','pectaa-catalog-017','pectaa-catalog-018','pectaa-catalog-019','pectaa-catalog-020','pectaa-catalog-021','pectaa-catalog-022','pectaa-catalog-024','pectaa-catalog-025'].includes(e.recordId)) assert.equal(e.questionGenerationStatus,'PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW'); else assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-017').medium,'English');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-024').medium,'English');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-025').medium,'Urdu');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-018').edition,'CURRENT_CATALOG_LABEL_NO_SESSION');
 assert.equal(m.entries.find(x=>x.recordId==='pectaa-catalog-019').edition,'CURRENT_CATALOG_LABEL_NO_SESSION');
});

test('Grade IX Matric-Tech catalogue identities are expanded without collapsing media or similarly named subjects',()=>{
 const tech=m.entries.filter(x=>x.grade===9&&x.curriculumTrack==='MATRIC_TECH'&&x.stream==='Matric-Tech');
 assert.equal(tech.length,17);
 const provisional=new Set(['pectaa-catalog-030','pectaa-catalog-031','pectaa-catalog-032','pectaa-catalog-033','pectaa-catalog-034','pectaa-catalog-035','pectaa-catalog-036','pectaa-catalog-038','pectaa-catalog-039','pectaa-catalog-040','pectaa-catalog-042','pectaa-catalog-043','pectaa-catalog-044','pectaa-catalog-045','pectaa-catalog-046']);
 assert(tech.every(x=>x.stream==='Matric-Tech'&&x.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'&&x.catalogAssetUrl&&(provisional.has(x.recordId)?x.questionGenerationStatus==='PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW':/^BLOCKED_PENDING_/.test(x.questionGenerationStatus))));
 assert.equal(m.additionalCatalogStreamsPending.includes('Matric-Tech IX'),false);
 assert(tech.some(x=>x.subject==='Computer-Tech'));
 assert(tech.some(x=>x.subject==='Computer Science & Entrepreneurship-Tech'));
 assert.notEqual(tech.find(x=>x.subject==='Computer-Tech').catalogAssetUrl,tech.find(x=>x.subject==='Computer Science & Entrepreneurship-Tech').catalogAssetUrl);
 const bio=tech.filter(x=>x.subject==='Biology-Tech');assert.deepEqual(new Set(bio.map(x=>x.medium)),new Set(['English','Urdu']));
 const physics=tech.filter(x=>x.subject==='Physics-Tech');assert.deepEqual(new Set(physics.map(x=>x.medium)),new Set(['English','Urdu']));
});

test('Grade X Matric-Tech current catalogue identities are represented without equivalence guessing',()=>{
 const tech=m.entries.filter(x=>x.grade===10&&x.curriculumTrack==='MATRIC_TECH');
 assert.equal(tech.length,17);assert(tech.every(x=>x.stream==='Matric-Tech'&&x.catalogAssetUrl&&/^BLOCKED_PENDING_/.test(x.questionGenerationStatus)));
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
 assert(arts.filter(x=>[9,10].includes(x.grade)).every(x=>x.questionGenerationStatus==='PROVISIONAL_INTERNAL_ONLY_PENDING_REVIEW'&&x.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'));
 assert(arts.filter(x=>x.grade===0).every(x=>x.questionGenerationStatus==='BLOCKED_PENDING_SOURCE'&&x.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'));
});

test('Grade IX/X Practical Notebook sources are explicit and dimension-isolated',()=>{
 const pnb=m.entries.filter(x=>x.assessmentDimension==='PRACTICAL_NOTEBOOK');
 assert.equal(pnb.length,22);assert.equal(pnb.filter(x=>x.grade===9).length,14);assert.equal(pnb.filter(x=>x.grade===10).length,8);
 assert.equal(m.additionalCatalogStreamsPending.includes('Practical notebook subjects'),false);
 assert(pnb.every(x=>x.stream==='Practical Notebook'&&x.catalogAssetUrl&&/^BLOCKED_PENDING_/.test(x.questionGenerationStatus)));
 assert(pnb.some(x=>x.subject==='Biology Practical Notebook (catalog track unresolved)'&&x.curriculumTrack==='UNRESOLVED_CATALOG_CONTEXT'));
 const bio9=pnb.filter(x=>x.grade===9&&x.subject==='Biology'&&x.curriculumTrack==='MAINSTREAM');assert.deepEqual(new Set(bio9.map(x=>x.medium)),new Set(['English','Urdu']));
});

test('religious-alternative catalogue identities are represented without inheriting Muslim-subject identity',()=>{
 const alt=m.entries.filter(x=>x.stream==='Religious Alternative');assert.equal(alt.length,3);
 assert(alt.some(x=>x.grade===9&&x.subject==='Christianity'&&x.edition==='2026-08-27'));
 assert.equal(alt.filter(x=>x.subject==='Akhlaqiat (Religious Minorities)').length,2);
 assert(alt.every(x=>x.medium==='UNSPECIFIED_BY_CATALOG_LABEL'&&/^BLOCKED_PENDING_/.test(x.questionGenerationStatus)));
 assert.equal(m.additionalCatalogStreamsPending.some(x=>x.startsWith('Religious alternatives')),false);
});
