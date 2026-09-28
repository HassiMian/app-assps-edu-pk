// resolvePaperRoute.js — Central Paper Routing Resolver for ASSPS (Rule FIX A + URDU OVERRIDE)

export const URDU_FONT_STACK = "'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif"

export function isUrduScriptPaper(paper = {}) {
  if (!paper || typeof paper !== 'object') return false

  const language = String(
    paper.config?.language ||
    paper.metadata?.language ||
    paper.language || ''
  ).toLowerCase()

  const subject = String(
    paper.config?.subject ||
    paper.metadata?.subject ||
    paper.subject || ''
  ).toLowerCase()

  const subjectName = String(
    paper.config?.subjectName ||
    paper.metadata?.subjectName || ''
  ).toLowerCase()

  const name = String(paper.name || '').toLowerCase()
  const id = String(paper.id || '').toLowerCase()

  if (['urdu', 'ur', 'rtl'].includes(language)) return true

  const text = `${subject} ${subjectName} ${name} ${id}`

  return (
    text.includes('urdu') ||
    text.includes('islamiat') ||
    text.includes('islamiyat') ||
    text.includes('pak studies') ||
    text.includes('pakistan studies') ||
    text.includes('tarjuma') ||
    text.includes('quran') ||
    text.includes('قرآن') ||
    text.includes('اسلام') ||
    text.includes('اردو') ||
    text.includes('پاکستان')
  )
}

export function resolvePaperRoute(paper, targetTab = null, routingPolicy = {}) {
  if (!paper) return targetTab || 'build'

  const allowOfficialCanonicalCanary = routingPolicy?.officialCanonicalCanary === true

  const id = String(paper.id || '')
  const corpusId = String(paper.corpusId || '')
  const stage = String(paper.classStage || paper.config?.classLevel || paper.classLevel || '').toLowerCase()
  const isEarlyYears = (
    corpusId === 'early-years-first-term-2026' ||
    id.startsWith('ey-') ||
    stage === 'starter' || stage === 'mover' || stage === 'flyer' ||
    stage === 'playgroup' || stage === 'nursery' || stage === 'prep'
  )
  if (isEarlyYears) return 'early_years'

  if (paper.structureMode === 'board_pattern') return 'board_pattern'

  const isCanonicalV2 = paper.schemaVersion === 2 || paper.schemaVersion === '2' || paper.documentFormat === 'canonical-v2'
  const isOfficialV13 = paper.documentFormat === 'pts-native-v13'
  const isOfficialV12 = paper.documentFormat === 'official-v12'
  const isOfficialFirstTerm = id.startsWith('official-first-term-') || id.includes('first-term-2026')

  // Official First Term papers remain on the stable Paper Workspace by default.
  // Phase 15 adds only an explicit hidden canary path; PaperEditorRouter still performs
  // the final pristine-V13/canonical guard and falls back safely for modified payloads.
  if (isOfficialV13 || isOfficialV12 || isOfficialFirstTerm) {
    if (allowOfficialCanonicalCanary && (isOfficialV13 || isCanonicalV2)) return 'word_editor'
    return 'build'
  }

  // Explicit editor choice is respected for non-official/custom documents.
  if (targetTab) return targetTab

  if (isCanonicalV2) return 'word_editor'
  return 'build'
}
