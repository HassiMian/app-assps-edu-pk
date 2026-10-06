const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const issuesPath = path.join(__dirname,'../services/papers/curriculumReviewedEvidenceV6G2/biology9Chapter1SourceIssues.json')
const data = JSON.parse(fs.readFileSync(issuesPath,'utf8'))

test('both Chapter 1 academic conflicts remain open and require named review',()=>{
  assert.equal(data.status,'OPEN_REQUIRES_ACADEMIC_AND_CURRICULUM_RESOLUTION')
  assert.equal(data.issues.length,2)
  for (const issue of data.issues) {
    assert.equal(issue.status,'OPEN')
    assert.match(issue.requiredResolution,/review/i)
    assert.ok(Array.isArray(issue.additionalAuthoritativeEvidence))
    assert.ok(issue.additionalAuthoritativeEvidence.length >= 2)
    for (const evidence of issue.additionalAuthoritativeEvidence) {
      assert.equal(evidence.evidenceRole,'EXTERNAL_ERRATA_CONTEXT_NOT_CURRICULUM_REPLACEMENT')
      assert.match(evidence.url,/^https:\/\//)
      assert.equal(evidence.retrievedOn,'2026-10-06')
    }
  }
})

test('theory-law conflict is backed by NSTA but is not auto-resolved',()=>{
  const issue=data.issues.find(x=>x.id==='BIO9-C1-THEORY-LAW-001')
  assert.ok(issue)
  assert.ok(issue.additionalAuthoritativeEvidence.some(x=>x.authority==='NSTA'))
  assert.equal(issue.status,'OPEN')
  assert.match(issue.draftTreatment,/No new question endorses/i)
})

test('malaria chronology conflict records 1880 and 1897 external chronology but remains review-only',()=>{
  const issue=data.issues.find(x=>x.id==='BIO9-C1-MALARIA-CHRONOLOGY-002')
  assert.ok(issue)
  assert.equal(issue.chronologyEvidenceSummary.LaveranParasiteDiscoveryYear,1880)
  assert.equal(issue.chronologyEvidenceSummary.RossMosquitoTransmissionDiscoveryYear,1897)
  assert.match(issue.chronologyEvidenceSummary.status,/REVIEW_REQUIRED$/)
  assert.equal(issue.status,'OPEN')
  assert.ok(issue.additionalAuthoritativeEvidence.some(x=>x.authority==='WHO'))
  assert.ok(issue.additionalAuthoritativeEvidence.some(x=>x.authority==='NobelPrize.org'))
})
