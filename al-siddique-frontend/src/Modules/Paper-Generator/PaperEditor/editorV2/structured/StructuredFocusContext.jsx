// StructuredFocusContext.jsx — Tracks whether focus is in a Tiptap field or a structured control.
// Provides history-routing context via React context API.

import React, { createContext, useContext, useRef, useCallback } from 'react'

// INTERACTION MODES (spec §14)
export const INTERACTION_MODE = {
  TIPTAP:     'TIPTAP',
  STRUCTURED: 'STRUCTURED',
  NONE:       'NONE',
}

const StructuredFocusCtx = createContext({
  getMode: () => INTERACTION_MODE.NONE,
  setMode: () => {},
  getActiveStructuredKey: () => null,
  setActiveStructuredKey: () => {},
})

/**
 * Provider: wraps the editor container.
 * Children can call useStructuredFocus() to read/write focus state.
 */
export function StructuredFocusProvider({ children, onModeChange }) {
  const modeRef = useRef(INTERACTION_MODE.NONE)
  const keyRef = useRef(null)

  const setMode = useCallback((mode) => {
    modeRef.current = mode
    onModeChange?.(mode)
  }, [onModeChange])

  const setActiveStructuredKey = useCallback((key) => {
    keyRef.current = key
  }, [])

  const ctx = {
    getMode: () => modeRef.current,
    setMode,
    getActiveStructuredKey: () => keyRef.current,
    setActiveStructuredKey,
  }

  return (
    <StructuredFocusCtx.Provider value={ctx}>
      {children}
    </StructuredFocusCtx.Provider>
  )
}

export function useStructuredFocus() {
  return useContext(StructuredFocusCtx)
}

/**
 * Builds a structured control key. Separate from B3 field key grammar (spec §13).
 * Format: structured::<docId>::<secId>::<nodeId>::<kind>::<itemId>::<subfield>
 */
export function buildStructuredControlKey(docId, secId, nodeId, kind, itemId = '', subfield = '') {
  return `structured::${docId}::${secId}::${nodeId}::${kind}::${itemId}::${subfield}`
}

export function parseStructuredControlKey(key) {
  if (typeof key !== 'string' || !key.startsWith('structured::')) return null
  const parts = key.split('::')
  return {
    prefix:   parts[0] || '',
    docId:    parts[1] || '',
    secId:    parts[2] || '',
    nodeId:   parts[3] || '',
    kind:     parts[4] || '',
    itemId:   parts[5] || '',
    subfield: parts[6] || '',
  }
}
