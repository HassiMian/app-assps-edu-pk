import { useEffect, useRef } from 'react';

export default function CanonicalInlineField({
  value,
  onCommit,
  isEditing = true,
  placeholder = '',
  ariaLabel = 'Editable field',
  minWidth = '24px',
  textAlign = 'inherit',
  numeric = false,
  multiline = false,
  style = {},
}) {
  const ref = useRef(null)
  const normalized = value === null || value === undefined ? '' : String(value)

  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    if (el.textContent !== normalized) el.textContent = normalized
  }, [normalized])

  if (!isEditing) {
    return (
      <span style={{ minWidth, textAlign, ...style }}>
        {normalized || placeholder}
      </span>
    )
  }

  const commit = () => {
    if (!ref.current || typeof onCommit !== 'function') return
    let next = multiline
      ? (ref.current.innerText ?? ref.current.textContent ?? '')
      : (ref.current.textContent ?? '')
    if (!normalized && next === placeholder) next = ''
    if (numeric) {
      next = next.replace(/[^0-9.]/g, '')
    }
    if (next !== normalized) onCommit(next)
    ref.current.textContent = next || placeholder
  }

  return (
    <span
      ref={ref}
      data-canonical-inline-editor
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      onFocus={(event) => {
        if (!normalized && event.currentTarget.textContent === placeholder) {
          event.currentTarget.textContent = ''
        }
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !multiline) {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.currentTarget.textContent = normalized
          event.currentTarget.blur()
        }
      }}
      style={{
        display: 'inline-block',
        minWidth,
        minHeight: '1em',
        outline: 'none',
        textAlign,
        borderBottom: '1px dashed #94a3b8',
        background: 'rgba(239, 246, 255, 0.7)',
        borderRadius: '2px',
        padding: '0 2px',
        cursor: 'text',
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
        ...style,
      }}
    >
      {normalized || placeholder}
    </span>
  )
}
