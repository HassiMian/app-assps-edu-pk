// UrduFontNotice.jsx — Diagnostic warning bar for font fallback (non-printable)
import React, { useState, useEffect } from 'react'
import { checkUrduFontAvailability } from '../diagnostics/EarlyYearsFontDiagnostics.js'

export default function UrduFontNotice() {
  const [fontDiag, setFontDiag] = useState(null)

  useEffect(() => {
    setFontDiag(checkUrduFontAvailability())
  }, [])

  if (!fontDiag || fontDiag.jameelLoaded) {
    return null
  }

  return (
    <div
      className="early-years-font-notice no-print"
      style={{
        background: '#fffbeb',
        border: '1px solid #fde68a',
        color: '#92400e',
        padding: '6px 12px',
        fontSize: '11px',
        borderRadius: '6px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}
    >
      <span>
        ⚠️ <strong>Urdu Typography Diagnostic:</strong> Jameel Noori Nastaleeq is not detected in browser; rendering using verified system fallback <code>'Noto Nastaliq Urdu', serif</code>.
      </span>
      <span style={{ fontSize: '10px', color: '#b45309' }}>Non-printable Notice</span>
    </div>
  )
}
