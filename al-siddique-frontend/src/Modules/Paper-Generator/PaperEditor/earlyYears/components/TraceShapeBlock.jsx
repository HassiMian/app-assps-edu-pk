import React from 'react'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function TraceShapeBlock({
  shapeId = 'shape.square.v1',
  isDotted = true
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
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <RenderSketch
          assetId={shapeId}
          size="110px"
          isDotted={isDotted}
        />
      </div>
      <span style={{ fontSize: '11px', color: '#777', marginTop: '8px' }}>
        Trace with pencil & color inside
      </span>
    </div>
  )
}
