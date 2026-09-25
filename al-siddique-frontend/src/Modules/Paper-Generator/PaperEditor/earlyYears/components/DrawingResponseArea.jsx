// DrawingResponseArea.jsx — Empty outlined canvas area for child drawings
import React from 'react'

export default function DrawingResponseArea({
  height = '60mm',
  hint = 'Draw inside this box',
  borderStyle = '2px dashed #444'
}) {
  return (
    <div
      className="early-years-drawing-canvas"
      style={{
        width: '100%',
        minHeight: height,
        border: borderStyle,
        borderRadius: '10px',
        margin: '12px 0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        fontSize: '11px',
        userSelect: 'none'
      }}
    >
      {hint}
    </div>
  )
}
