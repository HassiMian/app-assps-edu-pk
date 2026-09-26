// AddStructuredNodeMenu.jsx — Dropdown menu for inserting new canonical structured questions (B4-E).
// Insertable types: MCQ, True/False, Fill Blank, Matching Columns, Grammar Table, Vertical Math.
// FORBIDDEN: scope_header, section_banner, unknown_preserved.

import React, { useState, useRef, useEffect } from 'react'

const INSERTABLE_OPTIONS = [
  { type: 'mcq', label: 'Multiple Choice (MCQ)' },
  { type: 'true_false', label: 'True / False' },
  { type: 'fill_blank', label: 'Fill in the Blanks' },
  { type: 'matching_columns', label: 'Matching Columns' },
  { type: 'grammar_table', label: 'Grammar Table (2 Col)' },
  { type: 'vertical_math', label: 'Vertical Math' },
]

export default function AddStructuredNodeMenu({
  onSelectType,
  label = '+ Add Question',
  className = '',
  buttonStyle = {},
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#1e3a8a',
          background: '#ffffff',
          border: '1px solid #93c5fd',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          userSelect: 'none',
          ...buttonStyle,
        }}
        className={className}
      >
        <span>{label}</span>
        <span style={{ fontSize: '9px' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 50,
            minWidth: '180px',
            padding: '4px 0',
          }}
        >
          {INSERTABLE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                setIsOpen(false)
                onSelectType(opt.type)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                fontSize: '12px',
                color: '#1e293b',
                cursor: 'pointer',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
