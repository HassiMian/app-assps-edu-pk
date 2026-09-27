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

export function resolvePaperRoute(paper, targetTab = null) {
  // If targetTab is explicitly provided and is NOT word_editor, respect it
  if (targetTab && targetTab !== 'word_editor') return targetTab
  if (!paper) return targetTab || 'build'

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

  // Critical Emergency Override: Urdu-script papers ALWAYS route to legacy Paper Studio ('build')
  // even if targetTab === 'word_editor'
  if (isUrduScriptPaper(paper)) {
    return 'build'
  }

  if (targetTab === 'word_editor') return 'word_editor'

  const isCanonicalV2 = paper.schemaVersion === 2 || paper.schemaVersion === '2' || paper.documentFormat === 'canonical-v2'
  const isOfficialV13 = paper.documentFormat === 'pts-native-v13'
  const isOfficialV12 = paper.documentFormat === 'official-v12'
  const isOfficialFirstTerm = id.startsWith('official-first-term-') || id.includes('first-term-2026')

  if (isCanonicalV2 || isOfficialV13 || isOfficialV12 || isOfficialFirstTerm) {
    return 'word_editor'
  }

  return 'build'
}
