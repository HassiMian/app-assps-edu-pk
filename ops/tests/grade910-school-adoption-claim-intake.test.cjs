'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const mod=require('../qbank/inspect-grade910-private-school-adoption-claims.cjs');
const books=require('../qbank/build-grade910-school-adoption-verification-matrix.cjs');
const source=books.build().rows.find(x=>x.originalResearchCandidateCount>0&&[9,10].includes(x.gradeCatalogClaim));
assert.ok(source);
function setup(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'assps-adoption-claim-'),{mode:0o700});
 fs.chmodSync(base,0o700);
 const claims=path.join(base,'claims'),objects=path.join(base,'objects');
 fs.mkdirSync(claims,{mode:0o700});fs.mkdirSync(objects,{mode:0o700});
 t.after(()=>fs.rmSync(base,{force:true,recursive:true}));
 return {claims,objects};
}
function fakeAdopted(objects){
 const bytes=Buffer.from('test-only synthetic adoption evidence. Not real ASSPS signature.','utf8');
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(objects,digest+'.evidence'),bytes,{mode:0o600,flag:'wx'});
 return {schemaVersion:'assps-grade910-school-adoption-claim-v1',
  sourceCatalogRecordId:source.catalogId,sourceCatalogPdfSha256:source.sourcePdfSha256,
  originalQuestionRevisionSetSha256:source.originalQuestionRevisionSetSha256,
  schoolSessionUnderReview:'2026-27',claimDisposition:'adopted',
  schoolGradeClaim:source.gradeCatalogClaim,schoolSubjectClaim:source.subjectCatalogClaim||'Test subject',
  schoolMediumClaim:'english',schoolBookTitleClaim:'SYNTHETIC TEST BOOK',
  schoolPrintedEditionClaim:'SYNTHETIC 2026-27',boardExamYearClaim:2027,
  schoolAdoptionEvidenceSha256:digest};
}
function put(claims,item){
 fs.writeFileSync(path.join(claims,source.catalogId+'.school-adoption-claim.json'),
  JSON.stringify(item)+'\n',{mode:0o600,flag:'wx'});
}
test('empty private inbox stays hold with zero approvals',t=>{
 const {claims}=setup(t),r=mod.aggregate({claimDirectory:claims});
 assert.equal(r.adoptionClaimFilesReceived,0);
 assert.equal(r.academicallyApproved,0);
 assert.equal(r.unresolvedSchoolBookDecisions,56);
});
test('source-locked claim with physically verified synthetic bytes stays research only',t=>{
 const {claims,objects}=setup(t);put(claims,fakeAdopted(objects));
 const r=mod.aggregate({claimDirectory:claims,evidenceDirectory:objects});
 assert.equal(r.adoptionClaimFilesReceived,1);
 assert.equal(r.physicalEvidenceByteMatches,1);
 assert.equal(r.schoolAdoptionCertificatesAuthenticated,0);
 assert.equal(r.paperStudioVerifiedSelectable,0);
 assert.equal(r.productionWrite,false);
});
test('tampered private evidence bytes rejected',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 put(claims,x);
 fs.writeFileSync(path.join(objects,x.schoolAdoptionEvidenceSha256+'.evidence'),'tampered');
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/EVIDENCE_BYTES_SHA256_MISMATCH/);
});
test('source revision mismatch rejected',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 x.originalQuestionRevisionSetSha256='0'.repeat(64);put(claims,x);
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/ORIGINAL_CATALOG_SHA_OR_SESSION_MISMATCH/);
});
test('forged approved true field rejected',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 x.academicallyApproved=true;put(claims,x);
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/INVALID_OR_PRIVILEGED_FIELD/);
});
test('grade cross-assignment must not convert source grade 9 to 10',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 x.schoolGradeClaim=source.gradeCatalogClaim===9?10:9;put(claims,x);
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/SOURCE_CATALOG_GRADE_MISMATCH/);
});
test('world-readable review evidence claim rejected',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 put(claims,x);fs.chmodSync(path.join(claims,source.catalogId+'.school-adoption-claim.json'),0o644);
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/UNSAFE_PRIVATE_CLAIM_BYTES/);
});
test('symlink in claim inbox rejected',t=>{
 const {claims,objects}=setup(t),x=fakeAdopted(objects);
 const target=path.join(objects,'untrusted.json');fs.writeFileSync(target,JSON.stringify(x));
 fs.symlinkSync(target,path.join(claims,source.catalogId+'.school-adoption-claim.json'));
 assert.throws(()=>mod.aggregate({claimDirectory:claims,evidenceDirectory:objects}),/UNTRUSTED_PRIVATE_CLAIM_FILE/);
});
test('no evidence store configured means adopted claim fail-closed',t=>{
 const {claims,objects}=setup(t);put(claims,fakeAdopted(objects));
 assert.throws(()=>mod.aggregate({claimDirectory:claims}),/ACTUAL_PRIVATE_EVIDENCE_BYTES_REQUIRED/);
});
