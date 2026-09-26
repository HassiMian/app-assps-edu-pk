// PictureColoringBlock.jsx — Large printable coloring sketches with labels and coloring whitespace
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import RenderSketch from '../assets/RenderSketch.jsx'

export function ColouringSketchArea({ sketchId, label, isUrdu = false, sketchSize = 'colouringVisual' }) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  return (
    <div
      className="early-years-colouring-area"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #777',
        borderRadius: '10px',
        padding: '12px 8px',
        background: '#fff',
        minWidth: '100px'
      }}
    >
      <RenderSketch assetId={sketchId} size={sketchSize} />
      {label && (
        <span
          style={{
            fontFamily,
            fontSize: TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
            fontWeight: 'bold',
            marginTop: '8px',
            color: '#111'
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export default function PictureColoringBlock({
  items = [],
  isUrdu = false,
  sketchSize = 'colouringVisual',
  layout = 'stacked'
}) {
  const isVisualLeft = layout === 'visual-left'

  return (
    <div
      className={`early-years-picture-coloring-block ${layout ? `layout-${layout}` : ''}`}
      data-layout={layout}
      style={{
        display: isVisualLeft ? 'flex' : 'grid',
        flexDirection: isVisualLeft ? 'row' : undefined,
        flexWrap: isVisualLeft ? 'wrap' : undefined,
        gridTemplateColumns: isVisualLeft ? undefined : `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
        gap: '14px',
        margin: '14px 0',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {items.map((item, idx) => (
        <ColouringSketchArea
          key={`color-item-${idx}`}
          sketchId={item.sketchId}
          label={item.label}
          isUrdu={isUrdu}
          sketchSize={sketchSize}
        />
      ))}
    </div>
  )
}
