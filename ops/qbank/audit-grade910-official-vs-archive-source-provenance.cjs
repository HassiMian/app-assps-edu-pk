#!/usr/bin/env node
'use strict'
// Separate official PECTAA listing evidence, independently cached asset bytes and school adoption.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const CATALOG=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ORIGINAL_2581_PDF_BYTE_LINEAGE_20261012.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_OFFICIAL_LINK_VS_ARCHIVE_SOURCE_PROVENANCE_20261012.json')
const MD=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_OFFICIAL_LINK_VS_ARCHIVE_SOURCE_PROVENANCE_20261012.md')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('ASSPS_GRADE910_SOURCE_HOST_PROVENANCE_'+x)}
const linkClass=(status)=>{
 if(['OFFICIAL_GRADE_SPECIFIC_LINK_RESOLVED','OFFICIAL_PAGE_ANCHOR_FOUND'].includes(status))
  return 'OFFICIAL_CATALOG_LINK_EVIDENCE_CLAIM'
 if(typeof status==='string'&&status.includes('ARCHIVE'))return 'ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK'
 return 'UNRESOLVED_CATALOG_TO_ASSET_PROVENANCE'
}
function host(v){
 try{const u=new URL(v);return u.protocol==='https:'?u.hostname.toLowerCase():'NON_HTTPS'}catch{return 'NOT_RECORDED'}
}
function make(){
 const orig=JSON.parse(fs.readFileSync(CATALOG,'utf8'))
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'))
 const mapping=new Map(orig.catalogs.map(x=>[x.recordId,x]))
 if(orig.originalCandidates!==2581||orig.catalogs.length!==111||
  manifest.entries.length!==111||mapping.size!==111)fail('SOURCE_CATALOG_COHORT_CHANGED')
 const types={},records=[],counts={anchorLinked:0,archiveRecovered:0,uncertain:0,
  originalAnchorLinked:0,originalArchiveRecovered:0,originalUnresolved:0}
 for(const entry of manifest.entries){
  const mapped=mapping.get(entry.recordId)
  if(!mapped)fail('CATALOG_RECORD_WITHOUT_PDF_COHORT')
  const s=linkClass(entry.catalogLinkStatus)
  const count=mapped.originalQuestionReferences
  if(s==='OFFICIAL_CATALOG_LINK_EVIDENCE_CLAIM'){counts.anchorLinked++;counts.originalAnchorLinked+=count}
  else if(s==='ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK'){counts.archiveRecovered++;counts.originalArchiveRecovered+=count}
  else{counts.uncertain++;counts.originalUnresolved+=count}
  if(!types[s])types[s]={sourceDocuments:0,originalQuestions:0}
  types[s].sourceDocuments++;types[s].originalQuestions+=count
  records.push({catalogId:entry.recordId,gradeCatalogLabel:entry.grade,
   subjectCatalogLabel:entry.subject,mediumCatalogLabel:entry.medium,
   editionCatalogLabel:entry.edition,officialListingAuthority:'PECTAA_PUNJAB',
   officialListingUrl:entry.catalogEvidenceUrl,
   officialListingHost:host(entry.catalogEvidenceUrl),
   observedExternalAssetHost:host(entry.catalogAssetUrl||entry.pdfUrl),
   upstreamCatalogLinkStatus:entry.catalogLinkStatus,
   recordedCatalogLinkMatchCount:entry.catalogLinkMatchCount??null,
   declaredDownloadStatus:entry.downloadStatus,
   sourceAcquisitionCategory:s,sourceCacheSha256:mapped.sha256,
   originalCandidateQuestionReferences:count,
   cachedPdfSha256ByteMatched:mapped.sourceByteStatus==='BYTE_SHA256_MATCH',
   actualOfficalAuthorityPublishedPdfSha256IndependentOfCacheVerified:false,
   actualSchoolAdoptedBookVersionVerified:false,
   sourceEditionAndChapterApplicabilityIndependentlyReviewed:false,
   sourceAuthorityCaveat:'External asset host and cached SHA are not independent evidence that this exact edition was adopted by ASSPS.'})
 }
 if(counts.anchorLinked!==107||counts.archiveRecovered!==4||counts.uncertain!==0||
  counts.originalAnchorLinked!==2377||counts.originalArchiveRecovered!==204||
  counts.originalUnresolved!==0)fail('CATALOG_PROVENANCE_CLASSIFICATION_DRIFT')
 if(records.filter(r=>r.cachedPdfSha256ByteMatched).length!==110)
  fail('CACHED_SOURCE_BYTE_COUNT_MISMATCH')
 records.sort((a,b)=>a.catalogId.localeCompare(b.catalogId))
 const revisionSHA=SHA(records.map(r=>r.catalogId+'|'+r.sourceCacheSha256+'|'+r.upstreamCatalogLinkStatus).join('\n'))
 return{schemaVersion:'assps-grade910-official-link-archive-provenance-distinction-v1',
  originalCandidates:2581,officialListingAuthority:'PECTAA',
  catalogueEntries:111,sourceCategoryCounts:types,
  catalogRecordsWithOfficialCatalogAnchor:counts.anchorLinked,
  catalogRecordsRecoveredFromArchive:counts.archiveRecovered,
  originalQuestionRefsWithOfficialCatalogLinkClaim:counts.originalAnchorLinked,
  originalQuestionRefsWithArchiveRecoveredSource:counts.originalArchiveRecovered,
  originalQuestionRefsWithUnresolvedLinkStatus:counts.originalUnresolved,
  originalLinkedSourceSetSha256:revisionSHA,
  actualSchoolAdoptionAuthenticated:0,qualifiedOriginalAnswerApprovals:0,
  questionAcademicPublished:0,paperStudioVerifiedSelectable:false,
  sourceMethodNote:'Counts represent self-recorded PECTAA listing/anchor evidence and local PDF SHA provenance. Google Drive can host official-listed assets; external hosting alone is neither proof nor disproof of official origin. Recovery via an archive is explicitly distinct from exact official catalog asset linkage. No official government-published independent digest or school textbook adoption is claimed.',
  records}
}
function markdown(x){
 return ['# ASSPS Grade IX–X — Official catalog vs archive PDF source distinction','',
  '**111 cached or candidate catalog records; 2,581 frozen original research questions.**',
  '', '**107** records have an existing PECTAA listing/anchor LINK evidence claim and reference **2,377** originals.',
  '**4** records are ARCHIVE-RECOVERED without the exact official asset link surfaced; they reference **204 original research questions**.',
  'Archived source recovery is potentially useful for independent investigation but is not an exact official PDF asset link verification.',
  '', 'Drive-hosted PDF files may be linked from a PECTAA official catalog; avoid classifying a book as unofficial solely because the file host is drive.google.com.',
  'Conversely, a SHA256 match to a locally recorded file does NOT prove the issuing authority digitally published the digest or that the school adopted that edition.',
  'The applicable grade/subject/medium and physical printed exercise location require separate authenticated school and qualified teacher review.',
  '', '**0 adopted books authenticated, 0 academically approved questions, 0 verified published. Academic release HOLD.**',
  '', 'Machine-readable complete identity matrix: ASSPS_GRADE910_OFFICIAL_LINK_VS_ARCHIVE_SOURCE_PROVENANCE_20261012.json',''].join('\n')
}
function write(){const x=make();fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n');fs.writeFileSync(MD,markdown(x))
 return {catalog:111,originals:2581,archiveRecoveredOriginals:x.originalQuestionRefsWithArchiveRecoveredSource,
  verifiedSchoolAdoption:0}}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():make()))
module.exports={make,markdown,write,OUT,MD,linkClass,host}
