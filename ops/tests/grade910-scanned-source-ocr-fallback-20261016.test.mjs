import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTesseractTSV,assessOCR,selectUniquePages} from '../qbank/verify-grade910-scanned-source-ocr-fallback-20261016.mjs';
const makeTSV=(words,conf=90)=>'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+
words.map((w,i)=>[5,1,1,1,1,i+1,0,0,12,12,conf,w].join('\t')).join('\n');
const stem='Explain how the microscopic structures of flowers are related to their biological reproductive functions in nature';
test('OCR parser keeps confidences, drops headers, and does not export textbook content',()=>{
 const data=parseTesseractTSV(makeTSV(['Biology','science','chapter'],88));
 assert.equal(data.tokens,3);assert.equal(data.averageConfidence,88);
});
test('short or low-confidence OCR must not certify page content',()=>{
 assert.equal(assessOCR(makeTSV(stem.split(' ')),stem).category,'OCR_NOT_RELIABLE_FOR_EXACT_STEM');
 const words=[...Array(35)].flatMap(()=>['Plants','cells']);
 assert.equal(assessOCR(makeTSV(words,50),stem).category,'OCR_NOT_RELIABLE_FOR_EXACT_STEM');
});
test('high-confidence OCR full exact stem can only create source evidence candidate',()=>{
 const words=[...Array(36)].flatMap(()=>['Plant','biology']);
 words.push(...stem.split(' '));
 const result=assessOCR(makeTSV(words),stem);
 assert.equal(result.category,'HIGH_CONFIDENCE_OCR_EXACT_STEM_CANDIDATE');
 assert.equal(result.exactStem,true);
});
test('different numerals do not count as OCR exact matches',()=>{
 const tokens=[...Array(40)].flatMap(()=>['This','experiment']);
 tokens.push(...stem.replace('nature','2026').split(' '));
 const x=assessOCR(makeTSV(tokens),stem.replace('nature','2025'));
 assert.equal(x.exactStem,false);
});
test('English-only OCR excludes Urdu and undefined manifest language',()=>{
 const manifest={entries:[{recordId:'en',medium:'English'},{recordId:'ur',medium:'Urdu'},{recordId:'un',medium:'UNSPECIFIED_BY_CATALOG_LABEL'}]};
 const records=[{category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:'en',originallyClaimedPdfPage:5},
   {category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:'en',originallyClaimedPdfPage:5},
   {category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:'ur',originallyClaimedPdfPage:6},
   {category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:'un',originallyClaimedPdfPage:7}];
 const r=selectUniquePages(records,manifest);
 assert.equal(r.eligibleQuestionClaims,2);
 assert.equal(r.eligiblePages,1);
 assert.equal(r.skippedNonEnglishClaims,2);
});
test('pilot is a bounded subset and never silently changes the total eligible cohort',()=>{
 const manifest={entries:[{recordId:'a',medium:'English'},{recordId:'b',medium:'English'}]};
 const rows=[];
 for(const id of ['a','b'])for(const n of [1,2,3]) rows.push({category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:id,originallyClaimedPdfPage:n});
 const v=selectUniquePages(rows,manifest,2);
 assert.equal(v.eligiblePages,6);assert.equal(v.selected.length,2);
 assert.deepEqual(v.selected.map(x=>x.catalog),['a','b']);
});
test('full source OCR groups physical pages per PDF instead of reloading on every page',()=>{
 const manifest={entries:[{recordId:'a',medium:'English'},{recordId:'b',medium:'English'}]};
 const rows=[];
 for(const n of [1,2,3])for(const catalog of ['a','b'])rows.push({category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:catalog,originallyClaimedPdfPage:n});
 const full=selectUniquePages(rows,manifest);
 assert.equal(full.selected.length,6);
 assert.deepEqual(full.selected.map(x=>x.catalog),['a','a','a','b','b','b']);
});
test('source catalog missing must fail closed',()=>{
 assert.throws(()=>selectUniquePages([{category:'TEXT_LAYER_INSUFFICIENT',sourceCatalog:'unknown'}],{entries:[]}),/MISSING_OFFICIAL_CATALOG/);
});
