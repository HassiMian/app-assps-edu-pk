import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fingerprint,stableTextLayerEvidence,newProgress,validateProgress,persistCheckpoint,pageKey,validatePageBudget} from '../qbank/assps-grade910-ocr-resume-guard-20261016.mjs';
const nativeEvidence={
 schema:'ASSPS_IX_X_STRICT_TEXT_LAYER_STEM_MATCH_V1',
 observedUTC:'2026-10-16T00:00:00Z',originalClaimsSHA256:'oldsha',
 assets:[{catalog:'book-a',claimedPagesChecked:3,pagesWithUsableTextLayer:0}],
 records:[{questionId:'Q1',sourceCatalog:'book-a',originallyClaimedPdfPage:3,
   pdfTextLayerSHA256:'x'.repeat(64),category:'TEXT_LAYER_INSUFFICIENT',
   extractedTextCharacterCount:0,strictExactStemPresent:false}]
};
const asBytes=(changes={})=>Buffer.from(JSON.stringify({...nativeEvidence,...changes}));
const input=()=>fingerprint(Buffer.from('catalog-unchanged'),asBytes(),[['Q1','Stem with 3']]);
const p={catalog:'cat-001',page:3,claims:[{questionId:'Q1'}]};
function completed(){
 const x=newProgress(input());x.completedPages=[pageKey(p)];
 x.assets=[{catalog:'cat-001',page:3,rawPageImagePersisted:false,rawOCRTextPersisted:false}];
 x.results=[{questionId:'Q1',catalog:'cat-001',page:3,autoPublished:false,qualifiedFacultyApproved:false,academicQuestionContentPageVerified:false}];
 return x;
}
test('source fingerprint includes manifest, PDF-text receipt and question stem revision',()=>{
 assert.notEqual(input(),fingerprint(Buffer.from('modified catalog'),asBytes(),[['Q1','Stem with 3']]));
 assert.notEqual(input(),fingerprint(Buffer.from('catalog-unchanged'),asBytes(),[['Q1','Stem with 4']]));
});
test('harmless audit rerun date and parent audit SHA do not destroy OCR progress',()=>{
 const changed=asBytes({observedUTC:'2026-10-17T04:00:00Z',
                         originalClaimsSHA256:'different-run-transient-sha'});
 assert.equal(input(),fingerprint(Buffer.from('catalog-unchanged'),changed,[['Q1','Stem with 3']]));
});
test('actual physical source page SHA or claim page change must invalidate resume',()=>{
 const r={...nativeEvidence.records[0],originallyClaimedPdfPage:4};
 assert.notEqual(input(),fingerprint(Buffer.from('catalog-unchanged'),
          asBytes({records:[r]}),[['Q1','Stem with 3']]));
 const changed={...nativeEvidence.records[0],pdfTextLayerSHA256:'y'.repeat(64)};
 assert.notEqual(input(),fingerprint(Buffer.from('catalog-unchanged'),
          asBytes({records:[changed]}),[['Q1','Stem with 3']]));
});
test('invalid or missing text-layer source records fail closed',()=>{
 assert.throws(()=>stableTextLayerEvidence(Buffer.from('{"schema":"unknown"}')),/UNTRUSTED/);
});
test('empty checkpoint can resume safely without claiming scanned pages',()=>{
 const x=newProgress(input());assert.equal(validateProgress(x,input(),[p]).completedPages.length,0);
});
test('complete source-id-only result is accepted but never approved',()=>{
 const x=completed();assert.equal(validateProgress(x,input(),[p]).results.length,1);
 assert.equal(x.academicApproved,false);
});
test('source changes invalidate cached page claims',()=>{
 assert.throws(()=>validateProgress(completed(),'f'.repeat(64),[p]),/SOURCE_HASH_CHANGED/);
});
test('invented second completed page or duplicated page is blocked',()=>{
 const x=completed();x.completedPages.push(pageKey(p));assert.throws(()=>validateProgress(x,input(),[p]),/INVALID_OR_DUPLICATE/);
});
test('incomplete page-specific claims cannot be marked as completed',()=>{
 const x=completed();x.results=[];assert.throws(()=>validateProgress(x,input(),[p]),/CLAIM_COVERAGE_MISMATCH/);
});
test('any authorized/approved label in resume data is blocked',()=>{
 const x=completed();x.results[0].qualifiedFacultyApproved=true;assert.throws(()=>validateProgress(x,input(),[p]),/INVALID_OCR_QUESTION_RECEIPT/);
});
test('no raw copyright-bearing images or text are allowed in claimed assets',()=>{
 const x=completed();x.assets[0].rawPageImagePersisted=true;
 assert.throws(()=>validateProgress(x,input(),[p]),/PRIVATE_MATERIAL/);
});
test('private durable checkpoint permissions 0600',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-ocr-'));
 try{
   const state=path.join(dir,'checkpoint.json');persistCheckpoint(state,completed());
   assert.equal(fs.statSync(state).mode&0o777,0o600);
   assert.equal(validateProgress(JSON.parse(fs.readFileSync(state)),input(),[p]).results.length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('negative, fractional, NaN and excessive OCR batch sizes fail closed',()=>{
 for(const v of [-1,1.5,'NaN',113,-20,'-2']){
   assert.throws(()=>validatePageBudget(v),/INVALID_OCR_BATCH_OR_PILOT_LIMIT/);
 }
 assert.equal(validatePageBudget('20'),20);
 assert.equal(validatePageBudget(0),0);
});
