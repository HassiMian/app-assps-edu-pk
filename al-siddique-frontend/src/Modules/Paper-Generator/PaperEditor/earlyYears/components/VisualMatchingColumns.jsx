// VisualMatchingColumns.jsx — Reusable matching layout with wide connection corridor and anchor bullets
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function VisualMatchingColumns({
  leftItems = [],
  rightItems = [],
  connectionGap = '50mm',
  rowHeight = '16mm',
  isUrdu = false
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  const rowCount = Math.max(leftItems.length, rightItems.length)

  // Helper to render an item content (text, sketch, count of sketches)
  const renderItemContent = (item) => {
    if (!item) return null

    // Multiple counted sketch instances (e.g. 4 apples)
    if (item.count && item.sketchId) {
      return (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
            border: '1px solid #aaa',
            borderRadius: '6px',
            padding: '4px 6px',
            minWidth: '70px',
            justifyContent: 'center'
          }}
        >
          {Array.from({ length: item.count }).map((_, i) => (
            <RenderSketch
              key={`cnt-${item.id}-${i}`}
              assetId={item.sketchId}
              size="22mm"
            />
          ))}
        </div>
      )
    }

    // Single sketch
    if (item.sketchId) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RenderSketch assetId={item.sketchId} size="choiceVisual" />
          {item.label && (
            <span
              style={{
                fontFamily,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.instructionSubtext,
                color: '#555'
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      )
    }

    // Plain text or numeral
    return (
      <span
        style={{
          fontFamily,
          fontSize: TYPOGRAPHY_TOKENS.fontSizes.matchingText,
          fontWeight: 'bold',
          color: '#111',
          padding: '2px 8px'
        }}
      >
        {item.text}
      </span>
    )
  }

  return (
    <div
      className="early-years-matching-columns"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        margin: '14px 0',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {Array.from({ length: rowCount }).map((_, idx) => {
        const left = leftItems[idx]
        const right = rightItems[idx]

        return (
          <div
            key={`match-row-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: rowHeight,
              padding: '4px 8px'
            }}
          >
            {/* Left Column Item + Dot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '90px'
              }}
            >
              {renderItemContent(left)}
              {left && (
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#000',
                    flexShrink: 0
                  }}
                />
              )}
            </div>

            {/* Connection Corridor (blank line-drawing space) */}
            <div
              style={{
                flex: 1,
                minWidth: connectionGap,
                height: '1px'
              }}
            />

            {/* Right Column Dot + Item */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '90px',
                justifyContent: isUrdu ? 'flex-start' : 'flex-end'
              }}
            >
              {right && (
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#000',
                    flexShrink: 0
                  }}
                />
              )}
              {renderItemContent(right)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
