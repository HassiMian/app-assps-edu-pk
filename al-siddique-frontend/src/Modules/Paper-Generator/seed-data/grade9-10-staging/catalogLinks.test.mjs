import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url)));
test('official-page anchor inventory is explicit about downloads versus links',()=>{
 assert.equal(m.entries.filter(e=>e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND').length,101);
 assert.equal(m.entries.filter(e=>e.catalogLinkStatus==='AMBIGUOUS_REPEATED_LABEL').length,2);
 for(const e of m.entries){
  assert.equal(e.catalogEvidenceUrl,m.catalogUrl);
  if(e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND') assert.match(e.catalogAssetUrl,/^https:\/\//);
  if(!['pectaa-catalog-007','pectaa-catalog-009','pectaa-catalog-010'].includes(e.recordId)){
   assert.equal(e.pdfUrl,null);
   assert.equal(e.pdfSha256,null);
  }else if(e.recordId==='pectaa-catalog-007'){
   assert.equal(e.downloadStatus,'PDF_BYTES_VERIFIED');
   assert.match(e.pdfSha256,/^[a-f0-9]{64}$/);
  }else{
   assert.equal(e.downloadStatus,'PDF_BYTES_VERIFIED_EDITION_UNREVIEWED');
  }
 }
 assert.equal(m.liveSeedCount,0);
});
