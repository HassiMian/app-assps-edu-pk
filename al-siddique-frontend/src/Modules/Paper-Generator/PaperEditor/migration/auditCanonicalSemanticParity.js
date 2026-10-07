import { inferOfficialSectionKind, parseMcqRows } from '../../officialSectionSemantics.js'

const ACADEMIC_NODE_TYPES = new Set([
  'mcq',
  'true_false',
  'fill_blank',
  'matching_columns',
  'grammar_table',
  'vertical_math',
  'short_question',
  'long_question',
  'essay',
  'application',
  'letter',
  'translation',
  'definition',
])

const STRICT_KIND_TYPES = {
  mcq: new Set(['mcq']),
  true_false: new Set(['true_false']),
  matching: new Set(['matching_columns']),
  pair_table: new Set(['grammar_table', 'matching_columns']),
  table: new Set(['grammar_table', 'matching_columns']),
  fill_blank: new Set(['fill_blank']),
  vertical_math: new Set(['vertical_math']),
}

function sourceSections(paper = {}) {
  return paper.selectedQuestions?.official_section?.questions ||
    paper.official_section ||
    []
}

function comparable(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function sectionCoverage(document, sourceSectionId, field) {
  return (document.sourceCoverageLedger || []).filter(
    segment =>
      segment.sourceSectionId === sourceSectionId &&
      segment.sourceField === field
  )
}

function pushIssue(issues, code, details) {
  issues.push({ code, ...details })
}

export function auditCanonicalSemanticParity(v13Dataset, canonicalCorpus) {
  const papers = v13Dataset?.papers || []
  const documents = canonicalCorpus?.documents || canonicalCorpus || []
  const docBySourceId = new Map(
    documents.map(document => [document.sourceIdentity?.sourcePaperId, document])
  )

  const issues = []
  const warnings = []
  const stats = {
    papers: papers.length,
    sourceSections: 0,
    canonicalSections: 0,
    mcqSections: 0,
    headingOnlyAcademicSections: 0,
    unknownPreservedNodes: 0,
  }

  for (const paper of papers) {
    const document = docBySourceId.get(paper.id)
    if (!document) {
      pushIssue(issues, 'MISSING_CANONICAL_DOCUMENT', { paperId: paper.id })
      continue
    }

    const source = sourceSections(paper)
    const canonical = document.sections || []
    stats.sourceSections += source.length
    stats.canonicalSections += canonical.length

    if (source.length !== canonical.length) {
      pushIssue(issues, 'SECTION_COUNT_MISMATCH', {
        paperId: paper.id,
        sourceCount: source.length,
        canonicalCount: canonical.length,
      })
    }

    source.forEach((sourceSection, index) => {
      const canonicalSection = canonical[index]
      const kind = inferOfficialSectionKind(sourceSection)
      const nodes = canonicalSection?.nodes || []
      const nodeTypes = nodes.map(node => node.type)

      if (!canonicalSection) {
        pushIssue(issues, 'MISSING_CANONICAL_SECTION', {
          paperId: paper.id,
          sectionIndex: index + 1,
          kind,
        })
        return
      }

      if (
        sourceSection.heading?.trim() &&
        !String(sourceSection.content || '').trim() &&
        kind !== 'marker'
      ) {
        stats.headingOnlyAcademicSections += 1
      }

      if (kind !== 'marker' && !nodes.some(node => ACADEMIC_NODE_TYPES.has(node.type))) {
        pushIssue(issues, 'ACADEMIC_SECTION_HAS_NO_ACADEMIC_NODE', {
          paperId: paper.id,
          sectionIndex: index + 1,
          kind,
          heading: sourceSection.heading || '',
          nodeTypes,
        })
      }

      const strictTypes = STRICT_KIND_TYPES[kind]
      if (strictTypes && !nodes.some(node => strictTypes.has(node.type))) {
        pushIssue(issues, 'SEMANTIC_NODE_TYPE_MISMATCH', {
          paperId: paper.id,
          sectionIndex: index + 1,
          kind,
          expectedAnyOf: [...strictTypes],
          nodeTypes,
        })
      }

      if (
        kind === 'marker' &&
        nodes.some(node => !['section_banner', 'scope_header'].includes(node.type))
      ) {
        pushIssue(issues, 'MARKER_SECTION_CONTAINS_ACADEMIC_NODE', {
          paperId: paper.id,
          sectionIndex: index + 1,
          nodeTypes,
        })
      }

      for (const field of ['heading', 'content']) {
        const sourceValue = String(sourceSection[field] || '')
        const segments = sectionCoverage(document, sourceSection.id, field)
        if (segments.length === 0) {
          pushIssue(issues, 'SOURCE_FIELD_NOT_COVERED', {
            paperId: paper.id,
            sectionIndex: index + 1,
            field,
            sourceLength: sourceValue.length,
          })
        }
      }

      const unknownCount = nodes.filter(node => node.type === 'unknown_preserved').length
      stats.unknownPreservedNodes += unknownCount
      if (unknownCount > 0) {
        warnings.push({
          code: 'UNKNOWN_PRESERVED_NODE',
          paperId: paper.id,
          sectionIndex: index + 1,
          count: unknownCount,
        })
      }

      if (kind !== 'mcq') return
      stats.mcqSections += 1
      const liveRows = parseMcqRows(sourceSection.content || '')
      const canonicalRows = nodes.filter(node => node.type === 'mcq')

      if (liveRows.length !== canonicalRows.length) {
        pushIssue(issues, 'MCQ_ROW_COUNT_MISMATCH', {
          paperId: paper.id,
          sectionIndex: index + 1,
          liveRows: liveRows.length,
          canonicalRows: canonicalRows.length,
        })
        return
      }

      liveRows.forEach((liveRow, rowIndex) => {
        const canonicalRow = canonicalRows[rowIndex]
        if (comparable(liveRow.prompt) !== comparable(canonicalRow.stemText)) {
          pushIssue(issues, 'MCQ_PROMPT_MISMATCH', {
            paperId: paper.id,
            sectionIndex: index + 1,
            row: rowIndex + 1,
            live: liveRow.prompt,
            canonical: canonicalRow.stemText,
          })
        }

        const liveOptions = (liveRow.options || []).map(option => comparable(option.text))
        const canonicalOptions = (canonicalRow.options || []).map(option => comparable(option.text))
        if (JSON.stringify(liveOptions) !== JSON.stringify(canonicalOptions)) {
          pushIssue(issues, 'MCQ_OPTIONS_MISMATCH', {
            paperId: paper.id,
            sectionIndex: index + 1,
            row: rowIndex + 1,
            live: liveOptions,
            canonical: canonicalOptions,
          })
        }
      })
    })
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    stats,
  }
}

export function assertCanonicalSemanticParity(v13Dataset, canonicalCorpus) {
  const report = auditCanonicalSemanticParity(v13Dataset, canonicalCorpus)
  if (!report.ok) {
    const sample = report.issues.slice(0, 20)
    throw new Error(
      `Canonical semantic parity failed with ${report.issues.length} issue(s):\n${JSON.stringify(sample, null, 2)}`
    )
  }
  return report
}
