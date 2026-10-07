export function resolveStructuredFieldPresentation(
  presentation,
  controlKey,
  fallbackDirection = 'auto'
) {
  const raw = presentation?.structuredFieldStyles?.[controlKey] || {}
  const style = { ...raw }
  const direction = style.direction || fallbackDirection

  if (style.paragraphSpacing) {
    style.marginBottom = style.paragraphSpacing
  }

  delete style.direction
  delete style.paragraphSpacing

  return { style, direction }
}

export function getStructuredPresentationContext(store, sectionId = '') {
  const workingDoc = store?.getWorkingDocument?.()
  return {
    presentation: workingDoc?.presentationOverlay || workingDoc?.presentation || {},
    documentId: workingDoc?.baseCanonicalDocumentId || '',
    sectionId,
  }
}
