// Presentation-only projection of the immutable 14-Oct school source archive.
// Do not mutate source candidates: original A/B message identities and the
// excluded Eight/Pre-Nine records remain available to the authorized reviewer.
const CLASS_ALIASES = Object.freeze({
  starter:'Starter',play:'Starter',playgroup:'Starter',mover:'Mover',nursery:'Mover',
  flyer:'Flyer',prep:'Flyer',one:'One',two:'Two',three:'Three',four:'Four',
  five:'Five',six:'Six',seven:'Seven',eight:'Eight',prenine:'Pre-Nine',
  preix:'Pre-Nine','1':'One','2':'Two','3':'Three','4':'Four',
  '5':'Five','6':'Six','7':'Seven','8':'Eight'
})
const normalizeClass = value => CLASS_ALIASES[
  String(value||'').toLowerCase().replace(/^\s*(?:class|grade)\s+/,'').replace(/[^a-z0-9]/g,'')
] || null

export const OMITTED_LESSON_CLASSES = Object.freeze(['Eight', 'Pre-Nine'])
const OMITTED = new Set(OMITTED_LESSON_CLASSES)
const SPECIAL = new Set(['One', 'Two', 'Three'])
const KEY_RE = /^(English|Urdu)[-\s]+([AB])$/i

const classFor = candidate => normalizeClass(candidate?.proposed_class_level)

export function canonicalLessonCandidates(sourceCandidates, klass) {
  const originals = (Array.isArray(sourceCandidates) ? sourceCandidates : [])
    .filter(candidate => candidate && !OMITTED.has(classFor(candidate)))
    .filter(candidate => !klass || classFor(candidate) === normalizeClass(klass))
  const pairMap = new Map()
  for (const candidate of originals) {
    const cls = classFor(candidate)
    const match = String(candidate.source_subject_label || '').trim().match(KEY_RE)
    if (!SPECIAL.has(cls) || !match) continue
    const subject = /^english$/i.test(match[1]) ? 'English' : 'Urdu'
    const part = match[2].toUpperCase()
    const key = cls + ':' + subject
    const group = pairMap.get(key) || { A: [], B: [] }
    group[part].push(candidate)
    pairMap.set(key, group)
  }
  const emitted = new Set()
  return originals.flatMap(candidate => {
    const cls = classFor(candidate)
    const match = String(candidate.source_subject_label || '').trim().match(KEY_RE)
    if (!SPECIAL.has(cls) || !match) return [candidate]
    const subject = /^english$/i.test(match[1]) ? 'English' : 'Urdu'
    const key = cls + ':' + subject
    const pair = pairMap.get(key)
    // A partial or ambiguous pair must remain separate for academic review.
    if (!pair || pair.A.length !== 1 || pair.B.length !== 1) return [candidate]
    if (emitted.has(key)) return []
    emitted.add(key)
    return [{
      candidate_key: 'ASSPS_AB_MERGE:' + key,
      school_id: candidate.school_id,
      proposed_class_level: cls,
      class_display: cls,
      source_subject_label: subject,
      sourceVariants: [
        { part: 'A', candidate: pair.A[0] },
        { part: 'B', candidate: pair.B[0] }
      ],
      source_submissions: [...new Set([
        ...(pair.A[0].source_submissions || []),
        ...(pair.B[0].source_submissions || [])
      ])],
      review_state: 'A_B_SOURCE_PARTS_REQUIRE_ACADEMIC_REVIEW',
      publish_status: 'BLOCKED',
      sent_to_portal: false,
      ready_for_post_api: false
    }]
  })
}

// Existing separately saved A/B drafts must NEVER be overwritten by a later
// unified English/Urdu Save. Clone as a new private draft instead; preserve the
// old per-part record and audit revision exactly.
export function isLegacySeparateABPlan(plan) {
  const klass = normalizeClass(plan?.classLevel)
  if (!SPECIAL.has(klass)) return false
  return (Array.isArray(plan?.subjects) ? plan.subjects : []).some(subject =>
    KEY_RE.test(String(subject?.subject || '').trim()))
}
