import {
  PaperMarksStatus,
  PaperTotalOrigin,
  SectionMarksOrigin,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'
import { migrateOfficialPaperToV2 } from '../migration/migrateOfficialPaperToV2.js'
import officialV13Dataset from '../../seed-data/official-first-term-2026-v13.json' with { type: 'json' }

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function academicSectionShape(section) {
  if (!section || typeof section !== 'object') return null
  return {
    id: section.id ?? '',
    type: section.type ?? '',
    medium: section.medium ?? '',
    heading: section.heading ?? '',
    content: section.content ?? '',
    text: section.text ?? '',
    textUrdu: section.textUrdu ?? '',
    marks: section.marks ?? section.totalMarks ?? null,
    sourceOrder: section.sourceOrder ?? null,
    priority: section.priority ?? '',
    options: Array.isArray(section.options)
      ? section.options.map(option => ({
          id: option?.id ?? '',
          label: option?.label ?? option?.displayLabel ?? option?.canonicalLabel ?? '',
          text: option?.text ?? '',
          textUrdu: option?.textUrdu ?? option?.urduText ?? '',
          isCorrect: option?.isCorrect ?? null,
        }))
      : null,
  }
}

function sameAcademicSection(a, b) {
  return JSON.stringify(academicSectionShape(a)) === JSON.stringify(academicSectionShape(b))
}

const SAFE_LEGACY_SECTION_MUTATION_KEYS = new Set(['heading', 'content', 'marks'])

function changedAcademicSectionKeys(current, pristine) {
  const a = academicSectionShape(current) || {}
  const b = academicSectionShape(pristine) || {}
  return Object.keys(a).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
}

function assertSupportedLegacySectionMutation(current, pristine, label = '') {
  if (!current || !pristine) return
  const unsupported = changedAcademicSectionKeys(current, pristine)
    .filter(key => !SAFE_LEGACY_SECTION_MUTATION_KEYS.has(key))
  if (unsupported.length) {
    throw new Error(
      'UNSUPPORTED_LEGACY_SECTION_MUTATION:' +
      (label || current.id || 'section') + ':' + unsupported.join(',')
    )
  }
}

function byIdOrIndex(items, id, index) {
  if (!Array.isArray(items)) return null
  return items.find(item => item?.id && item.id === id) || items[index] || null
}

/**
 * Reconciles the two historical V13 academic mirrors without guessing.
 * A mutation present in only one mirror wins. Conflicting independent mutations
 * are rejected so the caller can retain the legacy emergency path rather than
 * silently dropping one edit.
 */
export function reconcileOfficialV13AcademicMirrors(paper) {
  const pristine = officialV13Dataset.papers?.find(item => item.id === paper?.id)
  if (!pristine) throw new Error('Official V13 pristine source not found for ' + (paper?.id || 'unknown'))

  if (paper.selectedQuestions !== undefined) {
    const validMirrorShape =
      paper.selectedQuestions &&
      typeof paper.selectedQuestions === 'object' &&
      !Array.isArray(paper.selectedQuestions) &&
      paper.selectedQuestions.official_section &&
      Array.isArray(paper.selectedQuestions.official_section.questions)
    if (!validMirrorShape) throw new Error('UNSUPPORTED_SELECTED_QUESTIONS_SHAPE')
  }

  const official = Array.isArray(paper.official_section) ? paper.official_section : []
  const mirror = Array.isArray(paper.selectedQuestions?.official_section?.questions)
    ? paper.selectedQuestions.official_section.questions
    : []
  const pristineSections = Array.isArray(pristine.official_section) ? pristine.official_section : []
  const pristineMirror = Array.isArray(pristine.selectedQuestions?.official_section?.questions)
    ? pristine.selectedQuestions.official_section.questions
    : pristineSections

  const listShape = list => JSON.stringify((list || []).map(academicSectionShape))
  const officialChanged = listShape(official) !== listShape(pristineSections)
  const mirrorChanged = listShape(mirror) !== listShape(pristineMirror)
  const mirrorsEqual = listShape(official) === listShape(mirror)

  // Only import legacy section fields that the deterministic V13 -> Canonical
  // migration is proven to consume losslessly. Unsupported academic mutations
  // retain the emergency legacy route instead of being silently discarded.
  official.forEach((section, index) => {
    const pristineSection = byIdOrIndex(pristineSections, section?.id, index)
    if (pristineSection) assertSupportedLegacySectionMutation(section, pristineSection, section?.id)
  })
  mirror.forEach((section, index) => {
    const pristineSection = byIdOrIndex(pristineMirror, section?.id, index)
    if (pristineSection) assertSupportedLegacySectionMutation(section, pristineSection, section?.id)
  })

  const currentContainerMarks = paper.selectedQuestions?.official_section?.marks
  const pristineContainerMarks = pristine.selectedQuestions?.official_section?.marks
  if (
    currentContainerMarks !== undefined &&
    JSON.stringify(currentContainerMarks) !== JSON.stringify(pristineContainerMarks)
  ) {
    throw new Error('AMBIGUOUS_SELECTED_QUESTIONS_CONTAINER_MARKS')
  }

  let merged
  if (officialChanged && !mirrorChanged) {
    merged = structuredClone(official)
  } else if (!officialChanged && mirrorChanged) {
    merged = structuredClone(mirror)
  } else if (!officialChanged && !mirrorChanged) {
    merged = structuredClone(official.length ? official : mirror)
  } else if (mirrorsEqual) {
    merged = structuredClone(official)
  } else {
    const officialIds = official.map((section, index) => section?.id || '__index_' + index)
    const mirrorIds = mirror.map((section, index) => section?.id || '__index_' + index)
    if (JSON.stringify(officialIds) !== JSON.stringify(mirrorIds)) {
      throw new Error('AMBIGUOUS_DUAL_MIRROR_STRUCTURE_CONFLICT')
    }

    merged = official.map((o, index) => {
      const id = o?.id || mirror[index]?.id || pristineSections[index]?.id
      const p = byIdOrIndex(pristineSections, id, index)
      const m = byIdOrIndex(mirror, id, index)
      const oChanged = Boolean(o) && !sameAcademicSection(o, p)
      const mChanged = Boolean(m) && !sameAcademicSection(m, p)
      if (oChanged && mChanged && !sameAcademicSection(o, m)) {
        throw new Error('AMBIGUOUS_DUAL_MIRROR_CONFLICT:' + (id || index))
      }
      if (mChanged) return structuredClone(m)
      return structuredClone(o || m || p)
    }).filter(Boolean)
  }

  const effective = structuredClone(paper)
  effective.official_section = merged
  effective.selectedQuestions = {
    ...(effective.selectedQuestions || {}),
    official_section: {
      ...(effective.selectedQuestions?.official_section || {}),
      questions: structuredClone(merged),
    },
  }
  return effective
}

function sourceSectionMarks(paper, sourceSection, index) {
  const direct = finiteNumber(sourceSection?.marks ?? sourceSection?.totalMarks)
  if (direct !== null) return direct

  const table = paper?.official_section_marks
  if (Array.isArray(table)) {
    const entry = table[index]
    if (typeof entry === 'number' || typeof entry === 'string') return finiteNumber(entry)
    return finiteNumber(entry?.marks ?? entry?.totalMarks ?? entry?.value)
  }
  if (table && typeof table === 'object') {
    const byId = sourceSection?.id ? table[sourceSection.id] : null
    const byIndex = table[index] ?? table[String(index)]
    return finiteNumber(
      byId?.marks ?? byId?.totalMarks ?? byId ??
      byIndex?.marks ?? byIndex?.totalMarks ?? byIndex
    )
  }
  return null
}

function patchMetadata(doc, paper) {
  const cfg = paper?.config || {}
  const next = { ...(doc.metadata || {}) }
  const mapping = {
    title: 'title',
    paperCode: 'paperCode',
    className: 'className',
    classLevel: 'classLevel',
    subject: 'subject',
    subjectName: 'subjectName',
    examType: 'examType',
    session: 'session',
    language: 'language',
    timeAllowed: 'timeAllowed',
    examDate: 'examDate',
    generalInstructions: 'instructions',
  }
  for (const [target, source] of Object.entries(mapping)) {
    if (cfg[source] !== undefined && cfg[source] !== null) next[target] = cfg[source]
  }
  return next
}

/**
 * Imports a modified official V13 working copy into the canonical document model.
 * Structure/parsing remains deterministic; saved-working-copy values are restored
 * after migration so no route transition can silently revert user edits.
 */
export function importModifiedOfficialV13ToCanonical(paper, manifestRecord) {
  if (!paper || paper.documentFormat !== 'pts-native-v13') {
    throw new Error('importModifiedOfficialV13ToCanonical requires a pts-native-v13 paper')
  }
  if (!manifestRecord) throw new Error('Normalization manifest record is required')

  const effectivePaper = reconcileOfficialV13AcademicMirrors(paper)
  const doc = migrateOfficialPaperToV2(effectivePaper, manifestRecord)
  doc.metadata = patchMetadata(doc, effectivePaper)

  const configuredTotal = finiteNumber(effectivePaper?.config?.totalMarks)
  if (configuredTotal !== null) {
    doc.authority = {
      ...(doc.authority || {}),
      storedConfiguredTotal: configuredTotal,
      originalTeacherHeaderTotal: configuredTotal,
      authoritativePaperTotal: configuredTotal,
      paperTotalOrigin: PaperTotalOrigin.TEACHER_EXPLICIT,
      paperMarksStatus: PaperMarksStatus.HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS,
      sourceTotalNote: 'Imported from saved official working copy.',
    }
  }

  const sourceSections = Array.isArray(effectivePaper.official_section) ? effectivePaper.official_section : []
  doc.sections = (doc.sections || []).map((section, index) => {
    const source = sourceSections[index]
    const marks = sourceSectionMarks(effectivePaper, source, index)
    if (marks === null) return section
    return {
      ...section,
      operationalSectionTotal: marks,
      authoritativeSectionTotal: marks,
      storedLegacyMarksValue: marks,
      sectionMarksOrigin: SectionMarksOrigin.TEACHER_EXPLICIT_SCALAR,
    }
  })

  const sectionTotals = doc.sections
    .map(section => finiteNumber(section.authoritativeSectionTotal ?? section.operationalSectionTotal))
  if (sectionTotals.length > 0 && sectionTotals.every(value => value !== null)) {
    const computed = sectionTotals.reduce((sum, value) => sum + value, 0)
    doc.authority = {
      ...(doc.authority || {}),
      paperMarksStatus:
        configuredTotal !== null && computed === configuredTotal
          ? PaperMarksStatus.BALANCED_EXPLICIT
          : PaperMarksStatus.SOURCE_TOTAL_CONFLICT,
    }
  }

  const validation = validateCanonicalPaperDocument(doc)
  if (!validation.valid) {
    throw new Error('Modified V13 canonical import failed validation: ' + validation.errors.join('; '))
  }
  return doc
}