// EditorFieldRegistry.js — Stable Map-based registry for active in-place field editors

export function buildFieldKey(documentId, sectionId, nodeId, fieldName) {
  return `${documentId}::${sectionId}::${nodeId}::${fieldName}`
}

export function parseFieldKey(fieldKey) {
  const parts = String(fieldKey || '').split('::')
  return {
    documentId: parts[0] || '',
    sectionId: parts[1] || '',
    nodeId: parts[2] || '',
    fieldName: parts[3] || '',
  }
}

export class EditorFieldRegistry {
  constructor() {
    this._registry = new Map()
    this._savedSelections = new Map()
    this._activeFieldKey = null
    this._lastFocusedFieldKey = null
  }

  register(fieldKey, entry) {
    if (!fieldKey) return
    this._registry.set(fieldKey, {
      fieldKey,
      documentId: entry.documentId,
      sectionId: entry.sectionId,
      nodeId: entry.nodeId,
      fieldName: entry.fieldName,
      editor: entry.editor,
      capabilities: entry.capabilities || {
        richText: true,
        characterFormatting: true,
        paragraphFormatting: true,
        plainTextOnly: false,
      },
      domElement: entry.domElement || null,
      onExternalSync: entry.onExternalSync || null,
    })
  }

  unregister(fieldKey) {
    if (!fieldKey) return
    this._registry.delete(fieldKey)
    this._savedSelections.delete(fieldKey)
    if (this._activeFieldKey === fieldKey) {
      this._activeFieldKey = null
    }
  }

  get(fieldKey) {
    if (!fieldKey) return null
    return this._registry.get(fieldKey) || null
  }

  has(fieldKey) {
    return this._registry.has(fieldKey)
  }

  saveSelection(fieldKey, selection) {
    if (!fieldKey || !selection) return
    const from = Number(selection.from)
    const to = Number(selection.to)
    if (!Number.isFinite(from) || !Number.isFinite(to)) return
    this._savedSelections.set(fieldKey, {
      from,
      to,
      anchor: Number.isFinite(Number(selection.anchor)) ? Number(selection.anchor) : from,
      head: Number.isFinite(Number(selection.head)) ? Number(selection.head) : to,
      empty: Boolean(selection.empty),
      savedAt: Date.now(),
    })
  }

  captureActiveSelection() {
    const key = this.getActiveFieldKey()
    const editor = key ? this.get(key)?.editor : null
    const selection = editor?.state?.selection
    if (!key || !selection) return null
    this.saveSelection(key, selection)
    return this.getSelection(key)
  }

  getSelection(fieldKey) {
    const key = fieldKey || this.getActiveFieldKey()
    return key ? this._savedSelections.get(key) : null
  }

  setActiveFieldKey(fieldKey) {
    this._activeFieldKey = fieldKey
    if (fieldKey) {
      this._lastFocusedFieldKey = fieldKey
    }
  }

  getActiveFieldKey() {
    return this._activeFieldKey || this._lastFocusedFieldKey || null
  }

  getActiveEntry() {
    const key = this.getActiveFieldKey()
    return key ? this.get(key) : null
  }

  getActiveEditor() {
    const entry = this.getActiveEntry()
    return entry?.editor || null
  }

  getAllRegisteredKeys() {
    return Array.from(this._registry.keys())
  }

  clear() {
    this._registry.clear()
    this._savedSelections.clear()
    this._activeFieldKey = null
    this._lastFocusedFieldKey = null
  }
}

// Global or context-instantiable singleton instance
export const globalFieldRegistry = new EditorFieldRegistry()
