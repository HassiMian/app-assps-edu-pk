#!/usr/bin/env node
// ASSPS Academic Master: read-only original PDF-text-layer evidence screen.
// Strict exact-phrase corroboration only; never authentic textbook adoption,
// exercise/page certification, signed faculty review or answer-key verification.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const base='/root/workspace/assps-grade910-metadata-source-claim-20261016';
const manifestPath=process.env.ASSPS_MANIFEST || path.join(base,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json');
const claimsPath=process.env.ASSPS_CLAIMS || '/var/lib/assps-grade910-sourceclaims/latest.json';
const cacheRoot=process.env.ASSPS_CACHE || '/root/workspace/qbank-source-cache';
const evidencePath=process.env.ASSPS_TEXT_EVIDENCE || '/var/lib/assps-grade910-sourceclaims/question-page-textlayer.json';
const pdfjsModule=process.env.ASSPS_PDFJS || '/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const strictQLength=40;
export function normalize(s) {
 return String(s??'').normalize('NFKC').toLocaleLowerCase('en')
   .replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
}
export function classify(extractedText,stem) {
 const normalizedText=normalize(extractedText);
 const normalizedStem=normalize(stem);
 const chars=normalizedText.length;
 const tokens=normalizedStem.split(' ').filter(Boolean);
 if(chars<150) return {category:'TEXT_LAYER_INSUFFICIENT',textChars:chars,exactPhraseFound:false};
 // Do not match common generic question phrases, short prompts, or answer fragments.
 if(normalizedStem.length<strictQLength || tokens.length<7)
   return {category:'STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE',textChars:chars,exactPhraseFound:false};
 const exact=normalizedText.includes(normalizedStem);
 return {category:exact?'EXACT_STEM_PRESENT_IN_CLAIMED_PDF_PAGE_TEXT_LAYER':'READABLE_TEXT_NO_EXACT_STEM',
         textChars:chars,exactPhraseFound:exact};
}
export function aggregate(rows) {
 const counts={};
 for(const row of rows) counts[row.category]=(counts[row.category]||0)+1;
 return counts;
}
function sha256(buffer) {return createHash('sha256').update(buffer).digest('hex')}
function liveStems() {
 const sql=`BEGIN TRANSACTION READ ONLY;
 SELECT json_agg(json_build_object('id',metadata->>'seed_id','stem',question_text))
 FROM public.question_bank
 WHERE school_id=1 AND class_level IN ('9th','10th');
 COMMIT;`;
 const stdout=execFileSync('runuser',['-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
   '-d','apexos','-c',sql],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000});
 const lines=stdout.split('\n').filter(x=>x.startsWith('['));
 if(lines.length!==1)throw Error('LIVE_STEM_READONLY_AGGREGATE_MISSING');
 const rows=JSON.parse(lines[0]);
 if(rows.length!==2411)throw Error('LIVE_CORPUS_DRIFT_FOR_SOURCE_EVIDENCE');
 const stems=new Map(rows.map(x=>[x.id,x.stem]));
 if(stems.size!==2411 || [...stems.values()].some(x=>!x)) throw Error('SOURCE_STEM_MISSING_OR_DUPLICATED');
 return stems;
}
async function main() {
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const source=JSON.parse(fs.readFileSync(claimsPath,'utf8'));
 const stemMap=liveStems();
 const claims=source.recordIdsAndClaimsOnly.filter(x=>x.claimKind==='author_page_claim');
 if(claims.length!==998) throw Error('ORIGINAL_CLAIM_COUNT_DRIFT');
 const catalog=new Map(manifest.entries.map(x=>[x.recordId,x]));
 const groups=new Map();
 for(const q of claims) {
   if(!stemMap.has(q.seedId))throw Error('QUESTION_SEED_ID_MISSING_'+q.seedId);
   if(!Number.isInteger(q.claimedPage) || q.claimedPage<1)throw Error('INVALID_CLAIMED_PAGE');
   if(!groups.has(q.catalog))groups.set(q.catalog,new Map());
   const pages=groups.get(q.catalog);
   if(!pages.has(q.claimedPage))pages.set(q.claimedPage,[]);
   pages.get(q.claimedPage).push(q);
 }
 const {getDocument}=await import(pathToFileURL(pdfjsModule).href);
 const results=[];
 const assets=[];
 for(const [id,pages] of groups) {
   const e=catalog.get(id);
   if(!e || !e.sourceCacheRef || !e.pdfSha256)throw Error('UNVERIFIED_OFFICIAL_CATALOG_'+id);
   const full=path.resolve(cacheRoot,e.sourceCacheRef);
   if(!full.startsWith(path.resolve(cacheRoot)+path.sep) || path.extname(full).toLowerCase()!=='.pdf')
      throw Error('UNSAFE_SOURCE_CACHE_REF');
   if(fs.lstatSync(full).isSymbolicLink())throw Error('REFUSE_SOURCE_SYMLINK');
   const bytes=fs.readFileSync(full);
   if(sha256(bytes)!==e.pdfSha256.toLowerCase())throw Error('PDF_BYTE_HASH_CONFLICT_'+id);
   const pdf=await getDocument({data:new Uint8Array(bytes),stopAtErrors:true,disableFontFace:true}).promise;
   if(pdf.numPages!==e.pdfPageCount)throw Error('PDF_PAGE_COUNT_CONFLICT_'+id);
   let readablePages=0,unreadablePages=0;
   for(const [page, pageClaims] of pages) {
     if(page>pdf.numPages)throw Error('AUTHOR_PAGE_BEYOND_PDF_'+id);
     let layer='';
     let extractionFailed=false;
     try {
       const pageObject=await pdf.getPage(page);
       const content=await pageObject.getTextContent();
       layer=content.items.map(x=>x.str||'').join(' ');
     }catch(err) {
       extractionFailed=true;
     }
     const textHash=sha256(Buffer.from(normalize(layer),'utf8'));
     if(normalize(layer).length>=150)readablePages++;else unreadablePages++;
     for(const claim of pageClaims) {
       const assessment=extractionFailed
        ? {category:'TEXT_LAYER_EXTRACTION_FAILED',textChars:0,exactPhraseFound:false}
        : classify(layer,stemMap.get(claim.seedId));
       results.push({
         questionId:claim.seedId,
         sourceCatalog:id,
         originallyClaimedPdfPage:page,
         pdfTextLayerSHA256:textHash,
         category:assessment.category,
         extractedTextCharacterCount:assessment.textChars,
         strictExactStemPresent:assessment.exactPhraseFound,
         actualQuestionPageAcademicallyVerified:false,
         genuineQualifiedFacultyApproved:false,
         approvedForPaperStudio:false
       });
     }
   }
   assets.push({catalog:id,pdfSha256:e.pdfSha256,claimedPagesChecked:pages.size,
     pagesWithUsableTextLayer:readablePages,pagesWithoutUsableTextLayer:unreadablePages});
   await pdf.destroy();
 }
 results.sort((a,b)=>a.questionId.localeCompare(b.questionId));
 if(results.length!==998)throw Error('EVIDENCE_COVERAGE_LESS_THAN_998');
 const summary={
    claimsChecked:results.length,
    catalogs:assets.length,
    distinctPdfPagesChecked:assets.reduce((n,x)=>n+x.claimedPagesChecked,0),
    categories:aggregate(results),
    strictExactStemMatches:results.filter(x=>x.strictExactStemPresent).length,
    independentlyVerifiedQuestionPages:0,
    genuineFacultyApproved:0,
    newPublishedQuestions:0,
    productionDatabaseWrites:0,
    OCRUsed:false,
    sourceTextOrQuestionTextPersisted:false
 };
 const receipt={schema:'ASSPS_IX_X_STRICT_TEXT_LAYER_STEM_MATCH_V1',
   observedUTC:new Date().toISOString(),sourceManifestSHA256:sha256(fs.readFileSync(manifestPath)),
   originalClaimsSHA256:sha256(fs.readFileSync(claimsPath)),summary,assets,records:results};
 fs.mkdirSync(path.dirname(evidencePath),{recursive:true,mode:0o700});
 const tmp=evidencePath+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
 fs.renameSync(tmp,evidencePath);
 console.log(JSON.stringify({decision:'TEXT_LAYER_SCREEN_COMPLETE_NO_ACADEMIC_PUBLICATION',summary,
   receiptSHA256:sha256(fs.readFileSync(evidencePath))}));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{console.error('SOURCE_TEXT_SCREEN_FAIL_CLOSED',err.message);process.exitCode=3});
