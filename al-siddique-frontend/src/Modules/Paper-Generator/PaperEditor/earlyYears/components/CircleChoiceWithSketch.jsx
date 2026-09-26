// CircleChoiceWithSketch.jsx — Sketch prompt with circle/tick choice letters or words
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function CircleChoiceWithSketch({
  items = [],
  isUrdu = false,
  sketchSize = 'mainVisual',
  layout = 'stacked',
  allWords = [],
  groupingAmbiguous = false
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  const isVisualLeft = layout === 'visual-left'

  return (
    <div className="early-years-circle-choice-with-sketch-container">
      <div
        className={`early-years-circle-choice-sketches ${layout ? `layout-${layout}` : ''}`}
        data-layout={layout}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))`,
          gap: '16px',
          margin: '14px 0',
          direction: isUrdu ? 'rtl' : 'ltr'
        }}
      >

      {items.map((item, idx) => {
        const choices = item.choices || item.options || []

        return (
          <div
            key={`circle-sketch-${idx}`}
            style={{
              border: '1.5px solid #333',
              borderRadius: '10px',
              padding: '12px 8px',
              display: 'flex',
              flexDirection: isVisualLeft ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: isVisualLeft ? 'space-around' : 'center',
              background: '#fff',
              gap: '12px'
            }}
          >
            {/* Sketch */}
            <RenderSketch assetId={item.sketchId} size={sketchSize} />

            {/* Options Row (e.g. three letters or two words) */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              {choices.map((opt, cIdx) => (
                <div
                  key={`opt-${idx}-${cIdx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1.5px solid #222',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    minWidth: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                    minHeight: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                    justifyContent: 'center'
                  }}
                >
                  <span
                    style={{
                      fontFamily,
                      fontSize: isUrdu
                        ? TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading
                        : TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
                      fontWeight: 'bold',
                      color: '#000'
                    }}
                  >
                    {opt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      </div>

      {/* Shared Word Bank for ambiguous grouping (Mover English Q2) */}
      {groupingAmbiguous && Array.isArray(allWords) && allWords.length > 0 && (
        <div
          className="early-years-shared-word-bank"
          data-testid="shared-word-bank"
          style={{
            margin: '12px 0',
            padding: '12px 16px',
            border: '1.5px solid #333',
            borderRadius: '8px',
            background: '#f8fafc',
            textAlign: 'center',
            direction: isUrdu ? 'rtl' : 'ltr'
          }}
        >
          <div
            style={{
              fontSize: '11pt',
              fontWeight: 'bold',
              color: '#475569',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Word Bank
          </div>
          <div
            className="shared-word-bank-items"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            {allWords.map((word, wIdx) => (
              <span
                key={`shared-word-${wIdx}`}
                className="shared-word-item"
                data-word={word}
                style={{
                  fontFamily,
                  fontSize: isUrdu
                    ? TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading
                    : TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
                  fontWeight: 'bold',
                  padding: '4px 14px',
                  border: '1.5px solid #1e293b',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000'
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

