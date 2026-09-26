// StructuredTextInput.jsx — Plain text input for structured node fields (B4).
// RULE: Never use Tiptap for individual MCQ options, grammar cells, or fill-blank tokens.
// Preserves exact string input without automatic trim(). Supports dir and keyboard shortcuts.

import React, { useState, useEffect, useRef } from 'react'
import { useStructuredFocus, INTERACTION_MODE } from '../StructuredFocusContext.jsx'

export default function StructuredTextInput({
  value = '',
  onCommit,
  placeholder = '',
  dir = 'auto',
  disabled = false,
  multiline = false,
  rows = 2,
  className = '',
  style = {},
  controlKey = null,
  ariaLabel = '',
}) {
  const [localVal, setLocalVal] = useState(value ?? '')
  const { setMode, setActiveStructuredKey, getActiveStructuredKey } = useStructuredFocus()
  const isCommittedRef = useRef(false)

  // Sync external value updates
  useEffect(() => {
    setLocalVal(value ?? '')
  }, [value])

  const handleFocus = () => {
    setMode(INTERACTION_MODE.STRUCTURED)
    if (controlKey) {
      setActiveStructuredKey(controlKey)
    }
  }

  const handleBlur = () => {
    if (controlKey && getActiveStructuredKey() === controlKey) {
      setActiveStructuredKey(null)
      setMode(INTERACTION_MODE.NONE)
    }
    if (localVal !== value) {
      onCommit?.(localVal)
    }
  }

  const handleChange = (e) => {
    setLocalVal(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      e.target.blur() // triggers handleBlur which commits
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLocalVal(value ?? '')
      e.target.blur()
    }
  }

  const baseStyle = {
    fontFamily: dir === 'rtl'
      ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif"
      : "'Times New Roman', 'Arial', serif",
    fontSize: '13px',
    lineHeight: '1.4',
    padding: '3px 6px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    background: disabled ? '#f8fafc' : '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    ...style,
  }

  if (multiline) {
    return (
      <textarea
        value={localVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        dir={dir}
        disabled={disabled}
        rows={rows}
        aria-label={ariaLabel || placeholder}
        className={`structured-text-input ${className}`}
        style={{ ...baseStyle, resize: 'vertical' }}
      />
    )
  }

  return (
    <input
      type="text"
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      dir={dir}
      disabled={disabled}
      aria-label={ariaLabel || placeholder}
      className={`structured-text-input ${className}`}
      style={baseStyle}
    />
  )
}
