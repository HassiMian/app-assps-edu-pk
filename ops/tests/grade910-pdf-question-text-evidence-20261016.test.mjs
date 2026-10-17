import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,normalize,aggregate,verifiedPdfJsStandardFontDataUrl} from '../qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const stem='Which branch of biological science studies the internal structures of flowering plants?';
const page='The learning task describes biological science in the context of the current chapter. '.repeat(3);
test('exact full stem within readable source PDF text layer is corroborating candidate only',()=>{
 const x=classify(page+'\n'+stem+'\n',stem);
 assert.equal(x.category,'EXACT_STEM_PRESENT_IN_CLAIMED_PDF_PAGE_TEXT_LAYER');
 assert.equal(x.exactPhraseFound,true);
});
test('a short common phrase is not enough to corroborate a textbook page',()=>{
 const x=classify(page+' What is biology?','What is biology?');
 assert.equal(x.category,'STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE');
});
test('a scanned PDF with almost no text layer is not marked wrong or verified',()=>{
 const x=classify('12','What distinguishes a large ecosystem from an isolated biological community?');
 assert.equal(x.category,'TEXT_LAYER_INSUFFICIENT');
 assert.equal(x.exactPhraseFound,false);
});
test('positive vs zero discriminant is not a full-stem match',()=>{
 const y=classify(page+' What does a positive discriminant indicate for a real quadratic equation?',
   'What does a zero discriminant indicate for a real quadratic equation?');
 assert.equal(y.category,'READABLE_TEXT_NO_EXACT_STEM');
});
test('numeric changes in science problems never create a false exact text match',()=>{
 const y=classify(page+' Calculate the energy released during a 30 second observation of the moving particle.',
   'Calculate the energy released during a 20 second observation of the moving particle.');
 assert.equal(y.exactPhraseFound,false);
});
test('line breaks and Unicode punctuation normalize consistently',()=>{
 assert.equal(normalize('Plants—grow\nquickly!'),normalize('plants grow quickly'));
});
test('aggregate counts do not turn lexical similarities into reviewer decisions',()=>{
 const x=aggregate([{category:'TEXT_LAYER_INSUFFICIENT'},{category:'READABLE_TEXT_NO_EXACT_STEM'},{category:'READABLE_TEXT_NO_EXACT_STEM'}]);
 assert.deepEqual(x,{TEXT_LAYER_INSUFFICIENT:1,READABLE_TEXT_NO_EXACT_STEM:2});
});

function tempPdfjsFonts() {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-pdfjs-text-font-'));
 const build=path.join(root,'legacy','build');
 const fonts=path.join(root,'standard_fonts');
 fs.mkdirSync(build,{recursive:true});fs.mkdirSync(fonts);
 for(const f of ['FoxitSerif.pfb','FoxitDingbats.pfb'])fs.writeFileSync(path.join(fonts,f),'fixture');
 return {root,build,fonts,modulePath:path.join(build,'pdf.mjs')};
}
test('text-layer audit passes trusted filesystem PDF.js standard-font root with trailing slash',()=>{
 const f=tempPdfjsFonts();
 try{assert.equal(verifiedPdfJsStandardFontDataUrl(f.modulePath),f.fonts+path.sep);}
 finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('text-layer audit rejects omitted standard fonts, not silently fallback to degraded parser',()=>{
 const f=tempPdfjsFonts();
 try{
  fs.unlinkSync(path.join(f.fonts,'FoxitSerif.pfb'));
  assert.throws(()=>verifiedPdfJsStandardFontDataUrl(f.modulePath),/STANDARD_FONT_ASSET_MISSING/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('text-layer audit rejects symlinked source standard-font directory',()=>{
 const f=tempPdfjsFonts();
 try{
  fs.renameSync(f.fonts,f.fonts+'-other');fs.symlinkSync(f.fonts+'-other',f.fonts,'dir');
  assert.throws(()=>verifiedPdfJsStandardFontDataUrl(f.modulePath),/UNTRUSTED_PDFJS_STANDARD_FONT_ASSET_DIRECTORY/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
