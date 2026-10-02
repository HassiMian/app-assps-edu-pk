import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url),'utf8'));
test('source catalog manifest is well-formed and IDs unique',()=>{
 assert.equal(m.authority,'PECTAA');
 assert.ok(m.entries.length>=25);
 assert.equal(new Set(m.entries.map(s=>s.recordId)).size,m.entries.length);
});
test('no textbook PDF access or hash is fabricated',()=>{
 for(const e of m.entries){
   assert.equal(e.pdfUrl,null);
   assert.equal(e.pdfSha256,null);
   assert.equal(e.chapterIndexStatus,'PENDING');
   assert.equal(e.exerciseIndexStatus,'PENDING');
   assert.equal(e.questionGenerationStatus,'BLOCKED_PENDING_SOURCE');
 }
});
test('revised cohorts remain independently catalogued',()=>{
 assert.ok(m.entries.some(s=>s.grade===9&&s.edition==='2025-26'));
 assert.ok(m.entries.some(s=>s.grade===10&&s.edition==='2026-27'));
 assert.equal(m.liveSeedCount,0);
});
