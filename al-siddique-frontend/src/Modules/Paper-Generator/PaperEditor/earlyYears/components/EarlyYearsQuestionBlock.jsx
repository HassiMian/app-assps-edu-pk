// EarlyYearsQuestionBlock.jsx — Question container with fixed label column and visual component dispatch
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import {
  TraceGlyphGrid,
  CaterpillarNumberTrace,
  VisualMatchingColumns,
  PictureColoringBlock,
  CircleChoiceWithSketch,
  ChoiceLetterRow,
  MissingLetterGrid,
  MissingUrduLetterGrid,
  MissingNumberGrid,
  BeforeAfterGrid,
  AlphabetWritingArea,
  UrduHandwritingResponse,
  CountingWritingGrid,
  PatternCopyBlock,
  TraceShapeBlock,
  UrduJoinLettersExercise,
  CircleChoiceGrid,
  NumberCopyPractice,
  DrawingResponseArea
} from './index.js'

export default function EarlyYearsQuestionBlock({
  question = {},
  isUrdu = false
}) {
  const {
    label = 'Q1',
    instruction = '',
    marks = null,
    presentationType = '',
    content = {}
  } = question

  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  const renderVisualBody = () => {
    switch (presentationType) {
      case 'TraceGlyphGrid':
        return (
          <TraceGlyphGrid
            glyphs={content.glyphs}
            gridColumns={content.gridColumns}
            practiceLane={content.practiceLane}
            isUrdu={isUrdu}
          />
        )
      case 'CaterpillarNumberTrace':
        return <CaterpillarNumberTrace numbers={content.numbers} />
      case 'VisualMatchingColumns':
        return (
          <VisualMatchingColumns
            leftItems={content.leftItems}
            rightItems={content.rightItems}
            connectionGap={content.connectionGap}
            rowHeight={content.rowHeight}
            isUrdu={isUrdu}
          />
        )
      case 'PictureColoringBlock':
        return <PictureColoringBlock items={content.items} isUrdu={isUrdu} />
      case 'CircleChoiceWithSketch':
        return <CircleChoiceWithSketch items={content.items} isUrdu={isUrdu} />
      case 'ChoiceLetterRow':
        return <ChoiceLetterRow rows={content.rows} isUrdu={isUrdu} />
      case 'MissingLetterGrid':
        return (
          <MissingLetterGrid
            sequence={content.sequence}
            items={content.items}
            isUrdu={isUrdu}
          />
        )
      case 'MissingUrduLetterGrid':
        return (
          <MissingUrduLetterGrid
            sequence={content.sequence}
            sequences={content.sequences}
          />
        )
      case 'MissingNumberGrid':
        return <MissingNumberGrid grid={content.grid} />
      case 'BeforeAfterGrid':
        return <BeforeAfterGrid items={content.items} mode={content.mode} />
      case 'AlphabetWritingArea':
        return (
          <AlphabetWritingArea
            lines={content.lines}
            lineCount={content.lineCount}
            isUrdu={isUrdu}
          />
        )
      case 'UrduHandwritingResponse':
        return (
          <UrduHandwritingResponse
            lineCount={content.lineCount}
            placeholders={content.placeholders}
          />
        )
      case 'CountingWritingGrid':
        return (
          <CountingWritingGrid
            countTo={content.countTo}
            gridColumns={content.gridColumns}
            gridRows={content.gridRows}
          />
        )
      case 'PatternCopyBlock':
        return <PatternCopyBlock patterns={content.patterns} />
      case 'TraceShapeBlock':
        return (
          <TraceShapeBlock
            shapeId={content.shapeId}
            isDotted={content.isDotted}
          />
        )
      case 'UrduJoinLettersExercise':
        return <UrduJoinLettersExercise expressions={content.expressions} />
      case 'CircleChoiceGrid':
        return (
          <CircleChoiceGrid
            letterGrid={content.letterGrid}
            isUrdu={isUrdu}
          />
        )
      case 'NumberCopyPractice':
        return (
          <NumberCopyPractice
            referenceRow={content.referenceRow}
            rows={content.rows}
          />
        )
      case 'DrawingResponseArea':
        return <DrawingResponseArea height={content.height} hint={content.hint} />
      default:
        return (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '8px' }}>
            Unsupported presentation: {presentationType}
          </div>
        )
    }
  }

  return (
    <div
      className="early-years-question-block"
      style={{
        marginBottom: '20px',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {/* Header Row: Fixed Question Label + Instruction + Marks Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '8px',
          borderBottom: '1px solid #000',
          paddingBottom: '4px',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1 }}>
          {/* Question Label with fixed width column */}
          <span
            style={{
              fontFamily,
              fontSize: isUrdu
                ? TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading
                : TYPOGRAPHY_TOKENS.fontSizes.englishQuestionHeading,
              fontWeight: 'bold',
              minWidth: LAYOUT_TOKENS.childResponse.questionNumberWidthPx + 'px',
              color: '#000',
              flexShrink: 0
            }}
          >
            {label}.
          </span>

          {/* Teacher Instruction Text */}
          <span
            style={{
              fontFamily,
              fontSize: isUrdu
                ? TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading
                : TYPOGRAPHY_TOKENS.fontSizes.englishQuestionHeading,
              fontWeight: 'bold',
              color: '#111'
            }}
          >
            {instruction}
          </span>
        </div>

        {/* Section Marks */}
        {marks !== null && marks !== undefined && (
          <span
            style={{
              fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.metadata,
              fontWeight: 'bold',
              border: '1.2px solid #000',
              borderRadius: '12px',
              padding: '2px 8px',
              background: '#f8f8f8',
              flexShrink: 0,
              marginLeft: isUrdu ? 0 : '8px',
              marginRight: isUrdu ? '8px' : 0
            }}
          >
            ({marks})
          </span>
        )}
      </div>

      {/* Visual Child Response Body */}
      <div className="early-years-question-body">{renderVisualBody()}</div>
    </div>
  )
}
