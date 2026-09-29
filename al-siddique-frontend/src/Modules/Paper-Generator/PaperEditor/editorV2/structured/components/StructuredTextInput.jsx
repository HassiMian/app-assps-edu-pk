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
  store = null,
}) {
  const [localVal, setLocalVal] = useState(value ?? '')
  const { setMode, setActiveStructuredKey, getActiveStructuredKey } = useStructuredFocus()
  const isCommittedRef = useRef(false)

  // Sync external value updates
  useEffect(() => {
    setLocalVal(value ?? '')
  }, [value])

  // Cleanup on unmount if this control had focus (Rule 19)
  useEffect(() => {
    return () => {
      if (controlKey && getActiveStructuredKey() === controlKey) {
        setActiveStructuredKey(null)
        setMode(INTERACTION_MODE.NONE)
      }
    }
  }, [controlKey, getActiveStructuredKey, setActiveStructuredKey, setMode])

  const handleFocus = () => {
    setMode(INTERACTION_MODE.STRUCTURED)
    if (controlKey) {
      setActiveStructuredKey(controlKey)
    }
  }

  const handleBlur = () => {
    if (!controlKey || getActiveStructuredKey() === controlKey) {
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

  const structuredStyle = controlKey && store?.getStructuredFieldStyle
    ? store.getStructuredFieldStyle(controlKey)
    : {}
  const effectiveDir = structuredStyle.direction || dir
  const visualStructuredStyle = {
    ...structuredStyle,
    ...(structuredStyle.paragraphSpacing ? { marginBottom: structuredStyle.paragraphSpacing } : {}),
  }
  delete visualStructuredStyle.direction
  delete visualStructuredStyle.paragraphSpacing

  const baseStyle = {
    fontFamily: effectiveDir === 'rtl'
      ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif"
      : "'Times New Roman', 'Arial', serif",
    fontSize: '13px',
    lineHeight: '1.4',
    padding: '2px 3px',
    border: '1px solid transparent',
    borderBottom: '1px solid transparent',
    borderRadius: '2px',
    background: 'transparent',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    ...style,
    ...visualStructuredStyle,
  }

  const printSpanStyle = {
    display: 'none',
    fontFamily: baseStyle.fontFamily,
    fontSize: baseStyle.fontSize,
    lineHeight: baseStyle.lineHeight,
    whiteSpace: multiline ? 'pre-wrap' : 'normal',
    color: '#000000',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    ...style,
    ...visualStructuredStyle,
  }

  if (multiline) {
    return (
      <>
        <span className="structured-text-print-only" dir={effectiveDir} style={printSpanStyle}>
          {localVal}
        </span>
        <textarea
          value={localVal}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          dir={effectiveDir}
          disabled={disabled}
          rows={rows}
          aria-label={ariaLabel || placeholder}
          className={`structured-text-input structured-text-screen-only ${className}`}
          style={{ ...baseStyle, resize: 'vertical' }}
        />
      </>
    )
  }

  return (
    <>
      <span className="structured-text-print-only" dir={effectiveDir} style={printSpanStyle}>
        {localVal}
      </span>
      <input
        type="text"
        value={localVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        dir={effectiveDir}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        className={`structured-text-input structured-text-screen-only ${className}`}
        style={baseStyle}
      />
    </>
  )
}
