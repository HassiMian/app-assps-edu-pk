'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const gate=require('../qbank/attest-grade910-board-and-session-applicability.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const input=()=>gate.loadInputs()
test('source-bound 2581 original academic candidates and real school adoption registry remain unapproved',()=>{
 const d=gate.assertPinned(input())
 assert.equal(d.sourceQuestionCandidateRevisionsPreserved,2581)
 assert.equal(d.schoolTeachingSession,'2026-27')
 assert.equal(d.publicOfficialEvidenceCount,6)
 assert.equal(d.specificSchoolBoardAffiliationIndependentlyCertified,false)
 assert.equal(d.actualAdoptedTextbookEvidenceRecords,0)
 assert.equal(d.independentPhysicalExercisePageVerifications,0)
 assert.equal(d.independentQualifiedSubjectTeacherRevisionApprovals,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.releaseDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('Narowal is routed to possible BISE Gujranwala, not certified school board affiliation',()=>{
 const d=gate.build(input())
 assert.equal(d.likelyRegionalBoard,'BISE Gujranwala')
 assert.equal(d.schoolLocationForBoardAssessment,'Narowal District, Punjab')
 assert.equal(d.specificSchoolBoardAffiliationIndependentlyCertified,false)
 assert.equal(d.schoolSpecificExamYearForGrade9Verified,false)
 assert.equal(d.schoolSpecificExamYearForGrade10Verified,false)
})
test('PECTAA Grade IX annual exam 2026 ALP is public reference only, NOT authenticated ASSPS adoption',()=>{
 const x=gate.assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2026})
 assert.equal(x.decision,'PUBLIC_NOTIFICATION_YEAR_MATCH_ONLY_SCHOOL_APPLICABILITY_UNVERIFIED')
 assert.equal(x.requiresIndependentBoardConfirmation,true)
})
test('2026 Grade IX ALP cannot silently govern annual exam 2027',()=>{
 const x=gate.assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2027})
 assert.equal(x.decision,'DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION')
})
test('2026 Grade IX ALP cannot silently govern 2028 examination',()=>{
 const x=gate.assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2028})
 assert.equal(x.decision,'DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION')
})
test('Grade IX ALP cannot be applied to Grade X even in 2026',()=>{
 const x=gate.assessRule({authorityId:'pectaa-grade9-2026-alp',grade:10,examYear:2026})
 assert.equal(x.decision,'DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION')
})
test('BISE Lahore notification index is not an automatic approval for a Narowal school',()=>{
 const x=gate.assessRule({authorityId:'lahore-board-2025-27-not-gujranwala-proof',grade:10,examYear:2027})
 assert.equal(x.decision,'DENY_CROSS_BOARD_AUTO_APPLICABILITY')
})
test('public PECTAA 2026-27 book listing does not authorize actual ASSPS school adoption',()=>{
 const x=gate.assessRule({authorityId:'pectaa-2026-27-publication-session',grade:10,examYear:2027})
 assert.equal(x.decision,'PUBLIC_OFFICIAL_CONTEXT_ONLY_NO_SCHOOL_ADOPTION')
})
test('cross-board spoof is rejected even if source itself is otherwise recognized',()=>{
 assert.throws(()=>gate.assessRule({authorityId:'pectaa-grade9-2026-alp',
  grade:9,examYear:2026,schoolBoard:'BISE Lahore'}),/GRADE910_AUTHORITY_SCHOOL_REGION_BOARD_MISMATCH/)
})
test('invalid grade, fabricated authority ID and unsupported exam years fail closed',()=>{
 for(const q of [
  {authorityId:'fake-board-2027',grade:9,examYear:2027},
  {authorityId:'pectaa-grade9-2026-alp',grade:8,examYear:2026},
  {authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2024},
  {authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:'2026'}
 ])assert.throws(()=>gate.assessRule(q),/GRADE910_AUTHORITY_INVALID_APPLICABILITY_CLAIM/)
})
test('principal-level task authorization cannot forge independently verified textbook adoption',()=>{
 const x=input();x.adoption.schoolBookAndExamYearApplicabilityCertified=true
 assert.throws(()=>gate.build(x),/GRADE910_AUTHORITY_SCHOOL_ADOPTION_EVIDENCE_IS_MISSING_OR_NOT_REATTESTED/)
})
test('a fabricated adopted textbook inserted into an empty evidence registry is rejected',()=>{
 const x=input();x.adoption.verifiedAdoptions.push({subject:'Mathematics',grade:9,approved:true})
 assert.throws(()=>gate.build(x),/GRADE910_AUTHORITY_SCHOOL_ADOPTION_EVIDENCE_IS_MISSING_OR_NOT_REATTESTED/)
})
test('invented physical page verification flag cannot grant source-page approval',()=>{
 const x=input();x.physical.academicPageEvidenceCertified=true
 assert.throws(()=>gate.build(x),/GRADE910_AUTHORITY_PHYSICAL_PAGE_EVIDENCE_NOT_REATTESTED/)
})
test('invented exercise page record is denied when no independent signed source exists',()=>{
 const x=input();x.physical.verifiedExerciseAnchors.push({grade:9,page:19})
 assert.throws(()=>gate.build(x),/GRADE910_AUTHORITY_PHYSICAL_PAGE_EVIDENCE_NOT_REATTESTED/)
})
test('school session must not be silently inferred from a different session',()=>{
 const x=input();x.adoption.teachingSession='2025-26'
 assert.throws(()=>gate.build(x),/GRADE910_AUTHORITY_SCHOOL_ADOPTION_EVIDENCE_IS_MISSING_OR_NOT_REATTESTED/)
})
test('all listed official public references explicitly decline to certify school adoption',()=>{
 for(const s of gate.build(input()).publicAuthoritySources){
  assert.match(s.url,/^https:\/\//)
  assert.equal(s.schoolTextbookAdoptionProven,false)
  assert.equal(s.actualSchoolAffiliationProven,false)
  assert.equal(s.officialPdfSha256,null)
 }
})
test('pinned public authority evidence report rejects in-place tampering',()=>{
 const raw=fs.readFileSync('docs/question-bank/'+gate.NAME+'.json')
 const modified=Buffer.from(raw);modified[180]^=1
 assert.throws(()=>gate.assertPinned(input(),modified),/GRADE910_AUTHORITY_FROZEN_AUTHORITY_MANIFEST_SHA_CHANGED/)
})
test('all-original corpus is still preserved; official-context research never promotes any approval',()=>{
 const x=input()
 const originals=gate.build(x)
 assert.equal(originals.academicallyApproved,0)
 assert.equal(originals.verifiedPublished,0)
 const d=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
})
test('source intake files remain read-only through all official and school evidence checks',()=>{
 const x=input(),a=JSON.stringify(x.adoption),p=JSON.stringify(x.physical)
 gate.build(x)
 assert.equal(JSON.stringify(x.adoption),a)
 assert.equal(JSON.stringify(x.physical),p)
})
test('reviewer-readable evidence explicitly separates 2026 ALP from 2027 applicability',()=>{
 const md=gate.markdown(gate.build(input()))
 assert.match(md,/annual examination 2026/i)
 assert.match(md,/not a blanket authorization for 2027/i)
 assert.match(md,/ASSPS/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})

test('caller-supplied fake authority metadata cannot override immutable official-year policy',()=>{
 const forged=[{id:'pectaa-grade9-2026-alp',kind:'YEAR_SCOPED_SMART_SYLLABUS_NOTIFICATION',authority:'PECTAA',grade:9,evidenceYear:2027}]
 const q=gate.assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2027,evidence:forged})
 assert.equal(q.decision,'DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION')
})
