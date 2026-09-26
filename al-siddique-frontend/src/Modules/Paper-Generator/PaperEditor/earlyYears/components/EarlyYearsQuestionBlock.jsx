// EarlyYearsQuestionBlock.jsx — Question container with fixed label column and visual component dispatch
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import { getOverlay } from '../specs/EarlyYearsPresentationOverlay.js'
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
  isUrdu = false,
  paperId = null,
  presentationRevision = 0
}) {
  const {
    label = 'Q1',
    instruction = '',
    marks = null,
    presentationType = '',
    content = {}
  } = question

  const qId = question.questionId || question.id
  const overlay = (paperId && qId) ? getOverlay(paperId, qId) : {}

  // Fallback resolution: overlay value -> source presentation value -> design token default
  const resolvedSketchSize = overlay.sketchSize || overlay.sketchSizeMm || content.sketchSize || undefined
  const resolvedLineCount = overlay.lineCount !== undefined && overlay.lineCount !== null
    ? overlay.lineCount
    : (content.lineCount || content.lines || 3)
  const resolvedLineGapMm = overlay.lineGapMm !== undefined && overlay.lineGapMm !== null
    ? overlay.lineGapMm
    : content.lineGapMm
  const resolvedLayout = overlay.layout || content.layout || 'stacked'
  const resolvedTraceMode = overlay.traceMode || content.traceMode || undefined

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
      case 'VisualMatchingColumns': {
        const effectiveLeft = (content.leftItems || []).map((item, idx) => {
          const slotId = `left-${idx}`
          const overrideSketch = overlay.sketchOverrides?.[slotId] ||
            (overlay.targetVisualSlot === slotId ? overlay.sketchAssetId : null)
          return overrideSketch ? { ...item, sketchId: overrideSketch } : item
        })
        const effectiveRight = (content.rightItems || []).map((item, idx) => {
          const slotId = `right-${idx}`
          const overrideSketch = overlay.sketchOverrides?.[slotId] ||
            (overlay.targetVisualSlot === slotId ? overlay.sketchAssetId : null)
          return overrideSketch ? { ...item, sketchId: overrideSketch } : item
        })
        return (
          <VisualMatchingColumns
            leftItems={effectiveLeft}
            rightItems={effectiveRight}
            connectionGap={content.connectionGap}
            rowHeight={content.rowHeight}
            isUrdu={isUrdu}
            sketchSize={resolvedSketchSize}
            layout={resolvedLayout}
          />
        )
      }
      case 'PictureColoringBlock': {
        const effectiveItems = (content.items || []).map((item, idx) => {
          const slotId = String(idx)
          const overrideSketch = overlay.sketchOverrides?.[slotId] ||
            (overlay.targetVisualSlot === slotId ? overlay.sketchAssetId : null) ||
            ((content.items && content.items.length === 1 && overlay.sketchAssetId) ? overlay.sketchAssetId : null)
          return {
            ...item,
            sketchId: overrideSketch || item.sketchId
          }
        })
        return (
          <PictureColoringBlock
            items={effectiveItems}
            isUrdu={isUrdu}
            sketchSize={resolvedSketchSize}
            layout={resolvedLayout}
          />
        )
      }
      case 'CircleChoiceWithSketch': {
        const effectiveItems = (content.items || []).map((item, idx) => {
          const slotId = String(idx)
          const overrideSketch = overlay.sketchOverrides?.[slotId] ||
            (overlay.targetVisualSlot === slotId ? overlay.sketchAssetId : null) ||
            ((content.items && content.items.length === 1 && overlay.sketchAssetId) ? overlay.sketchAssetId : null)
          // Do NOT infer split choices when groupingAmbiguous is true
          const choices = content.groupingAmbiguous ? [] : (item.choices || item.options || [])
          return {
            ...item,
            choices,
            sketchId: overrideSketch || item.sketchId
          }
        })
        return (
          <CircleChoiceWithSketch
            items={effectiveItems}
            allWords={content.allWords}
            groupingAmbiguous={content.groupingAmbiguous}
            isUrdu={isUrdu}
            sketchSize={resolvedSketchSize}
            layout={resolvedLayout}
          />
        )
      }
      case 'ChoiceLetterRow':
        return <ChoiceLetterRow rows={content.rows} isUrdu={isUrdu} />
      case 'MissingLetterGrid':
        return (
          <MissingLetterGrid
            sequence={content.sequence}
            items={content.items}
            rawSourceLayout={content.rawSourceLayout}
            layoutAmbiguous={content.layoutAmbiguous}
            isUrdu={isUrdu}
          />
        )
      case 'MissingUrduLetterGrid':
        return (
          <MissingUrduLetterGrid
            sequence={content.sequence}
            sequences={content.sequences}
            rawSourceLayout={content.rawSourceLayout}
            layoutAmbiguous={content.layoutAmbiguous}
          />
        )
      case 'MissingNumberGrid':
        return (
          <MissingNumberGrid
            grid={content.grid}
            rows={content.rows}
            rawSourceSequence={content.rawSourceSequence}
            layoutAmbiguous={content.layoutAmbiguous}
          />
        )
      case 'BeforeAfterGrid':
        return <BeforeAfterGrid items={content.items} mode={content.mode} />
      case 'AlphabetWritingArea':
        return (
          <AlphabetWritingArea
            lines={resolvedLineCount}
            lineCount={resolvedLineCount}
            lineGapMm={resolvedLineGapMm}
            isUrdu={isUrdu}
          />
        )
      case 'UrduHandwritingResponse':
        return (
          <UrduHandwritingResponse
            lineCount={resolvedLineCount}
            lineGapMm={resolvedLineGapMm}
            placeholders={content.placeholders}
          />
        )
      case 'CountingWritingGrid':
        return (
          <CountingWritingGrid
            countTo={content.countTo}
            gridColumns={content.gridColumns}
            gridRows={content.gridRows}
            showGuideNumbers={content.showGuideNumbers || false}
          />
        )

      case 'PatternCopyBlock':
        return <PatternCopyBlock patterns={content.patterns} />
      case 'TraceShapeBlock': {
        const effectiveShapeId = overlay.sketchOverrides?.['0'] || overlay.sketchAssetId || content.shapeId
        const effectiveDotted = resolvedTraceMode === 'solid' ? false : (resolvedTraceMode === 'dotted' ? true : content.isDotted)
        return (
          <TraceShapeBlock
            shapeId={effectiveShapeId}
            isDotted={effectiveDotted}
            sketchSize={resolvedSketchSize}
          />
        )
      }
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
        direction: isUrdu ? 'rtl' : 'ltr',
        fontFamily
      }}
    >
      {/* Header Row: Fixed Question Label + Instruction + Marks Badge (Source-Owned) */}
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
            className="early-years-question-marks"
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

      {/* Visual Child Response Body with layout and overlay resolution */}
      <div
        className={`early-years-question-body early-years-layout-${resolvedLayout}`}
        data-layout={resolvedLayout}
        style={
          resolvedLayout === 'visual-left'
            ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '16px' }
            : resolvedLayout === 'visual-top'
            ? { display: 'flex', flexDirection: 'column', gap: '12px' }
            : resolvedLayout === 'two-column'
            ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
            : undefined
        }
      >
        {renderVisualBody()}
      </div>
    </div>
  )
}
