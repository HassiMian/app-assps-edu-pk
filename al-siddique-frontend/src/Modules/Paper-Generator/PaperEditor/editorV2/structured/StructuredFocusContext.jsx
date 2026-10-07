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
  const onModeChangeRef = useRef(onModeChange)
  const onActiveStructuredKeyChangeRef = useRef(onActiveStructuredKeyChange)

  // Callback props may be inline closures owned by the parent. Keep the latest
  // callback in refs so context methods stay identity-stable across provider
  // renders. Otherwise StructuredTextInput cleanup effects can run on an ordinary
  // re-render and incorrectly clear STRUCTURED interaction mode.
  onModeChangeRef.current = onModeChange
  onActiveStructuredKeyChangeRef.current = onActiveStructuredKeyChange

  const setMode = useCallback((mode) => {
    modeRef.current = mode
    onModeChangeRef.current?.(mode)
  }, [])

  const setActiveStructuredKey = useCallback((key) => {
    keyRef.current = key
    // Preserve the last non-null structured target for toolbar actions after input blur.
    // A Tiptap field focus explicitly clears this target in CanonicalPaperEditorMain.
    if (key) onActiveStructuredKeyChangeRef.current?.(key)
  }, [])

  // Keep getter identities stable. Structured inputs register cleanup effects that
  // must run on actual unmount, not merely because the provider re-rendered after
  // reporting an active structured key. Unstable getter identities caused focus
  // cleanup to reset STRUCTURED mode immediately, breaking Ctrl+Z routing.
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
