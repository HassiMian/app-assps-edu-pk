// Pure focus state shared by the provider and structured controls.
import { createContext, useContext } from 'react'

export const StructuredFocusCtx = createContext({
  getMode: () => 'NONE',
  setMode: () => {},
  getActiveStructuredKey: () => null,
  setActiveStructuredKey: () => {},
})

export function useStructuredFocus() {
  return useContext(StructuredFocusCtx)
}
