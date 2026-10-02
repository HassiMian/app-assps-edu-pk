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

  const forceOfficialLegacyRoute = routingPolicy?.forceOfficialLegacyRoute === true

  const id = String(paper.id || '')
  const corpusId = String(paper.corpusId || '')
  const stage = String(paper.classStage || paper.config?.classLevel || paper.classLevel || '').toLowerCase()
  // Independently authored Early Years papers are created in the regular blank
  // workspace until the dedicated visual Activity Builder is introduced.
  // The nine immutable source papers still use their specialist renderer.
  if (paper.userAuthored === true && paper.documentFormat === 'pts-native-v13' && ['blank','duplicate'].includes(paper.creationMethod)) return 'build'
  const isEarlyYears = (
    corpusId === 'early-years-first-term-2026' ||
    id.startsWith('ey-') ||
    stage === 'starter' || stage === 'mover' || stage === 'flyer' ||
    stage === 'playgroup' || stage === 'nursery' || stage === 'prep'
  )
  if (isEarlyYears) return 'early_years'

  // Recovery source has V13-shaped sections but NO canonical normalization manifest.
  // Sending it to word_editor opens a preview-only legacy compatibility component.
  // The editable Paper Workspace handles its complete sections and marks instead.
  if (paper.recoverySourceManaged || id.startsWith('recovery-first-term-')) return 'build'

  if (paper.structureMode === 'board_pattern') return 'board_pattern'

  const canonicalSchemaVersion = Number(paper.schemaVersion || 0)
  const isCanonicalV2 = (
    canonicalSchemaVersion === 2 ||
    canonicalSchemaVersion === 3 ||
    paper.documentFormat === 'canonical-v2'
  )
  const isOfficialV13 = paper.documentFormat === 'pts-native-v13'
  const isOfficialV12 = paper.documentFormat === 'official-v12'
  const isOfficialFirstTerm = id.startsWith('official-first-term-') || id.includes('first-term-2026')

  // Phase 18 cutover: official V13/canonical First Term papers now enter the
  // guarded canonical editor chain by default. PaperEditorRouter remains the final
  // authority: pristine V13 is migrated to Canonical V2; modified/custom V13 is
  // preserved in LEGACY_CANVAS_V2. The emergency rollback flag forces the proven
  // stable Paper Workspace without deleting or bypassing any compatibility code.
  if (isOfficialV13 || isOfficialV12 || isOfficialFirstTerm) {
    if (forceOfficialLegacyRoute) return 'build'
    if (isOfficialV12) return 'build'
    if (isOfficialV13 || isCanonicalV2) return 'word_editor'
    return 'build'
  }

  // Explicit editor choice is respected for non-official/custom documents.
  if (targetTab) return targetTab

  if (isCanonicalV2) return 'word_editor'
  return 'build'
}
