const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const root = path.join(__dirname,'../services/papers/curriculumReviewedEvidenceV6G2')
const basePath = path.join(root,'biology9Chapter1SourceIssues.json')
const overlayPath = path.join(root,'biology9Chapter1ConflictExternalEvidenceV6G7.json')
const baseBytes = fs.readFileSync(basePath)
const base = JSON.parse(baseBytes)
const overlay = JSON.parse(fs.readFileSync(overlayPath,'utf8'))
const baseSha = crypto.createHash('sha256').update(baseBytes).digest('hex')

function joined(id) {
  const source = base.issues.find(x=>x.id===id)
  const external = overlay.issues.find(x=>x.id===id)
  assert.ok(source,`base issue missing ${id}`)
  assert.ok(external,`overlay issue missing ${id}`)
  return {source,external}
}

test('G2 conflict source remains byte-pinned and immutable',()=>{
  assert.equal(baseSha,'8b94fbb99340ca5558c936e7cefe0e628bf083b174bacfc7c4a16d6d5b83f524')
  assert.equal(overlay.basePinnedSha256,baseSha)
  assert.equal(overlay.policy.baseEvidenceImmutable,true)
  assert.equal(overlay.policy.curriculumReplacementAllowed,false)
  assert.equal(overlay.policy.namedAcademicReviewStillRequired,true)
})

test('both Chapter 1 academic conflicts remain open and require named review',()=>{
  assert.equal(base.status,'OPEN_REQUIRES_ACADEMIC_AND_CURRICULUM_RESOLUTION')
  assert.equal(base.issues.length,2)
  assert.equal(overlay.issues.length,2)
  for (const source of base.issues) {
    assert.equal(source.status,'OPEN')
    assert.match(source.requiredResolution,/review/i)
    const external=overlay.issues.find(x=>x.id===source.id)
    assert.ok(external)
    assert.equal(external.status,'OPEN')
    assert.ok(Array.isArray(external.additionalAuthoritativeEvidence))
    assert.ok(external.additionalAuthoritativeEvidence.length>=2)
    for (const evidence of external.additionalAuthoritativeEvidence) {
      assert.equal(evidence.evidenceRole,'EXTERNAL_ERRATA_CONTEXT_NOT_CURRICULUM_REPLACEMENT')
      assert.match(evidence.url,/^https:\/\//)
      assert.equal(evidence.retrievedOn,'2026-10-06')
    }
  }
})

test('theory-law conflict is backed by NSTA but is not auto-resolved',()=>{
  const {source,external}=joined('BIO9-C1-THEORY-LAW-001')
  assert.ok(external.additionalAuthoritativeEvidence.some(x=>x.authority==='NSTA'))
  assert.equal(source.status,'OPEN')
  assert.equal(external.status,'OPEN')
  assert.match(source.draftTreatment,/No new question endorses/i)
})

test('malaria chronology external record keeps the source conflict review-only',()=>{
  const {source,external}=joined('BIO9-C1-MALARIA-CHRONOLOGY-002')
  assert.equal(external.chronologyEvidenceSummary.LaveranParasiteDiscoveryYear,1880)
  assert.equal(external.chronologyEvidenceSummary.RossMosquitoTransmissionDiscoveryYear,1897)
  assert.match(external.chronologyEvidenceSummary.status,/REVIEW_REQUIRED$/)
  assert.equal(source.status,'OPEN')
  assert.equal(external.status,'OPEN')
  assert.ok(external.additionalAuthoritativeEvidence.some(x=>x.authority==='WHO'))
  assert.ok(external.additionalAuthoritativeEvidence.some(x=>x.authority==='NobelPrize.org'))
})
