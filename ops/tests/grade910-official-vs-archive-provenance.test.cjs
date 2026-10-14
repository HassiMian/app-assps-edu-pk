'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/audit-grade910-official-vs-archive-source-provenance.cjs')
const stored=()=>JSON.parse(fs.readFileSync(m.OUT,'utf8'))
test('111 original catalog records split official catalog anchor vs archive recovery without spoofing adoption',()=>{
 const x=stored()
 assert.equal(x.catalogueEntries,111)
 assert.equal(x.catalogRecordsWithOfficialCatalogAnchor,107)
 assert.equal(x.catalogRecordsRecoveredFromArchive,4)
 assert.equal(x.originalQuestionRefsWithOfficialCatalogLinkClaim,2377)
 assert.equal(x.originalQuestionRefsWithArchiveRecoveredSource,204)
 assert.equal(x.originalQuestionRefsWithUnresolvedLinkStatus,0)
 assert.equal(x.actualSchoolAdoptionAuthenticated,0)
 assert.equal(x.qualifiedOriginalAnswerApprovals,0)
 assert.equal(x.questionAcademicPublished,0)
 assert.equal(x.records.length,111)
})
test('Drive-hosted catalogue-linked PDFs are not automatically labelled archive recoveries',()=>{
 const x=stored(),chem=x.records.find(r=>r.catalogId==='pectaa-catalog-007')
 assert.equal(chem.originalCandidateQuestionReferences,315)
 assert.equal(chem.observedExternalAssetHost,'drive.google.com')
 assert.equal(chem.sourceAcquisitionCategory,'OFFICIAL_CATALOG_LINK_EVIDENCE_CLAIM')
 assert.equal(chem.actualSchoolAdoptedBookVersionVerified,false)
})
test('four archive recovered sources remain separate from exact official asset URL and publication',()=>{
 const x=stored(),archive=x.records.filter(r=>r.sourceAcquisitionCategory===
  'ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK')
 assert.equal(archive.length,4)
 assert.equal(archive.reduce((s,r)=>s+r.originalCandidateQuestionReferences,0),204)
 assert.ok(archive.every(r=>r.actualSchoolAdoptedBookVersionVerified===false))
 assert.ok(archive.every(r=>r.actualOfficalAuthorityPublishedPdfSha256IndependentOfCacheVerified===false))
 assert.deepEqual(archive.map(r=>r.catalogId).sort(),[
  'pectaa-recovered-chemistry10-en-2026','pectaa-recovered-computer10-en-2026',
  'pectaa-recovered-tarjuma10-current','pectaa-recovered-tarjuma9-2026'])
})
test('all original count immutable and independently rebuildable, no question texts copied',()=>{
 const x=stored(),rebuilt=m.make()
 assert.deepEqual(x,rebuilt)
 assert.equal(fs.readFileSync(m.MD,'utf8'),m.markdown(x))
 assert.equal(new Set(x.records.map(r=>r.catalogId)).size,111)
 assert.ok(x.records.every(r=>!Object.hasOwn(r,'questionText')&&!Object.hasOwn(r,'answer')))
 assert.equal(x.records.reduce((s,r)=>s+r.originalCandidateQuestionReferences,0),2581)
})
