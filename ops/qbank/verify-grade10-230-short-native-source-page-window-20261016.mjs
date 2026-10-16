#!/usr/bin/env node
// ASSPS Grade IX/X -- independently check 230 incomplete native-text/exercise claims
// against bounded local ORIGINAL PDF physical pages ±1. No raw text persistence.
// A topic, short stem or OCR fragment is NEVER certified as source provenance.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {pdfJsLocalResourceUrls} from './verify-grade910-scanned-source-ocr-fallback-20261016.mjs';
const ROOT='/root/workspace/assps-grade910-14-numerical-verification-20261016';
const PRIVATE='/var/lib/assps-grade910-sourceclaims';
const SOURCE_CACHE='/root/workspace/qbank-source-cache';
const PDFJS='/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const AUTHORING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging');
const EVIDENCE=path.join(PRIVATE,'998-text-and-ocr-question-page-review-routing-20261016.json');
const FROZEN=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json');
const MANIFEST='/usr/local/libexec/assps-grade910-sourceclaims/officialSourceManifest.json';
const TARGET=path.join(PRIVATE,'grade10-230-native-text-source-page-neighborhood-review-20261016.json');
const COUNTS={
 'pectaa-recovered-chemistry10-en-2026':65,
 'pectaa-catalog-017':60,
 'pectaa-catalog-057':30,
 'pectaa-catalog-049':27,
 'pectaa-catalog-054':24,
 'pectaa-catalog-062':24
};
const bytesha=b=>createHash('sha256').update(b).digest('hex');
export function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
export function exactPhrase(hay,stem){
 const phrase=norm(stem),text=' '+norm(hay)+' ';
 if(phrase.split(' ').length<6 || phrase.length<35)return {eligible:false,matches:0};
 const needle=' '+phrase+' ';let pos=0,n=0;
 while((pos=text.indexOf(needle,pos))>=0){n++;pos+=needle.length-1;}
 return {eligible:true,matches:n};
}
export function classify(claimed,neighborhood,eligible){
 if(!eligible)return 'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN';
 if((claimed||0)>0)return 'EXACT_NATIVE_TEXT_ON_CLAIMED_PHYSICAL_PAGE_RESEARCH_ONLY';
 if((neighborhood||0)>0)return 'ONLY_ADJACENT_PHYSICAL_PAGE_TEXT_RESEARCH_ONLY';
 return 'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW';
}
export function validateReceipt(r){
 const cats=Object.keys(COUNTS);
 if(r.schema!=='ASSPS_GRADE10_230_SHORT_NATIVE_SOURCE_PAGE_BOUNDED_V1'
   ||r.scopedExistingClaims!==230
   ||r.originalNativeTextNotVerifiedClaims!==124
   ||r.originalShortAmbiguousClaims!==106
   ||r.numberOfOriginalSourcePDFs!==6
   ||r.asspsAdoptedBookEditionVerified!==false
   ||r.independentlyVerifiedExactExercisePageClaims!==0
   ||r.qualifiedSubjectOrUrduAcademicReviews!==0
   ||r.academicallyApprovedQuestions!==0
   ||r.paperStudioVerifiedSelectableQuestions!==0
   ||r.productionDatabaseWrites!==0
   ||r.originalQuestionsAndTextbookExtractsPersisted!==false
   ||!Array.isArray(r.rows) ||r.rows.length!==230
   ||!Array.isArray(r.pdfs) ||r.pdfs.length!==6
   ||new Set(r.rows.map(x=>x.questionId)).size!==230
   ||new Set(r.pdfs.map(x=>x.sourceCatalogId)).size!==6
   ||r.rows.some(x=> !cats.includes(x.sourceCatalogId)
     || !/^[a-f0-9]{64}$/.test(x.currentLiveRevisionSHA256||'')
     || !/^[a-f0-9]{64}$/.test(x.frozenOriginalStemSHA256||'')
     || !Number.isInteger(x.originalClaimedPhysicalPDFPage)
     || x.originalClaimedPhysicalPDFPage<1
     || !Array.isArray(x.checkedPhysicalPages)
     || x.checkedPhysicalPages.length<2 ||x.checkedPhysicalPages.length>3
     || !x.checkedPhysicalPages.includes(x.originalClaimedPhysicalPDFPage)
     || x.authenticASSPSBookAdoptionProven!==false
     || x.academicallyVerifiedPrintedExercisePage!==false
     || x.academicReviewerAuthenticated!==false
     || x.paperStudioSelectable!==false
     || typeof x.rawPageText==='string'
     || typeof x.originalQuestionText==='string')
  )throw Error('GRADE10_230_NATIVETEXT_MUST_REMAIN_UNAPPROVED_AND_REVISION_BOUND');
 const distribution=Object.fromEntries(Object.entries(COUNTS).sort());
 const actual={};for(const x of r.rows)actual[x.sourceCatalogId]=(actual[x.sourceCatalogId]||0)+1;
 if(JSON.stringify(Object.fromEntries(Object.entries(actual).sort()))!==JSON.stringify(distribution))
  throw Error('GRADE10_230_SOURCE_CATALOG_COUNTS_CHANGED');
 if(r.rows.some(x=>x.reason==='SHORT_STEM_NEEDS_EXERCISE_REVIEW' &&
     x.evidenceDisposition!=='SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN'))
  throw Error('SHORT_106_CANNOT_BECOME_VERIFIED_EXERCISE');
 if(Object.values(r.dispositionCounts||{}).reduce((a,b)=>a+b,0)!==230)
  throw Error('SOURCE_NEARBY_EVIDENCE_COUNTS_NOT_RECONCILED');
 return r;
}
function safeReadJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function prepare(){
 const queue=safeReadJson(EVIDENCE);
 const selection=queue.priorityEvidenceItems.filter(x=>[
   'SHORT_STEM_NEEDS_EXERCISE_REVIEW','TEXT_LAYER_READABLE_NO_EXACT_STEM'].includes(x.sourceComparisonEvidenceCategory));
 if(selection.length!==230 ||queue.reviewCandidates!==998 ||queue.originalSourceClaimIdsPresentInCurrentSchool1LiveBank!==998)
  throw Error('SOURCE_230_CURRENT_SCHOOL1_SCOPE_CHANGED');
 const frozen=safeReadJson(FROZEN);
 const originals=new Map(frozen.rows.map(x=>[x.questionId,x]));
 const entries=new Map(safeReadJson(MANIFEST).entries.map(x=>[x.recordId,x]));
 const groups=new Map();const questions=new Map();const pdfs=[];
 for(const x of selection){
  if(!Object.hasOwn(COUNTS,x.sourceCatalogId))throw Error('UNEXPECTED_SOURCE_BOOK');
  const origin=originals.get(x.questionId);
  if(!origin||origin.sourceCatalogId!==x.sourceCatalogId
     ||origin.originalGradeClaim!==10
     ||origin.schoolAdoptionVerified!==false
     ||origin.approved!==false ||origin.published!==false)
   throw Error('MISSING_FROZEN_RESEARCH_QUESTION_OR_FALSE_APPROVAL');
  const fpath=path.resolve(AUTHORING,origin.sourceFile);
  if(!fpath.startsWith(AUTHORING+path.sep)||fs.lstatSync(fpath).isSymbolicLink())
   throw Error('UNSAFE_FROZEN_ORIGINAL_QUESTION_FILE');
  if(!groups.has(origin.sourceFile)){
   const b=fs.readFileSync(fpath);
   if(bytesha(b)!==origin.originalResearchFileSha256)
    throw Error('FROZEN_SOURCE_RESEARCH_FILE_SHA_DRIFT');
   groups.set(origin.sourceFile,new Map(JSON.parse(b).drafts.map(q=>[q.id,q])));
  }
  const q=groups.get(origin.sourceFile).get(x.questionId);
  const stem=q?.content?.en?.stem;
  if(!stem||typeof stem!=='string')throw Error('ENGLISH_SOURCE_STEM_NOT_FOUND');
  if(q.type!==origin.questionType || q.marks<1)throw Error('ORIGINAL_STEM_TYPE_DRIFT');
  questions.set(x.questionId,{original:origin,claim:x,stem});
 }
 // Actual read-only query, exact School 1 question texts; never alter question bank.
 const ids=selection.map(x=>x.questionId);
 if(ids.some(id=>!/^[A-Z0-9-]{8,80}$/.test(id)))
  throw Error('INVALID_RESEARCH_ID_FOR_READ_ONLY_SCOPE');
 const sql="BEGIN TRANSACTION READ ONLY; SELECT coalesce(json_agg(json_build_object('id',metadata->>'seed_id','stem',question_text)),'[]'::json) FROM question_bank WHERE school_id=1 AND metadata->>'seed_id' IN ("+
  ids.map(id=>"'"+id+"'").join(',')+"); COMMIT;";
 const out=execFileSync('runuser',['-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
  {encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 const live=new Map(JSON.parse(out.split('\n').find(s=>s.startsWith('['))||'[]').map(x=>[x.id,x.stem]));
 if(live.size!==230)throw Error('SCHOOL1_230_CURRENT_QUESTION_STEMS_MISSING');
 for(const id of ids){
  if(questions.get(id).stem!==live.get(id))throw Error('ORIGINAL_RESEARCH_STEM_NOT_CURRENT_LIVE_QUESTION');
 }
 for(const id of Object.keys(COUNTS)){
  const f=entries.get(id);
  if(!f||f.grade!==10||!f.sourceCacheRef||!/^[a-f0-9]{64}$/.test(f.pdfSha256)||f.pdfPageCount<20)
   throw Error('ORIGINAL_SOURCE_DOCUMENT_NOT_REGISTERED');
  const p=path.resolve(SOURCE_CACHE,f.sourceCacheRef);
  if(!p.startsWith(SOURCE_CACHE+path.sep)||!p.endsWith('.pdf')||fs.lstatSync(p).isSymbolicLink())
   throw Error('SOURCE_DOCUMENT_CACHE_PATH_NOT_SAFE');
  if(bytesha(fs.readFileSync(p))!==f.pdfSha256)
   throw Error('SOURCE_PDF_SHA_CHANGED');
  pdfs.push({sourceCatalogId:id,sourcePDFSHA256:f.pdfSha256,physicalPDFPages:f.pdfPageCount,
      originalOfficialCatalogMedium:f.medium,sourcePDF:p});
 }
 return {selection,questions,pdfs};
}
async function main(){
 const {selection,questions,pdfs}=prepare();
 const {getDocument}=await import(pathToFileURL(PDFJS).href);
 const rows=[];const publicPdfInfo=[];
 for(const source of pdfs){
  const candidates=selection.filter(x=>x.sourceCatalogId===source.sourceCatalogId);
  const pages=new Set();
  for(const x of candidates)for(let p=Math.max(1,x.unverifiedOriginalClaimedPdfPage-1);
      p<=Math.min(source.physicalPDFPages,x.unverifiedOriginalClaimedPdfPage+1);p++)pages.add(p);
  const pdf=await getDocument({data:new Uint8Array(fs.readFileSync(source.sourcePDF)),
    stopAtErrors:true,disableFontFace:true,...pdfJsLocalResourceUrls(PDFJS)}).promise;
  const text=new Map();let unreadable=0;
  try{
   if(pdf.numPages!==source.physicalPDFPages)throw Error('SOURCE_DOCUMENT_PAGE_NUMBER_DRIFT');
   for(const n of [...pages].sort((a,b)=>a-b)){
    const p=await pdf.getPage(n);
    const content=await p.getTextContent({disableNormalization:false});
    const plain=content.items.filter(i=>typeof i.str==='string').map(i=>i.str).join(' ');
    text.set(n,plain);
    if(norm(plain).length<40)unreadable++;
   }
   for(const x of candidates){
    const q=questions.get(x.questionId);
    const page=x.unverifiedOriginalClaimedPdfPage;
    const tested=[page-1,page,page+1].filter(p=>p>=1&&p<=pdf.numPages);
    const matching=tested.map(p=>({
      page:p,phrase:exactPhrase(text.get(p)||'',q.stem),
      hasReadableLayer:norm(text.get(p)||'').length>=40
    }));
    const exactClaimed=matching.find(z=>z.page===page).phrase;
    const exactNearby=matching.filter(z=>z.page!==page).reduce((a,z)=>a+z.phrase.matches,0);
    const sourceStemAmbiguous=x.sourceComparisonEvidenceCategory==='SHORT_STEM_NEEDS_EXERCISE_REVIEW';
    const disposition=sourceStemAmbiguous?'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN':
      classify(exactClaimed.matches,exactNearby,exactClaimed.eligible);
    rows.push({
      questionId:x.questionId,
      grade:10,sourceCatalogId:x.sourceCatalogId,
      originalClaimedPhysicalPDFPage:page,
      currentLiveRevisionSHA256:x.currentLiveSchool1FullRevisionSha256,
      frozenOriginalStemSHA256:bytesha(Buffer.from(q.stem)),
      reason:x.sourceComparisonEvidenceCategory,
      fullStemSafeForExactPhrase:!sourceStemAmbiguous&&exactClaimed.eligible,
      checkedPhysicalPages:tested,
      claimedPhysicalPageExactPhraseOccurrences:exactClaimed.matches,
      neighboringPhysicalPageExactPhraseOccurrences:exactNearby,
      claimedPDFPhysicalPageNativeTextReadable:matching.find(z=>z.page===page).hasReadableLayer,
      evidenceDisposition:disposition,
      authenticASSPSBookAdoptionProven:false,
      academicallyVerifiedPrintedExercisePage:false,
      academicReviewerAuthenticated:false,
      paperStudioSelectable:false
    });
   }
  } finally {await pdf.destroy();}
  publicPdfInfo.push({
    sourceCatalogId:source.sourceCatalogId,sourcePDFSHA256:source.sourcePDFSHA256,
    physicalPDFPages:source.physicalPDFPages,
    originalOfficialCatalogMedium:source.originalOfficialCatalogMedium,
    uniquePhysicalPagesNativeTextChecked:pages.size,
    pagesWithInsufficientNativeText:unreadable
  });
 }
 rows.sort((a,b)=>a.sourceCatalogId.localeCompare(b.sourceCatalogId)||a.questionId.localeCompare(b.questionId));
 const distribution={};for(const x of rows)distribution[x.evidenceDisposition]=(distribution[x.evidenceDisposition]||0)+1;
 const receipt=validateReceipt({
   schema:'ASSPS_GRADE10_230_SHORT_NATIVE_SOURCE_PAGE_BOUNDED_V1',
   scopedExistingClaims:230,originalNativeTextNotVerifiedClaims:124,
   originalShortAmbiguousClaims:106,numberOfOriginalSourcePDFs:6,
   numberOfOriginalSourcePhysicalClaimPages:49,
   examinedWindowRadiusInPhysicalPDFPages:1,
   pdfs:publicPdfInfo,rows,dispositionCounts:distribution,
   asspsAdoptedBookEditionVerified:false,
   independentlyVerifiedExactExercisePageClaims:0,
   qualifiedSubjectOrUrduAcademicReviews:0,
   academicallyApprovedQuestions:0,
   paperStudioVerifiedSelectableQuestions:0,
   productionDatabaseWrites:0,
   originalQuestionsAndTextbookExtractsPersisted:false
 });
 if(fs.statSync(PRIVATE).mode&0o077)throw Error('PRIVATE_RECEIPT_DIR_MODE_UNSAFE');
 const tmp=path.join(PRIVATE,'.source-230-review-'+process.pid);
 fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
 fs.renameSync(tmp,TARGET);
 console.log(JSON.stringify({decision:'230_CLAIMED_PAGES_SCREENED_NO_ACADEMIC_CERTIFICATION',
   pageViews:receipt.pdfs.map(p=>[p.sourceCatalogId,p.uniquePhysicalPagesNativeTextChecked,p.pagesWithInsufficientNativeText]),
   categories:receipt.dispositionCounts,schoolAdoption:false,academicApproval:0,productionWrites:0}));
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);
if(invoked){
 if(process.argv.length!==2)throw Error('ONE_BOUNDED_SOURCE_SCAN_ONLY');
 await main();
}
