import test from 'node:test';
import assert from 'node:assert/strict';
import {planAssets,checkBounds} from '../qbank/verify-grade910-pdf-physical-page-bounds-20261016.mjs';
const entry={recordId:'pectaa-catalog-009',pdfSha256:'a'.repeat(64),pdfPageCount:180,sourceCacheRef:'safe/path.pdf',grade:9};
const claim=(page,kind='author_page_claim',id='Q-1')=>({id,catalog:'pectaa-catalog-009',claimKind:kind,claimedPage:page});
test('only referenced catalogs are selected; no other school source disclosures',()=>{
 const out=planAssets({entries:[entry,{...entry,recordId:'other'}]}, {recordIdsAndClaimsOnly:[claim(7)]});
 assert.equal(out.length,1);assert.equal(out[0].id,'pectaa-catalog-009');
});
test('unknown source catalog always fails closed',()=>{
 assert.throws(()=>planAssets({entries:[entry]},{recordIdsAndClaimsOnly:[{catalog:'fake'}]}),/CATALOG_MISSING/);
});
test('actual PDF page count, not manifest value, decides numeric claim range',()=>{
 const pdf=[{id:'pectaa-catalog-009',actualPages:80}];
 const out=checkBounds(pdf,{recordIdsAndClaimsOnly:[claim(79),claim(81)]});
 assert.equal(out[0].withinActualPdfPageCount,true);
 assert.equal(out[1].withinActualPdfPageCount,false);
});
test('zero, fractional, and negative page claims fail closed',()=>{
 const pdf=[{id:'pectaa-catalog-009',actualPages:180}];
 const out=checkBounds(pdf,{recordIdsAndClaimsOnly:[claim(0),claim(-1),claim(1.3)]});
 assert.ok(out.every(x=>!x.withinActualPdfPageCount));
});
test('TOC page claims are never upgraded to exact textbook question pages',()=>{
 const out=checkBounds([{id:'pectaa-catalog-009',actualPages:180}],{recordIdsAndClaimsOnly:[claim(9,'toc_page')]});
 assert.equal(out.length,0);
});
test('even valid in-range claim is NOT certified source page or faculty approval',()=>{
 const out=checkBounds([{id:'pectaa-catalog-009',actualPages:180}],{recordIdsAndClaimsOnly:[claim(77)]});
 assert.equal(out[0].withinActualPdfPageCount,true);
 assert.equal(out[0].independentQuestionPageVerified,false);
 assert.equal(out[0].facultyApproved,false);
});
test('unavailable source blocks technical evidence receipt',()=>{
 assert.throws(()=>checkBounds([],{recordIdsAndClaimsOnly:[claim(7)]}),/CLAIM_PDF_UNAVAILABLE/);
});
