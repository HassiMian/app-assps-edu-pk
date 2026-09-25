// CanonicalStaticNode.jsx — Renders Read-Only Specialized Nodes in B3 (Rules 6, 7, 8, 9, 10, 11, 12, 13, 14)
import React from 'react'

export default function CanonicalStaticNode({ node, direction = 'auto' }) {
  if (!node) return null
  const type = node.type || node.nodeType
  const dir = direction === 'rtl' ? 'rtl' : (direction === 'ltr' ? 'ltr' : 'auto')

  // 1. Section Banner Node (Rule 13)
  if (type === 'section_banner') {
    return (
      <div
        className="canonical-section-banner"
        dir={dir}
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#1e3a8a',
          margin: '8px 0 4px',
        }}
      >
        {node.bannerText || node.rawText || ''}
      </div>
    )
  }

  // 2. Scope Header Node (Rule 13)
  if (type === 'scope_header') {
    return (
      <div
        className="canonical-scope-header"
        dir={dir}
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f766e',
          margin: '8px 0 4px',
          fontStyle: 'italic',
        }}
      >
        {node.headingText || ''}
      </div>
    )
  }

  // 3. MCQ Options Grid (Rule 8)
  if (type === 'mcq' && Array.isArray(node.options) && node.options.length > 0) {
    return (
      <div
        className="canonical-mcq-options-grid"
        dir={dir}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginTop: '6px',
          paddingLeft: dir === 'rtl' ? '0' : '16px',
          paddingRight: dir === 'rtl' ? '16px' : '0',
          fontSize: '12px',
        }}
      >
        {node.options.map((opt, idx) => {
          // Label priority: displayLabel -> sourceLabel -> canonicalLabel -> label (Rule 8)
          const label = opt.displayLabel || opt.sourceLabel || opt.canonicalLabel || opt.label || String.fromCharCode(65 + idx)
          const optText = opt.text || opt.textUrdu || ''
          const optDir = opt.direction || dir

          return (
            <div key={opt.id || idx} dir={optDir} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, color: '#1e3a8a' }}>({label})</span>
              <span>{optText}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // 4. True / False Node (Rule 9)
  if (type === 'true_false') {
    const statement = node.statement || node.statementText || node.stemText || ''
    return (
      <div className="canonical-true-false-node" dir={dir} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
        <span>{statement}</span>
        {node.hasIndicatorBox && (
          <span
            className="canonical-tf-box"
            style={{
              display: 'inline-block',
              border: '1.5px solid #1e3a8a',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#1e3a8a',
              letterSpacing: '0.05em',
              userSelect: 'none',
            }}
          >
            [ &nbsp;T&nbsp; / &nbsp;F&nbsp; ]
          </span>
        )}
      </div>
    )
  }

  // 5. Fill in the Blank Node (Rule 10)
  if (type === 'fill_blank') {
    const hasSegments = Array.isArray(node.segments) && node.segments.length > 0
    return (
      <div className="canonical-fill-blank-node" dir={dir} style={{ fontSize: '13px', lineHeight: 1.8 }}>
        {hasSegments ? (
          node.segments.map((seg, sIdx) => {
            if (seg.type === 'blank') {
              return (
                <span
                  key={sIdx}
                  className="canonical-fill-blank-line"
                  style={{
                    display: 'inline-block',
                    borderBottom: '1.5px solid #1e293b',
                    minWidth: '50px',
                    margin: '0 4px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  {seg.value || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                </span>
              )
            }
            return <span key={sIdx}>{seg.value}</span>
          })
        ) : (
          <span>{node.fullText || node.rawSource || ''}</span>
        )}

        {/* Word Bank if present (Rule 10) */}
        {node.wordBank && (
          <div
            className="canonical-word-bank"
            style={{
              marginTop: '6px',
              padding: '4px 10px',
              background: '#f8fafc',
              border: '1px dashed #94a3b8',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#334155',
            }}
          >
            <strong>Word Bank: </strong>
            <span>{Array.isArray(node.wordBank) ? node.wordBank.join(', ') : String(node.wordBank)}</span>
          </div>
        )}
      </div>
    )
  }

  // 6. Matching Columns (Rule 7)
  if (type === 'matching_columns') {
    // Reads canonical leftItems and rightItems (Rule 7)
    const left = Array.isArray(node.leftItems) ? node.leftItems : (Array.isArray(node.leftColumn) ? node.leftColumn : [])
    const right = Array.isArray(node.rightItems) ? node.rightItems : (Array.isArray(node.rightColumn) ? node.rightColumn : [])
    const maxRows = Math.max(left.length, right.length)

    return (
      <div style={{ margin: '8px 0', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#1e3a8a' }}>
              <th style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1', textAlign: dir === 'rtl' ? 'right' : 'left', width: '50%' }}>Column A</th>
              <th style={{ padding: '6px 10px', textAlign: dir === 'rtl' ? 'right' : 'left', width: '50%' }}>Column B</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, rIdx) => {
              const lItem = left[rIdx]
              const rItem = right[rIdx]
              const lText = typeof lItem === 'object' && lItem !== null ? (lItem.text || '') : String(lItem || '')
              const rText = typeof rItem === 'object' && rItem !== null ? (rItem.text || '') : String(rItem || '')

              return (
                <tr key={rIdx} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1' }}>{lText}</td>
                  <td style={{ padding: '6px 10px' }}>{rText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // 7. Grammar Table (Rule 11)
  if (type === 'grammar_table') {
    const columns = Array.isArray(node.columns) && node.columns.length > 0 ? node.columns : ['Column 1', 'Column 2']
    const rows = Array.isArray(node.rows) ? node.rows : []

    return (
      <div style={{ margin: '8px 0', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#1e3a8a' }}>
              {columns.map((colName, cIdx) => (
                <th
                  key={cIdx}
                  style={{
                    padding: '6px 10px',
                    borderRight: cIdx < columns.length - 1 ? '1px solid #cbd5e1' : 'none',
                    textAlign: dir === 'rtl' ? 'right' : 'left',
                  }}
                >
                  {colName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const leftVal = row.leftText || (row.leftIsBlank ? '__________' : '')
              const rightVal = row.rightText || (row.rightIsBlank ? '__________' : '')

              return (
                <tr key={rIdx} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                    {leftVal}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                    {rightVal}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // 8. Vertical Math (Rule 12)
  if (type === 'vertical_math') {
    const operands = Array.isArray(node.operands) ? node.operands : []
    const operator = node.operator || ''
    const resultRaw = node.result?.raw || null

    return (
      <div
        className="canonical-vertical-math-block"
        style={{
          display: 'inline-block',
          fontFamily: 'monospace, Courier, sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          textAlign: 'right',
          margin: '6px 12px',
          userSelect: 'none',
        }}
      >
        <div style={{ borderBottom: '2px solid #0f172a', padding: '4px 6px' }}>
          {operands.map((op, oIdx) => (
            <div key={oIdx} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ minWidth: '16px', textAlign: 'left' }}>
                {oIdx === operands.length - 1 ? operator : ''}
              </span>
              <span>{op.raw ?? op.normalizedNumericValue ?? ''}</span>
            </div>
          ))}
        </div>
        {resultRaw !== null && (
          <div style={{ padding: '4px 6px', fontWeight: 800 }}>
            {resultRaw}
          </div>
        )}
      </div>
    )
  }

  // 9. Unknown Preserved Node (Rule 14, 37)
  if (type === 'unknown_preserved') {
    return (
      <div className="canonical-unknown-preserved-block" dir={dir}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
          [Preserved Academic Structure]
        </div>
        <div>{node.rawText || ''}</div>
      </div>
    )
  }

  // Default fallback for other specialized nodes
  return null
}
