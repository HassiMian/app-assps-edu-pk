import React from 'react'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function PatternCopyBlock({
  patterns = []
}) {
  return (
    <div
      className="early-years-pattern-copy-block"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        margin: '12px 0'
      }}
    >
      {patterns.map((item, idx) => (
        <div
          key={`pat-row-${idx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '8px 14px',
            background: '#fff'
          }}
        >
          {/* Source Shape Prompt */}
          <div
            style={{
              width: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #ddd',
              paddingRight: '12px'
            }}
          >
            <RenderSketch assetId={item.shapeId} size="patternVisual" />
          </div>

          {/* Arrow indicating copy */}
          <div style={{ color: '#888', fontSize: '18px' }}>➔</div>

          {/* Child drawing / copying canvas box */}
          <div
            style={{
              flex: 1,
              height: '52px',
              border: '2px dashed #444',
              borderRadius: '8px',
              background: '#fcfcfc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '11px', color: '#aaa' }}>Draw here</span>
          </div>
        </div>
      ))}
    </div>
  )
}
