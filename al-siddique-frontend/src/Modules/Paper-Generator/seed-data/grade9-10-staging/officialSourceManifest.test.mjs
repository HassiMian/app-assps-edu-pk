import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url),'utf8'));
test('source catalog manifest is well-formed and IDs unique',()=>{
 assert.equal(m.authority,'PECTAA');
 assert.ok(m.entries.length>=25);
 assert.equal(new Set(m.entries.map(s=>s.recordId)).size,m.entries.length);
});
test('only catalog-009 has downloaded PDF bytes; ALL edition/page/exercise audits remain pending',()=>{
 for(const e of m.entries){
   if(e.recordId==='pectaa-catalog-009'){
     assert.match(e.pdfUrl,/drive.google.com/);
     assert.equal(e.downloadStatus,'PDF_BYTES_VERIFIED_EDITION_UNREVIEWED');
     assert.equal(e.downloadByteLength,31362949);
     assert.equal(e.pdfSha256,'f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5');
   }else{
     assert.equal(e.pdfUrl,null);
     assert.equal(e.pdfSha256,null);
   }
   assert.equal(e.chapterIndexStatus,'PENDING');
   assert.equal(e.exerciseIndexStatus,'PENDING');
   assert.match(e.questionGenerationStatus,/^BLOCKED/);
 }
});
test('revised cohorts remain independently catalogued',()=>{
 assert.ok(m.entries.some(s=>s.grade===9&&s.edition==='2025-26'));
 assert.ok(m.entries.some(s=>s.grade===10&&s.edition==='2026-27'));
 assert.equal(m.liveSeedCount,0);
});
