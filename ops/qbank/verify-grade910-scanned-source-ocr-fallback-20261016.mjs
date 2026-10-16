#!/usr/bin/env node
// Read-only, LAST-RESORT English-only OCR on PDF pages whose native text layer failed.
// No copyrighted text persisted; never auto-signs academic correctness or content page.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {classify,normalize} from './verify-grade910-pdf-question-text-evidence-20261016.mjs';
const root='/root/workspace/assps-grade910-metadata-source-claim-20261016';
const manifestPath=process.env.ASSPS_MANIFEST || path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json');
const textLayerPath=process.env.ASSPS_TEXT_LAYER || '/var/lib/assps-grade910-sourceclaims/question-page-textlayer.json';
const evidencePath=process.env.ASSPS_OCR_EVIDENCE || '/var/lib/assps-grade910-sourceclaims/ocr-fallback.json';
const cacheRoot='/root/workspace/qbank-source-cache';
const pdfjsPath='/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const limit=Number(process.env.ASSPS_OCR_PILOT_PAGES || 0);
const h=b=>createHash('sha256').update(b).digest('hex');
export function parseTesseractTSV(stdout){
 const rows=String(stdout).split(/\r?\n/);
 const words=[];
 for(const row of rows.slice(1)){
  const fields=row.split('\t');
  if(fields.length<12)continue;
  const conf=Number(fields[10]);const word=fields.slice(11).join(' ').trim();
  if(word && Number.isFinite(conf) && conf>=0)words.push({word,conf});
 }
 return {tokens:words.length,averageConfidence:words.length?
   Math.round(10*words.reduce((n,x)=>n+x.conf,0)/words.length)/10:0,
   text:words.map(x=>x.word).join(' ')};
}
export function assessOCR(tsv, stem){
 const data=parseTesseractTSV(tsv);
 const textChars=normalize(data.text).length;
 if(data.tokens<40 || data.averageConfidence<70 || textChars<150)
   return {category:'OCR_NOT_RELIABLE_FOR_EXACT_STEM',tokens:data.tokens,
    meanConfidence:data.averageConfidence,exactStem:false};
 const proof=classify(data.text,stem);
 return {category:proof.exactPhraseFound?'HIGH_CONFIDENCE_OCR_EXACT_STEM_CANDIDATE':'READABLE_OCR_NO_EXACT_STEM',
  tokens:data.tokens,meanConfidence:data.averageConfidence,exactStem:proof.exactPhraseFound};
}
export function selectUniquePages(records, manifest, maxPages=0) {
 const source=new Map(manifest.entries.map(x=>[x.recordId,x]));
 const catalogPages=new Map();
 let excluded=0;
 for(const r of records){
  if(r.category!=='TEXT_LAYER_INSUFFICIENT')continue;
  const e=source.get(r.sourceCatalog);
  if(!e)throw Error('MISSING_OFFICIAL_CATALOG');
  if(e.medium!=='English'){excluded++;continue;}
  if(!catalogPages.has(r.sourceCatalog))catalogPages.set(r.sourceCatalog,new Map());
  const pages=catalogPages.get(r.sourceCatalog);
  if(!pages.has(r.originallyClaimedPdfPage))pages.set(r.originallyClaimedPdfPage,[]);
  pages.get(r.originallyClaimedPdfPage).push(r);
 }
 const queues=[...catalogPages].map(([id,pages])=>({id,pages:[...pages].sort((a,b)=>a[0]-b[0])}));
 // A small pilot samples across catalogs. Full runs group pages by source PDF
 // to avoid reloading enormous scanned book images for every page.
 const fullOrder=queues.flatMap(q=>q.pages.map(([page,claims])=>({catalog:q.id,page,claims})));
 const roundRobin=[];
 if(maxPages>0){
   for(let i=0;queues.some(q=>i<q.pages.length);i++){
     for(const q of queues)if(i<q.pages.length)roundRobin.push({catalog:q.id,page:q.pages[i][0],claims:q.pages[i][1]});
   }
 }
 return {selected:maxPages>0?roundRobin.slice(0,maxPages):fullOrder,
  eligiblePages:fullOrder.length,eligibleQuestionClaims:fullOrder.reduce((n,x)=>n+x.claims.length,0),
  skippedNonEnglishClaims:excluded};
}
function sourceQuestionStems(){
 const sql=`BEGIN TRANSACTION READ ONLY; SELECT json_agg(json_build_object('id',metadata->>'seed_id','stem',question_text))
 FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th'); COMMIT;`;
 const out=execFileSync('runuser',['-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
    {encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024});
 const lines=out.split('\n').filter(x=>x.startsWith('['));
 if(lines.length!==1)throw Error('LIVE_STEM_SQL_MISSING');
 const rows=JSON.parse(lines[0]);
 if(rows.length!==2411)throw Error('LIVE_QUESTION_COUNT_DRIFT');
 return new Map(rows.map(x=>[x.id,x.stem]));
}
async function main(){
 const man=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const layer=JSON.parse(fs.readFileSync(textLayerPath,'utf8'));
 if(layer.summary?.claimsChecked!==998)throw Error('ORIGINAL_TEXT_LAYER_PROOF_MISSING');
 const selection=selectUniquePages(layer.records,man,limit);
 if(selection.eligibleQuestionClaims<700)throw Error('OCR_CANDIDATE_COHORT_UNEXPECTED');
 const stems=sourceQuestionStems();
 const catalog=new Map(man.entries.map(x=>[x.recordId,x]));
 const {getDocument}=await import(pathToFileURL(pdfjsPath).href);
 const {createCanvas}=await import(pathToFileURL('/var/www/apex-backend/node_modules/@napi-rs/canvas/index.js').href);
 const results=[],assets=[];
 let currentId=null,currentDoc=null,currentHash=null,currentCount=0;
 for(const item of selection.selected){
  const e=catalog.get(item.catalog);
  if(currentId!==item.catalog){
   if(currentDoc)await currentDoc.destroy();
   const pdfPath=path.resolve(cacheRoot,e.sourceCacheRef);
   if(!pdfPath.startsWith(path.resolve(cacheRoot)+path.sep) || !pdfPath.endsWith('.pdf') || fs.lstatSync(pdfPath).isSymbolicLink())
      throw Error('UNSAFE_CACHED_PDF_PATH');
   const bytes=fs.readFileSync(pdfPath);
   if(h(bytes)!==e.pdfSha256.toLowerCase())throw Error('OCR_PDF_HASH_MISMATCH');
   currentDoc=await getDocument({data:new Uint8Array(bytes),disableFontFace:true,stopAtErrors:true}).promise;
   if(currentDoc.numPages!==e.pdfPageCount)throw Error('OCR_PDF_PAGE_COUNT_MISMATCH');
   currentId=item.catalog;currentHash=e.pdfSha256;currentCount=0;
  }
  const page=await currentDoc.getPage(item.page);
  const viewport=page.getViewport({scale:2});
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  const png=await canvas.encode('png');
  // TIFF/PNG bytes only go through memory stdin; never persisted to disk or user output.
  let tsv='';
  try{
   tsv=execFileSync('tesseract',['stdin','stdout','-l','eng','tsv'],{
     input:png,maxBuffer:10*1024*1024,timeout:35000,encoding:'utf8',stdio:['pipe','pipe','ignore']
   });
  }catch(e){tsv='';}
  const languageStats=parseTesseractTSV(tsv);
  for(const q of item.claims){
    const stem=stems.get(q.questionId);
    if(!stem)throw Error('UNRESOLVED_LIVE_QUESTION_STEM');
    const diagnosis=assessOCR(tsv,stem);
    results.push({questionId:q.questionId,catalog:item.catalog,page:item.page,
      category:diagnosis.category,recognizedWords:diagnosis.tokens,
      averageConfidence:diagnosis.meanConfidence,
      exactStemCandidate:diagnosis.exactStem,
      academicQuestionContentPageVerified:false,
      qualifiedFacultyApproved:false,autoPublished:false});
  }
  assets.push({catalog:item.catalog,page:item.page,ocrWords:languageStats.tokens,
    ocrMeanConfidence:languageStats.averageConfidence,
    rawPageImagePersisted:false,rawOCRTextPersisted:false});
  page.cleanup();currentCount++;
  if(currentCount%8===0 && global.gc)global.gc();
 }
 if(currentDoc)await currentDoc.destroy();
 const buckets={};
 for(const r of results)buckets[r.category]=(buckets[r.category]||0)+1;
 const summary={eligibleEnglishOnlySourceClaims:selection.eligibleQuestionClaims,
   excludedNonEnglishOrUnknownMediumClaims:selection.skippedNonEnglishClaims,
   uniquePagesEligibleForLastResortOCR:selection.eligiblePages,
   pagesScannedNow:selection.selected.length,
   claimsCoveredNow:results.length,
   categories:buckets,
   highConfidenceStrictExactStemCandidateCount:results.filter(x=>x.exactStemCandidate).length,
   independentQuestionContentPagesVerified:0,reviewerApprovals:0,
   publishedQuestions:0,productionDatabaseWrites:0,
   rawOCRTextPersisted:false,rawBookPageImagesPersisted:false,
   scope:limit?'PILOT_PARTIAL_EVIDENCE':'ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES'};
 const out={schema:'ASSPS_IX_X_SCANNED_PDF_OCR_FALLBACK_V1',
   observedUTC:new Date().toISOString(),textLayerSourceSHA256:h(fs.readFileSync(textLayerPath)),
   summary,assets,records:results};
 fs.mkdirSync(path.dirname(evidencePath),{recursive:true,mode:0o700});
 const tmp=evidencePath+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(out,null,2)+'\n',{mode:0o600,flag:'wx'});
 fs.renameSync(tmp,evidencePath);
 console.log(JSON.stringify({decision:'OCR_EVIDENCE_SCREEN_NOT_ACADEMIC_APPROVAL',summary,
   privateReceiptSHA256:h(fs.readFileSync(evidencePath))}));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error('OCR_FAIL_CLOSED',e.message);process.exitCode=3});
