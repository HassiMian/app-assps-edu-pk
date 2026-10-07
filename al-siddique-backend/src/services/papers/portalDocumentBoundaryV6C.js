// V6-C — Read-only discriminator boundary for shared SaaS paper-document families.
// The reviewed official V13 and Phase3R source validators are pinned, byte-for-byte.
// There is deliberately NO conversion of an arbitrary legacy vault paper into an
// official V13 or approved curriculum-authoring document: that would forge source.
const { createHash } = require('node:crypto')
const path = require('node:path')
const fs = require('node:fs')
const ROOT = path.join(__dirname, 'saasReviewedContract')
const PINNED = Object.freeze({
  PaperDocumentV2: '27997a59f553a70e5e27d1028236adab8a710f1a0a0b639fb1f113e542f9f4a3',
  newAuthoringPaperDocumentPhase3R: 'cf43ba3b8a597163c79e2767e11dea0e6dedc622d8ec76fcf06a35a285f5232b',
  curriculumPhase3PBridge: '30d9115e325eb6ca7e0583dfc0134daf9a028d0d10d224162b479c38e0811e8b',
  curriculumPreparationPhase3Q: '0ce58e42bdd964b91e9b4040d504d76d6297ccca34464b38ccb7f64b2e9a557c',
  topicQuestionComposerPhase3O: 'b9e489952b2d782e9c195d6a2712d8804d77ca629a1c8307b4929bc59103d7e4',
})
const OFFICIAL = 'assps-canonical-paper'
const NEW_AUTHORING = 'assps-new-authoring-paper'
const safeClone = value => JSON.parse(JSON.stringify(value))
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function assertPinned() {
  for (const [name, hash] of Object.entries(PINNED)) {
    const filename = path.join(ROOT, `${name}.js`)
    const actual = createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
    if (actual !== hash) throw Error(`Reviewed SaaS paper contract hash changed: ${name}`)
  }
  return true
}
const summarize = doc => ({
  title: String(doc?.metadata?.title ?? doc?.config?.title ?? doc?.name ?? '').slice(0,220),
  className: String(doc?.metadata?.className ?? doc?.metadata?.classLevel ?? doc?.config?.className ?? doc?.config?.classLevel ?? '').slice(0,120),
  subject: String(doc?.metadata?.subjectName ?? doc?.metadata?.subject ?? doc?.config?.subjectName ?? doc?.config?.subject ?? '').slice(0,160),
  language: String(doc?.metadata?.language ?? doc?.config?.language ?? '').slice(0,20),
  sectionCount: Array.isArray(doc?.sections) ? doc.sections.length : (Array.isArray(doc?.official_section) ? doc.official_section.length : null),
})
async function reviewPortalPaperDocument(payload) {
  assertPinned()
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { family:'unsupported', schemaVersion:null, reviewStatus:'UNSUPPORTED', issues:['Paper payload is not an object.'], canonicalWriteAllowed:false, printApprovalClaim:false }
  }
  // Never use an arbitrary nested legacy `format` or `schemaVersion` as authority.
  // The discriminator must be on the actual document, and exact validation follows.
  const doc = payload.document && typeof payload.document === 'object' &&
    [OFFICIAL, NEW_AUTHORING].includes(payload.document.format) ? payload.document : payload
  const format = doc.format
  if (format === OFFICIAL) {
    const official = await import(`file://${path.join(ROOT, 'PaperDocumentV2.js')}`)
    const result = official.validateCanonicalPaperDocument(doc)
    return { family:'historical-v13', schemaVersion:doc.schemaVersion, reviewedContract:'PaperDocumentV2',
      reviewStatus:result.valid?'SOURCE_VALIDATED':'SOURCE_INVALID', issues:[...(result.errors||[])],
      summary:summarize(doc), snapshotHash:digest(doc), canonicalWriteAllowed:false,
      printApprovalClaim:false, migrationEligible:result.valid }
  }
  if (format === NEW_AUTHORING) {
    const newer = await import(`file://${path.join(ROOT, 'newAuthoringPaperDocumentPhase3R.js')}`)
    // Exact reviewed validator; a draft's client-side status cannot authorize
    // server persistence, final print or publication.
    const result = newer.validateNewAuthoringPaperDocument(doc)
    const valid = typeof result === 'boolean' ? result : Boolean(result?.valid)
    return { family:'approved-curriculum-authoring', schemaVersion:doc.schemaVersion, reviewedContract:'PaperDocumentNewAuthoring',
      reviewStatus:valid?'STRUCTURE_VALID_STAGING':'SOURCE_INVALID', issues:Array.isArray(result?.errors)?result.errors:[],
      summary:summarize(doc), snapshotHash:digest(doc), canonicalWriteAllowed:false,
      printApprovalClaim:false, migrationEligible:false,
      authorizationRequired:'SERVER_APPROVED_CURRICULUM_AND_SIGNED_TEACHER_INTENT' }
  }
  if (format != null && format !== '') {
    return { family:'unsupported', schemaVersion:doc.schemaVersion??null, reviewStatus:'UNKNOWN_DISCRIMINATOR',
      issues:['Unknown PaperDocument discriminator. No automatic migration permitted.'],
      summary:summarize(doc), snapshotHash:digest(doc), canonicalWriteAllowed:false,
      printApprovalClaim:false, migrationEligible:false }
  }
  // Old PTS and blank papers remain accessible via the existing owner-scoped
  // vault/editor. Their source is not equivalent to V13 or approved Phase3R.
  return { family:'legacy-connect-vault', schemaVersion:doc.schemaVersion??null,
    reviewStatus:'LOSSLESS_ADAPTER_REQUIRED', issues:[], summary:summarize(doc),
    snapshotHash:digest(doc), canonicalWriteAllowed:false, printApprovalClaim:false,
    migrationEligible:false, legacyEditorSupported:true }
}
module.exports = { reviewPortalPaperDocument, assertPinned, PINNED }
