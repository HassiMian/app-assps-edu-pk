// EarlyYearsWorksheetSpec.js — Three-layer worksheet presentation specification
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import { getFinalExamScheduleForPaper } from '../../../../dateSheetFinalExam2026.js'
import { getOverlay } from './EarlyYearsPresentationOverlay.js'
import { resolveEarlyYearsMarks } from './earlyYearsMarks.js'

/**
 * Creates presentation specification for an Early Years paper
 * Decouples presentation rules from raw academic provenance.
 */
export function buildWorksheetSpec(paper) {
  if (!paper) return null

  const isUrdu = paper.language === 'urdu' || paper.subject === 'urdu'
  const schedule = getFinalExamScheduleForPaper(paper.classStage, paper.subject)
  const marksState = resolveEarlyYearsMarks(paper)
  const headerEdit = getOverlay(paper.id, '__header__')
  const sourceHeaderTotal = marksState.headerTotal
  const listedQuestionTotal = marksState.questionTotal
  const derivedTotal = sourceHeaderTotal == null && !marksState.hasConflict && listedQuestionTotal > 0
    ? listedQuestionTotal
    : sourceHeaderTotal

  return {
    paperId: paper.id,
    classStage: paper.classStage,
    subject: paper.subject,
    language: paper.language,

    pageProfile: {
      format: LAYOUT_TOKENS.page.format,
      orientation: LAYOUT_TOKENS.page.orientation,
      widthMm: LAYOUT_TOKENS.page.widthMm,
      heightMm: LAYOUT_TOKENS.page.heightMm,
      margins: {
        top: LAYOUT_TOKENS.page.marginTopMm,
        bottom: LAYOUT_TOKENS.page.marginBottomMm,
        left: LAYOUT_TOKENS.page.marginLeftMm,
        right: LAYOUT_TOKENS.page.marginRightMm
      }
    },

    typography: {
      fontFamily: isUrdu
        ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
        : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
      headingSize: isUrdu
        ? TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading
        : TYPOGRAPHY_TOKENS.fontSizes.englishQuestionHeading,
      childTextSize: isUrdu
        ? TYPOGRAPHY_TOKENS.fontSizes.urduChildText
        : TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
      direction: isUrdu ? 'rtl' : 'ltr'
    },

    headerConfig: {
      schoolName: paper.headerSource?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
      campus: paper.headerSource?.campus || 'Sharif Chowk, Rayya Khas, Narowal',
      classDisplayName: headerEdit.classDisplayNameOverride ?? (paper.classDisplayName || paper.classStage?.toUpperCase()),
      subjectDisplayName: headerEdit.subjectDisplayNameOverride ?? paper.subject?.toUpperCase(),
      totalMarks: derivedTotal,
      totalMarksAuthority: sourceHeaderTotal == null && derivedTotal != null ? 'derived-from-explicit-question-marks' : 'source-header',
      examDate: headerEdit.examDateOverride ?? (paper.headerSource?.examDate || schedule?.date || ''),
      timeAllowed: headerEdit.timeAllowedOverride ?? (paper.headerSource?.timeAllowed || schedule?.timeAllowed || ''),
      showNameRollNo: true
    },

    questionPresentations: (paper.questions || []).map((q) => ({
      questionId: q.id,
      questionNumber: q.questionNumber,
      label: q.label,
      instruction: q.instruction,
      marks: q.marks,
      presentationType: q.presentationType,
      content: q.content,
      qaFlags: q.qaFlags || [],
      layout: {
        spacingAfterMm: 8,
        preventPageBreakInside: true
      }
    }))
  }
}
