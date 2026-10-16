#!/usr/bin/env node
// Targeted, independent, privacy-preserving OCR verification on one immutable
// PECTAA Matric-Tech Grade X PDF page with catalog medium unspecified.
// Do not auto-mark printed exercise pages or approve/publish draft questions.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {pdfJsLocalResourceUrls} from './verify-grade910-scanned-source-ocr-fallback-20261016.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const PDFJS='/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const CANVAS='/var/www/apex-backend/node_modules/@napi-rs/canvas/index.js';
const MANIFEST='/usr/local/libexec/assps-grade910-sourceclaims/officialSourceManifest.json';
const FROZEN='/root/workspace/assps-grade910-14-numerical-verification-20261016/al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/healthSciences10TechStarter2026.json';
const EXPECTED_FROZEN='544e7b9b1dfc157e9b1199606bf5a84d52120534d993b1249f9064c403244a74';
const CACHE='/root/workspace/qbank-source-cache';
const TARGET='/var/lib/assps-grade910-sourceclaims/health-sciences10-tech-c17-page102-bilingual-ocr-20261016.json';
const CLAIMS=['X-HS-TECH-C17-L01','X-HS-TECH-C17-M01','X-HS-TECH-C17-S01'];
const EXPECTED_PDF_SHA='f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906';
const CAT='pectaa-catalog-054',PAGE=102;
export function parseTsv(tsv){
 const rows=[];
 for(const line of String(tsv).split(/\r?\n/).slice(1)){
  const x=line.split('\t');
  if(x.length<12)continue;
  const n=Number(x[10]),word=x.slice(11).join(' ').trim();
  if(word && Number.isFinite(n)&&n>=0)rows.push({word,confidence:n});
 }
 const text=rows.map(x=>x.word).join(' ');
 return {text,tokenCount:rows.length,
  meanConfidence:rows.length?Math.round(rows.reduce((a,x)=>a+x.confidence,0)/rows.length*10)/10:0};
}
export function normalize(s){
 return String(s||'').normalize('NFKC').toLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g,'')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function judgeStem(tsv,stem){
 const d=parseTsv(tsv);
 const normalizedStem=normalize(stem),normText=normalize(d.text);
 const candidate=d.tokenCount>=40 && d.meanConfidence>=70 &&
   normalizedStem.split(' ').length>=6 && normalizedStem.length>=35 &&
   normText.includes(normalizedStem);
 return {tokenCount:d.tokenCount,meanConfidence:d.meanConfidence,
  substantialExactStemResearchCandidate:!!candidate,
  reliability: d.tokenCount>=40 && d.meanConfidence>=70?
   'OCR_RENDER_READABLE_NOT_SOURCE_PAGE_APPROVAL':'OCR_NOT_RELIABLE_FOR_EXACT_STEM'};
}
export function validateReceipt(out){
 const expectedTop=['schema','grade','catalog','page','originalPDFSHA256',
 'originalFrozenQuestionFileSHA256','mediumNotEstablishedByOfficialCatalog',
 'pdfPageCount','languagesTried','results','officialSchoolStreamAdoptionVerified',
 'officialSchoolTextbookEditionVerified','independentlyVerifiedPrintedQuestionPage',
 'authenticatedQualifiedReviewers','academicApprovedQuestions','publishedQuestions',
 'productionDatabaseWrites','rawTextOrPDFImagesPersisted'].sort();
 if(JSON.stringify(Object.keys(out).sort())!==JSON.stringify(expectedTop))
   throw Error('BILINGUAL_OCR_RECEIPT_UNAUTHORIZED_FIELDS_OR_SOURCE_TEXT');
 const questionKeys=['questionId','currentLiveQuestionRevisionSHA256',
 'originalQuestionStemSHA256','languageDiagnostics','verifiedQuestionAnswerPage',
 'teacherApproved','paperStudioVerifiedSelectable'].sort();
 const statsKeys=['tokenCount','meanConfidence','substantialExactStemResearchCandidate','reliability'].sort();
 if(!Array.isArray(out.results)||out.results.some(q=>
   JSON.stringify(Object.keys(q).sort())!==JSON.stringify(questionKeys)
   || JSON.stringify(Object.keys(q.languageDiagnostics||{}).sort())!==JSON.stringify(['eng','urd'])
   || Object.values(q.languageDiagnostics).some(d=>
     JSON.stringify(Object.keys(d).sort())!==JSON.stringify(statsKeys))))
   throw Error('BILINGUAL_OCR_QUESTION_FIELDS_NOT_PRIVATE_METADATA_ONLY');
 if(out.schema!=='ASSPS_C054_PAGE102_BILINGUAL_OCR_RESEARCH_ONLY_V1'
  || out.grade!==10 || out.page!==102 || out.catalog!==CAT
  || out.originalPDFSHA256!==EXPECTED_PDF_SHA
  || out.originalFrozenQuestionFileSHA256!==EXPECTED_FROZEN
  || out.mediumNotEstablishedByOfficialCatalog!==true
  || out.pdfPageCount!==123
  || JSON.stringify(out.languagesTried)!==JSON.stringify(['eng','urd'])
  || out.officialSchoolStreamAdoptionVerified!==false
  || out.officialSchoolTextbookEditionVerified!==false
  || out.independentlyVerifiedPrintedQuestionPage!==false
  || out.authenticatedQualifiedReviewers!==0
  || out.academicApprovedQuestions!==0 || out.publishedQuestions!==0
  || out.productionDatabaseWrites!==0
  || out.rawTextOrPDFImagesPersisted!==false
  || !Array.isArray(out.results)||out.results.length!==3
  || new Set(out.results.map(x=>x.questionId)).size!==3
  || out.results.some(x=>!CLAIMS.includes(x.questionId)
   || typeof x.currentLiveQuestionRevisionSHA256!=='string'
   || x.currentLiveQuestionRevisionSHA256.length!==64
   || !x.languageDiagnostics?.eng || !x.languageDiagnostics?.urd
   || x.verifiedQuestionAnswerPage!==false || x.teacherApproved!==false
   || x.paperStudioVerifiedSelectable!==false
   || typeof x.originalQuestionStem==='string'
   || typeof x.ocrText==='string')
 ){
  throw Error('BILINGUAL_SOURCE_EVIDENCE_CANNOT_IMPERSONATE_ACADEMIC_APPROVAL');
 }
 return out;
}
export async function runLive(){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
 const entry=manifest.entries.find(x=>x.recordId===CAT);
 if(!entry || entry.medium!=='UNSPECIFIED_BY_CATALOG_LABEL'
  || entry.grade!==10 || entry.stream!=='Matric-Tech'
  || entry.pdfSha256!==EXPECTED_PDF_SHA || entry.pdfPageCount!==123)
  throw Error('PUBLIC_CATALOG_IDENTITY_OR_UNKNOWN_MEDIUM_CHANGED');
 const pdfPath=path.resolve(CACHE,entry.sourceCacheRef);
 if(!pdfPath.startsWith(CACHE+path.sep)||!pdfPath.endsWith('.pdf')
  ||fs.lstatSync(pdfPath).isSymbolicLink()||hash(fs.readFileSync(pdfPath))!==EXPECTED_PDF_SHA)
  throw Error('UNTRUSTED_OR_CHANGED_OFFICIAL_SOURCE_PDF');
 const frozenBytes=fs.readFileSync(FROZEN);
 if(hash(frozenBytes)!==EXPECTED_FROZEN)throw Error('IMMUTABLE_3_ORIGINAL_STEM_SOURCE_DRIFT');
 const source=JSON.parse(frozenBytes);
 const original=new Map(source.drafts.filter(x=>CLAIMS.includes(x.id)).map(x=>[x.id,x]));
 if(original.size!==3)throw Error('SOURCE_3_C17_QUESTION_IDS_CHANGED');
 const sql="BEGIN TRANSACTION READ ONLY; SELECT coalesce(json_agg(json_build_object('id',metadata->>'seed_id','stem',question_text)),'[]'::json) FROM question_bank WHERE school_id=1 AND metadata->>'seed_id' IN ('X-HS-TECH-C17-L01','X-HS-TECH-C17-M01','X-HS-TECH-C17-S01'); COMMIT;";
 const proc=execFileSync('runuser',['-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
  {encoding:'utf8',timeout:45000,maxBuffer:1000000});
 const line=proc.split('\n').find(x=>x.startsWith('['));
 const live=new Map(JSON.parse(line||'[]').map(x=>[x.id,x.stem]));
 if(live.size!==3)throw Error('EXACT_LIVE_SCHOOL1_3_QUESTION_SCOPE_CHANGED');
 const cross=JSON.parse(fs.readFileSync('/var/lib/assps-grade910-sourceclaims/998-text-and-ocr-question-page-review-routing-20261016.json'));
 const claims=new Map(cross.priorityEvidenceItems.filter(x=>CLAIMS.includes(x.questionId)).map(x=>[x.questionId,x]));
 if(claims.size!==3 || [...claims.values()].some(x=>x.sourceCatalogId!==CAT
   || x.unverifiedOriginalClaimedPdfPage!==PAGE
   || x.textLayerEvidenceCategory!=='TEXT_LAYER_INSUFFICIENT'
   || !['UNREADABLE_NO_ELIGIBLE_OCR','UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM'].includes(x.sourceComparisonEvidenceCategory)))
   throw Error('UNCHECKED_OR_CHANGED_3_HEALTH_SOURCE_PAGE_CLAIMS');
 for(const id of CLAIMS){
  const f=original.get(id);
  const stem=f.content?.en?.stem;
  if(!stem||stem!==live.get(id))throw Error('SCHOOL1_LIVE_STEM_NO_LONGER_MATCHES_FROZEN_SOURCE');
 }
 const {getDocument}=await import(pathToFileURL(PDFJS).href);
 const {createCanvas}=await import(pathToFileURL(CANVAS).href);
 const bytes=fs.readFileSync(pdfPath);
 let doc=await getDocument({
  data:new Uint8Array(bytes),stopAtErrors:true,disableFontFace:true,
  ...pdfJsLocalResourceUrls(PDFJS)}).promise;
 if(doc.numPages!==123)throw Error('PDF_PHYSICAL_PAGE_COUNT_CHANGED');
 try{
  const p=await doc.getPage(PAGE);
  const viewport=p.getViewport({scale:2});
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  const png=await canvas.encode('png');
  const output={};
  for(const lang of ['eng','urd']){
   const tsv=execFileSync('tesseract',['stdin','stdout','-l',lang,'tsv'],
    {input:png,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024,
      stdio:['pipe','pipe','ignore']});
   output[lang]=tsv;
  }
  const results=CLAIMS.map(id=>{
   const entry=claims.get(id);
   return {questionId:id,
    currentLiveQuestionRevisionSHA256:entry.currentLiveSchool1FullRevisionSha256,
    originalQuestionStemSHA256:hash(Buffer.from(live.get(id))),
    languageDiagnostics:{
      eng:judgeStem(output.eng,live.get(id)),
      urd:judgeStem(output.urd,live.get(id))
    },
    verifiedQuestionAnswerPage:false,teacherApproved:false,paperStudioVerifiedSelectable:false};
  });
  const result=validateReceipt({
   schema:'ASSPS_C054_PAGE102_BILINGUAL_OCR_RESEARCH_ONLY_V1',
   grade:10,catalog:CAT,page:PAGE,
   originalPDFSHA256:EXPECTED_PDF_SHA,
   originalFrozenQuestionFileSHA256:EXPECTED_FROZEN,
   mediumNotEstablishedByOfficialCatalog:true,
   pdfPageCount:doc.numPages,
   languagesTried:['eng','urd'],
   results,
   officialSchoolStreamAdoptionVerified:false,
   officialSchoolTextbookEditionVerified:false,
   independentlyVerifiedPrintedQuestionPage:false,
   authenticatedQualifiedReviewers:0,
   academicApprovedQuestions:0,publishedQuestions:0,productionDatabaseWrites:0,
   rawTextOrPDFImagesPersisted:false});
  const targetDir=path.dirname(TARGET);
  if(fs.statSync(targetDir).mode&0o077)throw Error('PRIVATE_OCR_EVIDENCE_STORAGE_PERMISSIONS');
  const tempfile=path.join(targetDir,'.hs10-ocr-page102-'+process.pid);
  fs.writeFileSync(tempfile,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
  fs.renameSync(tempfile,TARGET);
  process.stdout.write(JSON.stringify({
   decision:'GRADE10_TECH_PAGE102_BILINGUAL_OCR_RESEARCH_NOT_CERTIFIED',
   results:results.map(x=>({questionId:x.questionId,eng:x.languageDiagnostics.eng,
    urd:x.languageDiagnostics.urd})),
   schoolAdoptionVerified:false,academicApproved:0,productionDatabaseWrites:0})+'\n');
 }finally{
  await doc.destroy();
 }
}
const executed=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);
if(executed){
 if(process.argv.length!==2)throw Error('NO_UNBOUNDED_BATCH_OR_ARGS_ALLOWED');
 await runLive();
}
