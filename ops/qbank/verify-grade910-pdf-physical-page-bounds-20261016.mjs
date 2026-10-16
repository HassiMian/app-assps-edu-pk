#!/usr/bin/env node
// Read-only PDF catalog and stored page-range audit; NEVER a question-page certification.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const repo = '/root/workspace/assps-grade910-metadata-source-claim-20261016';
const catalogPath = process.env.ASSPS_CATALOG || path.join(repo, 'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json');
const claimsPath = process.env.ASSPS_CLAIMS || '/var/lib/assps-grade910-sourceclaims/latest.json';
const cache = process.env.ASSPS_CACHE || '/root/workspace/qbank-source-cache';
const output = process.env.ASSPS_EVIDENCE || '/var/lib/assps-grade910-sourceclaims/physical-page-count.json';
const pdfjs = process.env.ASSPS_PDFJS || '/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
export function planAssets(manifest, claims) {
  if (!Array.isArray(manifest.entries) || !Array.isArray(claims.recordIdsAndClaimsOnly)) throw Error('SCHEMA_UNEXPECTED');
  const index=new Map(manifest.entries.map(x=>[x.recordId,x]));
  const needed=[...new Set(claims.recordIdsAndClaimsOnly.map(q=>q.catalog).filter(Boolean))].sort();
  return needed.map(id=>{
    const e=index.get(id); if(!e)throw Error('CATALOG_MISSING_'+id);
    return {id, hash:e.pdfSha256, ref:e.sourceCacheRef, declaredPages:e.pdfPageCount, grade:e.grade, edition:e.edition};
  });
}
export function checkBounds(assets,claims) {
  const index=new Map(assets.map(x=>[x.id,x]));
  const review=[];
  for(const q of claims.recordIdsAndClaimsOnly) {
    if (q.claimKind!=='author_page_claim') continue;
    const p=index.get(q.catalog);
    if (!p || !Number.isInteger(p.actualPages)) throw Error('CLAIM_PDF_UNAVAILABLE_'+String(q.catalog));
    const page=q.claimedPage;
    review.push({originalId:q.id,sourceCatalog:q.catalog,
      withinActualPdfPageCount:Number.isInteger(page)&&page>=1&&page<=p.actualPages,
      pageCount:p.actualPages,
      independentQuestionPageVerified:false,
      facultyApproved:false});
  }
  return review;
}
const main=async()=>{
  const manifest=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
  const claims=JSON.parse(fs.readFileSync(claimsPath,'utf8'));
  const wanted=planAssets(manifest,claims);
  const {getDocument}=await import(pathToFileURL(pdfjs));
  const assets=[];
  for(const item of wanted) {
    if (!item.hash || !item.ref) throw Error('MISSING_SOURCE_ASSET_'+item.id);
    const full=path.resolve(cache,item.ref);
    if(!full.startsWith(path.resolve(cache)+path.sep) || !full.endsWith('.pdf'))throw Error('UNSAFE_PDF_PATH');
    if(fs.lstatSync(full).isSymbolicLink())throw Error('SYMLINK_REJECTED');
    const bytes=fs.readFileSync(full);
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(hash!==item.hash.toLowerCase()) throw Error('PDF_SHA_MISMATCH_'+item.id);
    if(bytes.toString('ascii',0,5)!=='%PDF-')throw Error('INVALID_PDF_HEADER');
    const d=await getDocument({data:new Uint8Array(bytes),disableFontFace:true,stopAtErrors:true}).promise;
    const actualPages=d.numPages;
    await d.destroy();
    assets.push({catalog:item.id,actualPages,manifestPageCount:item.declaredPages,
      manifestAndActualPageCountAgree:actualPages===item.declaredPages,
      originalPdfBytesHashMatches:true,
      validPhysicalPdfQuestionPageEvidence:false});
  }
  const claimAudit=checkBounds(assets.map(x=>({id:x.catalog,actualPages:x.actualPages})),claims);
  const summary={
    catalogPdfFilesVerified:assets.length,
    pdfPageCountConflicts:assets.filter(x=>!x.manifestAndActualPageCountAgree).length,
    originalAuthorPageClaims:claimAudit.length,
    authorPageClaimsWithinActualPdfRange:claimAudit.filter(x=>x.withinActualPdfPageCount).length,
    authorPageClaimsOutsideActualPdfRange:claimAudit.filter(x=>!x.withinActualPdfPageCount).length,
    independentlyVerifiedQuestionPages:0,
    schoolEditionAdoptionVerified:0,
    publishedQuestions:0,
    databaseWrites:0
  };
  const receipt={schema:'ASSPS_IX_X_PDF_PAGE_COUNT_TECHNICAL_AUDIT_V1',observedUTC:new Date().toISOString(),
    sourceManifestSha256:createHash('sha256').update(fs.readFileSync(catalogPath)).digest('hex'),
    sourceClaimsSha256:createHash('sha256').update(fs.readFileSync(claimsPath)).digest('hex'),
    summary,assets,claimAudit};
  fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});
  const tmp=output+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
  fs.renameSync(tmp,output);
  console.log(JSON.stringify({decision:summary.pdfPageCountConflicts||summary.authorPageClaimsOutsideActualPdfRange?'HOLD_MANIFEST_OR_PAGE_RANGE_CONFLICT':'PHYSICAL_PDF_COUNTS_MATCH_PAGE_CLAIMS_NOT_VERIFIED',
    summary,receiptSHA256:createHash('sha256').update(fs.readFileSync(output)).digest('hex')}));
  if(summary.pdfPageCountConflicts||summary.authorPageClaimsOutsideActualPdfRange)process.exitCode=3;
};
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname))main().catch(e=>{console.error('AUDIT_FAIL_CLOSED',e.message);process.exitCode=3});
