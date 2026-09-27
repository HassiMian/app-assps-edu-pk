// resolvePaperRoute.js — Central Paper Routing Resolver for ASSPS (Rule FIX A)
export function resolvePaperRoute(paper, targetTab = null) {
  if (targetTab) return targetTab
  if (!paper) return 'build'

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

  if (isCanonicalV2 || isOfficialV13 || isOfficialV12 || isOfficialFirstTerm) {
    return 'word_editor'
  }

  return 'build'
}
