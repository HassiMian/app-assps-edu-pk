// StructuredFocusContext.jsx — Tracks whether focus is in a Tiptap field or a structured control.
// Provides history-routing context via React context API.

import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react'

// Re-export pure JS helpers (no JSX) so both this file and node:test can use them.
export {
  INTERACTION_MODE,
  buildStructuredControlKey,
  parseStructuredControlKey,
} from './structuredFocusHelpers.js'

const StructuredFocusCtx = createContext({
  getMode: () => 'NONE',
  setMode: () => {},
  getActiveStructuredKey: () => null,
  setActiveStructuredKey: () => {},
})

/**
 * Provider: wraps the editor container.
 * Children can call useStructuredFocus() to read/write focus state.
 */
export function StructuredFocusProvider({ children, onModeChange, onActiveStructuredKeyChange }) {
  const modeRef = useRef('NONE')
  const keyRef = useRef(null)

  const setMode = useCallback((mode) => {
    modeRef.current = mode
    onModeChange?.(mode)
  }, [onModeChange])

  const setActiveStructuredKey = useCallback((key) => {
    keyRef.current = key
    // Preserve the last non-null structured target for toolbar actions after input blur.
    // A Tiptap field focus explicitly clears this target in CanonicalPaperEditorMain.
    if (key) onActiveStructuredKeyChange?.(key)
  }, [onActiveStructuredKeyChange])

  const getMode = useCallback(() => modeRef.current, [])
  const getActiveStructuredKey = useCallback(() => keyRef.current, [])

  const ctx = useMemo(() => ({
    getMode,
    setMode,
    getActiveStructuredKey,
    setActiveStructuredKey,
  }), [getMode, setMode, getActiveStructuredKey, setActiveStructuredKey])

  return (
    <StructuredFocusCtx.Provider value={ctx}>
      {children}
    </StructuredFocusCtx.Provider>
  )
}

export function useStructuredFocus() {
  return useContext(StructuredFocusCtx)
}
