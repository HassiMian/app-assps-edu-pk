'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const route=fs.readFileSync(path.resolve(__dirname,'../routes/schoolAcademicCatalogRoutes.js'),'utf8')
const root='/var/www/assps-releases/promotion-auth-v2-20261030'
const index=fs.readFileSync(path.join(root,'index.html'),'utf8')
const scripts=/<script\s+type="importmap"\s*>(.*?)<\/script>/s.exec(index)
test('signed audit general SaaS role never claims zero unreadable approvals',()=>{
 const part=route.split("router.get('/assessment-catalog/readiness'")[1]?.split("router.get('/grade-discrepancies'")[0]
 assert.ok(part)
 assert.match(part,/const approvedEvents=null/)
 assert.match(part,/SIGNED_AUDIT_NOT_READABLE_BY_GENERAL_RUNTIME/)
 assert.match(part,/academicApprovalEvents:approvedEvents,academicApprovalAuditStatus:approvalAuditStatus/)
 assert.doesNotMatch(part,/GRANT\s+SELECT\s+ON\s+school_academic_approval_events/i)
 assert.doesNotMatch(part,/DELETE\s+FROM\s+school_academic_approval_events/i)
})
test('versioned Manage Exams asset is resolved by live importmap and is present',()=>{
 assert.ok(scripts)
 const map=JSON.parse(scripts[1]).imports
 const active=map['/assets/ManageExams-BIiLOLGD.js']
 assert.match(active,/^\/assets\/ManageExams-ASSPS-(?:READINESS|ACADEMIC-(?:REVIEW|SIGNED-STAGE|GAP-REVIEW)|SINGLE-SUBJECT-APPROVAL)-[A-Za-z0-9_.-]+\.js$/)
 assert.ok(fs.existsSync(path.join(root,active)))
})
test('Principal review text marks unreadable signed ledger as unverified, not zero',()=>{
 const active=JSON.parse(scripts[1]).imports['/assets/ManageExams-BIiLOLGD.js']
 const code=fs.readFileSync(path.join(root,active),'utf8')
 assert.match(code,/Number\.isInteger\(d\.academicApprovalEvents\)/)
 assert.match(code,/UNVERIFIED — requires signed academic audit access/)
 assert.match(code,/Subject\/source approvals remain mandatory/)
 assert.match(code,/api\/academic-approvals\/assessment-catalog\/readiness/)
})
test('Signed academic staging remains explicitly restricted to approval transaction',()=>{
 assert.match(route,/router\.post\('\/assessment-catalog\/:examId\/stage',protect,\(req,res\)=>withApproval/)
 assert.match(route,/allCandidatesPendingUntilApproved:true/)
})

test('active stage action requires original reference, exact SHA and explicit Principal declaration',()=>{
 const active=JSON.parse(scripts[1]).imports['/assets/ManageExams-BIiLOLGD.js']
 const code=fs.readFileSync(path.join(root,active),'utf8')
 assert.match(code,/stageSignedCatalog=async t=>/)
 assert.match(code,/Stage Subjects \(Signed Source\)/)
 assert.match(code,/I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE/)
 assert.match(code,/approvalStatus!==['\"\`]pending/)
 assert.match(code,/principalSubjectApprovalStillRequired/)
 assert.match(code,/No approval inferred/)
})

test('Principal historical subject CSV preserves read-only source and requires human teacher evidence',()=>{
 const active=JSON.parse(scripts[1]).imports['/assets/ManageExams-BIiLOLGD.js']
 const code=fs.readFileSync(path.join(root,active),'utf8')
 assert.match(code,/exportHistoricalGapReview=async/)
 assert.match(code,/historical-subject-gaps/)
 assert.match(code,/sourceExamId:9/)
 assert.match(code,/REVIEW_ONLY_NOT_APPROVED/)
 assert.match(code,/UNVERIFIED_HISTORIC_REFERENCE_NOT_APPROVED/)
 assert.match(code,/Teacher\/Employee Evidence/)
 assert.match(code,/Active student counts must NOT be summed by subject/)
})

test('live Principal approves exact subject ID and revision only after verified official source',()=>{
 const active=JSON.parse(scripts[1]).imports['/assets/ManageExams-BIiLOLGD.js']
 const code=fs.readFileSync(path.join(root,active),'utf8')
 assert.match(code,/approveOneSubject=async/)
 assert.match(code,/requiresSignedPrincipalApproval/)
 assert.match(code,/neverAutoApproves/)
 assert.match(code,/assessment-catalog\/'/)
 assert.match(code,/\/offerings/)
 assert.match(code,/approvalStatus==='pending'/)
 assert.match(code,/item\.revision/)
 assert.match(code,/subject ID/i)
 assert.match(code,/I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE/)
 assert.match(code,/exam-subjects\/'/)
 assert.match(code,/Approve One Subject \(Signed\)/)
 assert.match(code,/No other subject will be approved/)
})
