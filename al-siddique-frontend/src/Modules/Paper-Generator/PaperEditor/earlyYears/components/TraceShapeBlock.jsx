import React from 'react'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function TraceShapeBlock({
  shapeId = 'shape.square.v1',
  isDotted = true,
  sketchSize = null
}) {
  return (
    <div
      className="early-years-trace-shape-block"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '16px 0',
        padding: '16px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        background: '#fff'
      }}
    >
      <div
        style={{
          width: sketchSize ? 'auto' : '120px',
          height: sketchSize ? 'auto' : '120px',
          minWidth: '60px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RenderSketch
          assetId={shapeId}
          size={sketchSize || '110px'}
          isDotted={isDotted}
        />
      </div>
      <span style={{ fontSize: '11px', color: '#777', marginTop: '8px' }}>
        Trace with pencil & color inside
      </span>
    </div>
  )
}
