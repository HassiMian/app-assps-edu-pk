'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
os=require('node:os'),path=require('node:path'),cp=require('node:child_process')
const m=require('../qbank/attest-grade910-institutional-publication-closure.cjs')
const PRIVATE='/root/secure-archive/grade910-academic-review-packets/assps-qualified-review-submissions-20261012'
let baseline
const get=()=>baseline??(baseline=m.ready({ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR:PRIVATE}))
test('real private academic school evidence never converts SHA-frozen candidate count into approved papers',()=>{
 const x=get()
 assert.equal(x.originalImmutableCandidates,2581)
 assert.equal(x.sourceCatalogsRequiringASSPSDecision,56)
 assert.equal(x.actualAdoptedCatalogDocumentsVerified,0)
 assert.equal(x.realFacultyResponsesSubmitted,0)
 assert.equal(x.signedSchoolCryptographicAndEvidenceByteReceipts,0)
 assert.equal(x.actuallyApprovedAcademicQuestionRevisions,0)
 assert.equal(x.paperStudioAcademicallyVerifiedSelectable,0)
 assert.equal(x.academicQuestionPublished,0)
 assert.equal(x.deployedByThisTask,false)
 assert.equal(x.machineQASuccessCannotOverrideInstitutionalBlocks,true)
 assert.equal(x.gateAllowedToPromoteDrafts,false)
})
test('production Core owner NO-GO and actual school review hold cannot be bypassed by env approval flags',()=>{
 const x=m.ready({ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR:PRIVATE,
  ASSPS_QBANK_RELEASE_APPROVED:'true',ASSPS_ACADEMIC_APPROVAL_OVERRIDE:'true',
  ASSPS_SAAS_CORE_SECURITY_CERTIFIED:'true'})
 assert.equal(x.releaseStatus,'DENIED_AUTHENTIC_HUMAN_AND_CORE_RELEASE_EVIDENCE_MISSING')
 assert.ok(x.productionSecurityLastIndependentIssueComment.includes('issuecomment-6129891175'))
 assert.equal(x.actualAdoptedCatalogDocumentsVerified,0)
 assert.equal(x.academicQuestionPublished,0)
 assert.equal(x.blockers.length,5)
})
test('partially supplied untrusted institutional signing credentials are rejected, never counted',()=>{
 const env={ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR:PRIVATE,
  ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH:'/tmp/untrusted.pem'}
 assert.throws(()=>m.ready(env),/PARTIAL_REAL_SCHOOL_ROOT_AND_SIGNED_BUNDLE_MUST_FAIL_CLOSED/)
})
test('untrusted teacher submission directory permissions are blocked by actual provider file validation',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-untrusted-intake-'))
 try{
  fs.chmodSync(dir,0o755)
  assert.throws(()=>m.ready({ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR:dir}),
   /PRIVATE_FACULTY_DIRECTORY_UNTRUSTED/)
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
})
test('completed human-facing release denial report reproducible and contains no school question text',()=>{
 const x=get()
 assert.deepEqual(JSON.parse(fs.readFileSync(m.OUT,'utf8')),x)
 assert.equal(fs.readFileSync(m.REPORT,'utf8'),m.markdown(x))
 assert.equal(x.academicQuestionPublished,0)
 assert.ok(!JSON.stringify(x).includes('What distinguishes a reversible physical change?'))
})
test('real standalone release command deliberately exits nonzero on absent school staff and Core certificate',()=>{
 const run=cp.spawnSync(process.execPath,['ops/qbank/attest-grade910-institutional-publication-closure.cjs'],
  {cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:120000,
   env:{...process.env,ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR:PRIVATE}})
 assert.equal(run.status,3)
 const row=JSON.parse(run.stdout.trim())
 assert.equal(row.academicallyApproved,0)
 assert.equal(row.verifiedPublished,0)
 assert.equal(row.safeRelease,false)
})
