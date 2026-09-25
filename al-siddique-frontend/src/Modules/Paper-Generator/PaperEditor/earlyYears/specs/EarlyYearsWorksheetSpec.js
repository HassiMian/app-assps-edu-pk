// EarlyYearsWorksheetSpec.js — Three-layer worksheet presentation specification
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

/**
 * Creates presentation specification for an Early Years paper
 * Decouples presentation rules from raw academic provenance.
 */
export function buildWorksheetSpec(paper) {
  if (!paper) return null

  const isUrdu = paper.language === 'urdu' || paper.subject === 'urdu'

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
      classDisplayName: paper.classDisplayName || paper.classStage?.toUpperCase(),
      subjectDisplayName: paper.subject?.toUpperCase(),
      totalMarks: paper.headerSource?.totalMarks ?? (paper.totalMarksSource?.headerTotal ?? null),
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
