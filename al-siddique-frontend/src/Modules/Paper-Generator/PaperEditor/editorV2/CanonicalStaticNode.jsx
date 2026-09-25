// CanonicalStaticNode.jsx — Renders Read-Only Specialized Nodes in B3 (Rules 21, 37)
import React from 'react'

export default function CanonicalStaticNode({ node, direction = 'auto' }) {
  if (!node) return null
  const type = node.type || node.nodeType
  const dir = direction === 'rtl' ? 'rtl' : (direction === 'ltr' ? 'ltr' : 'auto')

  // 1. Section Banner Node
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

  // 2. Unknown Preserved Node (Rule 37)
  if (type === 'unknown_preserved') {
    return (
      <div className="canonical-unknown-preserved-block" dir={dir}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
          [Preserved Raw Academic Text]
        </div>
        <div>{node.rawText || ''}</div>
      </div>
    )
  }

  // 2. MCQ Options Grid (Read-only in B3, Rule 21)
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
        {node.options.map((opt, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, color: '#1e3a8a' }}>({opt.label || String.fromCharCode(65 + idx)})</span>
            <span>{opt.text || opt.textUrdu || ''}</span>
          </div>
        ))}
      </div>
    )
  }

  // 3. Matching Columns
  if (type === 'matching_columns') {
    const left = node.leftColumn || []
    const right = node.rightColumn || []
    const maxRows = Math.max(left.length, right.length)
    return (
      <div style={{ margin: '8px 0', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#334155' }}>
              <th style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'left' }}>Column A</th>
              <th style={{ padding: '4px 8px', textAlign: 'left' }}>Column B</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, rIdx) => (
              <tr key={rIdx} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0' }}>{left[rIdx] || ''}</td>
                <td style={{ padding: '4px 8px' }}>{right[rIdx] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Default fallback for other specialized nodes
  return null
}
