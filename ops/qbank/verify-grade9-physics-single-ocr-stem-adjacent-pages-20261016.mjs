#!/usr/bin/env node
/** Research-only independent second-pass source PDF corroboration for the ONE Physics IX OCR candidate.
 * Re-check the exact claimed physical PDF page and immediate neighbours. No raw book text/images stored.
 * Never infer textbook adoption, official printed page number, answer accuracy, or academic approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {pdfJsLocalResourceUrls, parseTesseractTSV} from './verify-grade910-scanned-source-ocr-fallback-20261016.mjs';
const R='/root/workspace/assps-grade910-14-numerical-verification-20261016';
const CACHE='/root/workspace/qbank-source-cache';
const MANIFEST='/usr/local/libexec/assps-grade910-sourceclaims/officialSourceManifest.json';
const ORIGINAL=R+'/al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics9EnglishStarter2026.json';
const ORIGINAL_SHA='1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16';
const PDF_SHA='a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794';
const LEDGER='/var/lib/assps-grade910-sourceclaims/998-text-and-ocr-question-page-review-routing-20261016.json';
const OUT='/var/lib/assps-grade910-sourceclaims/physics9-c01-s01-three-page-independent-text-proof-20261016.json';
const PDFJS='/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const CANVAS='/var/www/apex-backend/node_modules/@napi-rs/canvas/index.js';
const ID='IX-PHY-2025-C01-S01';
const CAT='pectaa-catalog-011';
const PAGE=5;
const sha=x=>createHash('sha256').update(x).digest('hex');
export const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function phraseOccurrences(haystack,needle){
 if(typeof needle!=='string'||needle.length<35||needle.split(/\s+/).length<6)throw Error('INSUFFICIENT_PHRASE_FOR_EXACT_PAGE_CORROBORATION');
 const a=' '+normalize(haystack)+' ',b=' '+normalize(needle)+' ';
 if(!b.trim() || b.trim().length<35)return 0;
 let count=0,pos=0;
 while((pos=a.indexOf(b,pos))!==-1){count++;pos+=b.length-1;}
 return count;
}
export function validateReceipt(x){
 const allowedTop=['schema','candidateQuestionId','sourceCatalogId','immutablePDFSHA256',
 'originalFrozenResearchFileSHA256','exactCurrentLiveQuestionRevisionSHA256',
 'originalStemSHA256','sourcePDFPhysicalPages','claimedPDFPhysicalPage',
 'independentPagesChecked','checkedPhysicalPDFPages','pageEvidence',
 'claimedPageStrictExactMatchResearchEvidence','sourceSchoolAdoptedEditionVerified',
 'curriculumAcademicSessionApplicabilityVerified','officialBookPrintedExercisePageVerified',
 'independentPhysicsTeacherAuthenticated','academicQuestionAnswerApproved',
 'paperStudioVerifiedSelectable','rawCopyrightedPageTextPersisted',
 'productionDatabaseWrites'].sort();
 if(!x || JSON.stringify(Object.keys(x).sort())!==JSON.stringify(allowedTop))
  throw Error('PHYSICS_SOURCE_PRIVATE_RECEIPT_MUST_HAVE_EXACT_FIELDS_NO_COPYRIGHTED_TEXT');
 if(x.schema!=='ASSPS_GRADE9_PHYSICS_THREE_PDF_PAGES_UNAPPROVED_OCR_SECOND_PASS_V1'
  || x.candidateQuestionId!==ID||x.sourceCatalogId!==CAT
  || x.immutablePDFSHA256!==PDF_SHA||x.originalFrozenResearchFileSHA256!==ORIGINAL_SHA
  || x.claimedPDFPhysicalPage!==5 || x.sourcePDFPhysicalPages!==204
  || x.independentPagesChecked!==3
  || JSON.stringify(x.checkedPhysicalPDFPages)!=='[4,5,6]'
  || !Array.isArray(x.pageEvidence)||x.pageEvidence.length!==3
  || x.sourceSchoolAdoptedEditionVerified!==false
  || x.curriculumAcademicSessionApplicabilityVerified!==false
  || x.officialBookPrintedExercisePageVerified!==false
  || x.independentPhysicsTeacherAuthenticated!==false
  || x.academicQuestionAnswerApproved!==false
  || x.paperStudioVerifiedSelectable!==false
  || x.rawCopyrightedPageTextPersisted!==false
  || x.productionDatabaseWrites!==0
  || !/^[a-f0-9]{64}$/.test(x.exactCurrentLiveQuestionRevisionSHA256||'')
  || !/^[a-f0-9]{64}$/.test(x.originalStemSHA256||''))
   throw Error('PHYSICS_SOURCE_CANDIDATE_CANNOT_BECOME_ACADEMIC_APPROVAL');
 const cols=['physicalPDFPage','ocrRecognizedWords','ocrAverageConfidence','exactNormalizedPhraseOccurrences','reliability','rawPageTextPersisted'].sort();
 if(x.pageEvidence.some(p=>JSON.stringify(Object.keys(p).sort())!==JSON.stringify(cols)
    || ![4,5,6].includes(p.physicalPDFPage)
    || !Number.isInteger(p.exactNormalizedPhraseOccurrences)||p.exactNormalizedPhraseOccurrences<0
    || !Number.isFinite(p.ocrAverageConfidence)
    || p.rawPageTextPersisted!==false))
   throw Error('PHYSICS_SOURCE_NO_RAW_TEXT_AND_ONLY_PAGE_METADATA');
 if(new Set(x.pageEvidence.map(p=>p.physicalPDFPage)).size!==3)
   throw Error('PHYSICS_SOURCE_DUPLICATE_PAGE');
 if(x.claimedPageStrictExactMatchResearchEvidence !==
    (x.pageEvidence.find(p=>p.physicalPDFPage===5).exactNormalizedPhraseOccurrences>0))
   throw Error('PHYSICS_SOURCE_CANDIDATE_MATCH_STATUS_INCONSISTENT');
 return x;
}
async function build(){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
 const entry=manifest.entries.find(e=>e.recordId===CAT);
 if(!entry||entry.grade!==9||entry.medium!=='English'||entry.pdfPageCount!==204
    ||entry.pdfSha256!==PDF_SHA)throw Error('OFFICIAL_SOURCE_CATALOG_OR_PHYSICS_PDF_CHANGED');
 const cachePath=path.resolve(CACHE,entry.sourceCacheRef);
 if(!cachePath.startsWith(CACHE+path.sep)||!cachePath.endsWith('.pdf')
    ||fs.lstatSync(cachePath).isSymbolicLink())throw Error('UNSAFE_PDF_CACHE_ENTRY');
 const source=fs.readFileSync(cachePath);
 if(sha(source)!==PDF_SHA)throw Error('OFFICIAL_SOURCE_PDF_HASH_DRIFT');
 const f=fs.readFileSync(ORIGINAL);
 if(sha(f)!==ORIGINAL_SHA)throw Error('FROZEN_SEED_QUESTION_SOURCE_HASH_CHANGED');
 const q=JSON.parse(f).drafts.find(x=>x.id===ID);
 const originalStem=q?.content?.en?.stem;
 if(!originalStem || originalStem.length<35 || q?.marks!==2)
   throw Error('PHYSICS_ORIGINAL_SHORT_QUESTION_SCOPE_CHANGED');
 const ledger=JSON.parse(fs.readFileSync(LEDGER,'utf8'));
 const linked=ledger.priorityEvidenceItems.find(x=>x.questionId===ID);
 if(!linked||linked.sourceCatalogId!==CAT||linked.unverifiedOriginalClaimedPdfPage!==5
    ||linked.sourceComparisonEvidenceCategory!=='OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED'
    ||linked.academicApproved!==false)
   throw Error('EXACT_LIVE_CURRENT_SHA_PROVENANCE_WAS_TAMPERED');
 const sql="BEGIN TRANSACTION READ ONLY; SELECT json_build_object('id',metadata->>'seed_id','stem',question_text) FROM question_bank WHERE school_id=1 AND metadata->>'seed_id'='IX-PHY-2025-C01-S01'; COMMIT;";
 const output=execFileSync('runuser',['-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
  {encoding:'utf8',timeout:45000,maxBuffer:100000});
 const row=JSON.parse(output.split('\n').find(l=>l.startsWith('{'))||'{}');
 if(row.id!==ID || row.stem!==originalStem)
  throw Error('CURRENT_LIVE_QUESTION_NOT_SAME_AS_ORIGINAL');
 const {getDocument}=await import(pathToFileURL(PDFJS).href);
 const {createCanvas}=await import(pathToFileURL(CANVAS).href);
 const doc=await getDocument({data:new Uint8Array(source),stopAtErrors:true,
   disableFontFace:true,...pdfJsLocalResourceUrls(PDFJS)}).promise;
 try{
  if(doc.numPages!==204)throw Error('PHYSICAL_SOURCE_PAGES_CHANGED');
  const checks=[];
  for(const number of [4,5,6]){
   const page=await doc.getPage(number);
   const viewport=page.getViewport({scale:2});
   const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const png=await canvas.encode('png');
   const tsv=execFileSync('tesseract',['stdin','stdout','-l','eng','tsv'],
    {input:png,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024,stdio:['pipe','pipe','ignore']});
   const data=parseTesseractTSV(tsv);
   const matches=phraseOccurrences(data.text,originalStem);
   checks.push({physicalPDFPage:number,ocrRecognizedWords:data.tokens,ocrAverageConfidence:data.averageConfidence,
    exactNormalizedPhraseOccurrences:matches,
    reliability:data.tokens>=40&&data.averageConfidence>=70?'READABLE_OCR_RESEARCH_ONLY':'OCR_NOT_TRUSTED',
    rawPageTextPersisted:false});
  }
  return validateReceipt({
   schema:'ASSPS_GRADE9_PHYSICS_THREE_PDF_PAGES_UNAPPROVED_OCR_SECOND_PASS_V1',
   candidateQuestionId:ID,sourceCatalogId:CAT,immutablePDFSHA256:PDF_SHA,
   originalFrozenResearchFileSHA256:ORIGINAL_SHA,
   exactCurrentLiveQuestionRevisionSHA256:linked.currentLiveSchool1FullRevisionSha256,
   originalStemSHA256:sha(Buffer.from(originalStem)),
   sourcePDFPhysicalPages:204,claimedPDFPhysicalPage:PAGE,
   independentPagesChecked:3,checkedPhysicalPDFPages:[4,5,6],pageEvidence:checks,
   claimedPageStrictExactMatchResearchEvidence:checks[1].exactNormalizedPhraseOccurrences>0,
   sourceSchoolAdoptedEditionVerified:false,
   curriculumAcademicSessionApplicabilityVerified:false,
   officialBookPrintedExercisePageVerified:false,
   independentPhysicsTeacherAuthenticated:false,academicQuestionAnswerApproved:false,
   paperStudioVerifiedSelectable:false,rawCopyrightedPageTextPersisted:false,
   productionDatabaseWrites:0});
 }finally{await doc.destroy();}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);
if(invoked){
 if(process.argv.length!==2)throw Error('NO_FLAGS_OR_UNBOUNDED_PDF_SCREENING');
 const d=await build();
 const dir=path.dirname(OUT);
 if(fs.statSync(dir).mode&0o077)throw Error('PRIVATE_SOURCE_RESEARCH_DIR_UNSAFE');
 const tmp=path.join(dir,'.phy9-page-proof-'+process.pid);
 fs.writeFileSync(tmp,JSON.stringify(d,null,2)+'\n',{mode:0o600,flag:'wx'});
 fs.renameSync(tmp,OUT);
 console.log(JSON.stringify({decision:'THREE_PHYSICS_PAGES_RECHECKED_RESEARCH_CANDIDATE_NOT_APPROVED',
  verifiedClaimedPageCandidate:d.claimedPageStrictExactMatchResearchEvidence,
  checkedPages:d.pageEvidence,academicApproved:false}));
}
