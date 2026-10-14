#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {scan}=require('./audit-cached-pdf-inventory.cjs')
const {manifest}=require('./verify-source-evidence.cjs')

const ROOT=path.resolve(__dirname,'../..')
const DEFAULT_JSON=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json')
const DEFAULT_MD=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.md')
function sha256File(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function asQueue(audit){return {
 schemaVersion:'assps-g910-pdf-source-cache-review-queue-v2',
 scope:'SOURCE_INTEGRITY_ONLY_NO_ACADEMIC_APPROVAL',
 ledgerSha256:manifest.sourceSha256,
 sourceCacheAudit:{cachedPdfFiles:audit.cachedPdfFiles,catalogRecords:audit.catalogRecords,expectedHashCatalogRecords:audit.expectedHashCatalogRecords,exactHashMatches:audit.catalogHashMatches,missingKnownSources:audit.missingCachedSourceRecords.length,missingLedgerHashes:audit.catalogWithoutExpectedHash.length,unmatchedLocalPdfs:audit.cacheFilesNotMatchedToCatalog.length},
 metrics:{cachedPdfFiles:audit.cachedPdfFiles,catalogRecords:audit.catalogRecords,expectedHashCatalogRecords:audit.expectedHashCatalogRecords,exactHashMatches:audit.catalogHashMatches,missingKnownSources:audit.missingCachedSourceRecords.length,missingLedgerHashes:audit.catalogWithoutExpectedHash.length,unmatchedLocalPdfs:audit.cacheFilesNotMatchedToCatalog.length},
 reviewQueue:audit.catalog.filter(x=>x.cachedHashVerified),
 missingSourceCatalogIds:audit.missingCachedSourceRecords,
 catalogWithoutExpectedHash:audit.catalogWithoutExpectedHash,
 unmatchedLocalPdfs:audit.cacheFilesNotMatchedToCatalog,
 academicApprovalGranted:false,
}}
function markdown(q){const m=q.metrics;const lines=[
'# ASSPS Grade IX/X PDF Source Cache Review Queue — 2026-10-08','',
'> Source-integrity inventory only. Exact PDF hash matching does **not** grant academic approval or page/exercise verification.','',
'## Current cache truth','',
`- Cached PDF files: **${m.cachedPdfFiles}**`,
`- Official manifest records: **${m.catalogRecords}**`,
`- Records with an expected PDF hash: **${m.expectedHashCatalogRecords}**`,
`- Exact cached hash matches: **${m.exactHashMatches}**`,
`- Known-hash sources still missing: **${m.missingKnownSources}**`,
`- Manifest records without a locked ledger hash: **${m.missingLedgerHashes}**`,
`- Local PDFs not yet matched by an exact manifest hash: **${m.unmatchedLocalPdfs}**`,
`- Academic approvals granted by this audit: **0**`,'',
'## Exact-hash review queue','',
'| Record | Grade | Subject | Medium | Cached PDF(s) | Chapter status | Exercise status |',
'|---|---:|---|---|---|---|---|'
];for(const r of q.reviewQueue){lines.push(`| ${r.recordId} | ${r.grade} | ${String(r.subject).replace(/\|/g,'/')} | ${r.medium} | ${r.matchingCachedPdfs.join(', ')} | ${r.chapterStatus} | ${r.exerciseStatus} |`)}
lines.push('','## Missing known-hash sources','',q.missingSourceCatalogIds.length?q.missingSourceCatalogIds.map(x=>`- ${x}`).join('\n'):'- None','', '## Unmatched local PDFs','',q.unmatchedLocalPdfs.length?q.unmatchedLocalPdfs.map(x=>`- ${x}`).join('\n'):'- None','', '## Safety rule','', 'Do not infer catalog identity from a filename. A local PDF remains unmatched until its exact hash is tied to a verified manifest record. Hash agreement alone still does not verify the printed chapter/page/exercise map or answer correctness.','');return lines.join('\n')}
async function main(){const args=process.argv.slice(2);const i=args.indexOf('--source-cache');if(i<0||!args[i+1])throw Error('Requires --source-cache DIRECTORY');const cache=path.resolve(args[i+1]);const audit=await scan(cache);const queue=asQueue(audit);if(args.includes('--write')){fs.writeFileSync(DEFAULT_JSON,JSON.stringify(queue,null,2)+'\n');fs.writeFileSync(DEFAULT_MD,markdown(queue).trimEnd()+'\n')}console.log(JSON.stringify(queue,null,2))}
if(require.main===module)main().catch(e=>{console.error('CACHE_QUEUE_WRITE_FAIL',e.message);process.exitCode=2})
module.exports={asQueue,markdown}
