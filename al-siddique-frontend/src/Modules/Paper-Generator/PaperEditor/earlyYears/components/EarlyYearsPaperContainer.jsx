// EarlyYearsPaperContainer.jsx — A4 Portrait Paper Container for Early Years Worksheets
import React from 'react'
import { buildWorksheetSpec } from '../specs/EarlyYearsWorksheetSpec.js'
import EarlyYearsHeader from './EarlyYearsHeader.jsx'
import EarlyYearsQuestionBlock from './EarlyYearsQuestionBlock.jsx'
import UrduFontNotice from './UrduFontNotice.jsx'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function EarlyYearsPaperContainer({
  paper = null,
  spec = null,
  scale = 1
}) {
  const activeSpec = spec || (paper ? buildWorksheetSpec(paper) : null)

  if (!activeSpec) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        No Early Years paper specification loaded.
      </div>
    )
  }

  const isUrdu = activeSpec.language === 'urdu' || activeSpec.subject === 'urdu'

  return (
    <div
      className="early-years-paper-viewport"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        background: '#e2e8f0',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}
    >
      {/* Dev diagnostics notice (hidden in print) */}
      {isUrdu && (
        <div style={{ width: '210mm', maxWidth: '100%', boxSizing: 'border-box' }}>
          <UrduFontNotice />
        </div>
      )}

      {/* A4 Sheet Container */}
      <div
        className="early-years-sheet-a4"
        style={{
          width: `${LAYOUT_TOKENS.page.widthMm}mm`,
          minHeight: `${LAYOUT_TOKENS.page.heightMm}mm`,
          padding: `${LAYOUT_TOKENS.page.marginTopMm}mm ${LAYOUT_TOKENS.page.marginRightMm}mm ${LAYOUT_TOKENS.page.marginBottomMm}mm ${LAYOUT_TOKENS.page.marginLeftMm}mm`,
          background: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
          color: '#000',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
          position: 'relative',
          direction: isUrdu ? 'rtl' : 'ltr'
        }}
      >
        {/* Header */}
        <EarlyYearsHeader
          headerConfig={activeSpec.headerConfig}
          isUrdu={isUrdu}
        />

        {/* Question Blocks */}
        <div className="early-years-questions-container">
          {activeSpec.questionPresentations.map((question) => (
            <EarlyYearsQuestionBlock
              key={question.questionId}
              question={question}
              isUrdu={isUrdu}
            />
          ))}
        </div>

        {/* Paper Footer */}
        <footer
          className="early-years-footer"
          style={{
            marginTop: '24px',
            paddingTop: '8px',
            borderTop: '1px solid #ccc',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9pt',
            color: '#666'
          }}
        >
          <span>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL — First Term Examination 2026</span>
          <span>
            {activeSpec.headerConfig.classDisplayName} {activeSpec.headerConfig.subjectDisplayName}
          </span>
        </footer>
      </div>
    </div>
  )
}
