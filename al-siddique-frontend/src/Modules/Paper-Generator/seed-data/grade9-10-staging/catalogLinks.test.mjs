import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url)));
test('official-page anchor inventory is explicit about links and downloaded evidence state',()=>{
 assert.equal(m.entries.filter(e=>e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND').length,105);
 assert.equal(m.entries.filter(e=>e.catalogLinkStatus==='AMBIGUOUS_REPEATED_LABEL').length,2);
 for(const e of m.entries){
  assert.equal(e.catalogEvidenceUrl,m.catalogUrl);
  if(e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND') assert.match(e.catalogAssetUrl,/^https:\/\//);
  if(e.pdfUrl){
   assert.match(e.pdfUrl,/^https:\/\//);
   assert.match(e.pdfSha256,/^[a-f0-9]{64}$/);
   assert.match(e.downloadStatus||'',/^PDF_BYTES_VERIFIED/);
   assert(Number(e.downloadByteLength)>0,e.recordId);
   assert(Number(e.pdfPageCount)>0,e.recordId);
  }else{
   assert.equal(e.pdfSha256,null);
   assert.equal(e.downloadByteLength??null,null);
   assert.equal(e.pdfPageCount??null,null);
  }
 }
 assert.equal(m.liveSeedCount,0);
});
