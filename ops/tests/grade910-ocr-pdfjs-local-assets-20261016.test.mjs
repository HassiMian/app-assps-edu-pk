import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {pdfJsLocalResourceUrls} from '../qbank/verify-grade910-scanned-source-ocr-fallback-20261016.mjs';

function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-ocr-decoder-'));
 const build=path.join(dir,'legacy','build');
 const wasm=path.join(dir,'wasm');
 const font=path.join(dir,'standard_fonts');
 for(const d of [build,wasm,font])fs.mkdirSync(d,{recursive:true});
 for(const file of ['openjpeg.wasm','openjpeg_nowasm_fallback.js'])fs.writeFileSync(path.join(wasm,file),'');
 return {dir,modulePath:path.join(build,'pdf.mjs'),wasm,font};
}
test('pdfjs node OCR explicitly resolves local wasm and standard-font URLs',()=>{
 const f=fixture();
 try{
  const x=pdfJsLocalResourceUrls(f.modulePath);
  assert.equal(x.wasmUrl,pathToFileURL(f.wasm+path.sep).href);
  assert.equal(x.standardFontDataUrl,pathToFileURL(f.font+path.sep).href);
  assert.equal(Object.keys(x).length,2);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('missing OpenJPEG decoder fails before any scanned page is processed',()=>{
 const f=fixture();
 try{
  fs.unlinkSync(path.join(f.wasm,'openjpeg.wasm'));
  assert.throws(()=>pdfJsLocalResourceUrls(f.modulePath),/PDFJS_OPENJPEG_DECODER_MISSING/);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('symlinked decoder directory is refused',()=>{
 const f=fixture();
 try{
  const other=path.join(f.dir,'other-wasm');
  fs.renameSync(f.wasm,other);
  fs.symlinkSync(other,f.wasm,'dir');
  assert.throws(()=>pdfJsLocalResourceUrls(f.modulePath),/LOCAL_PDFJS_DECODER_ASSETS_NOT_TRUSTED/);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('no fallback decoder directory is a hard failure',()=>{
 const f=fixture();
 try{
  fs.rmSync(f.wasm,{recursive:true});
  assert.throws(()=>pdfJsLocalResourceUrls(f.modulePath),/LOCAL_PDFJS_DECODER_ASSETS_NOT_TRUSTED/);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
