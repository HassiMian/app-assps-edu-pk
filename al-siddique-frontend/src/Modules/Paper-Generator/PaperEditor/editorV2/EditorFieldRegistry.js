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
    this._selectionLocks = new Map()
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
    this._selectionLocks.delete(fieldKey)
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

  saveSelection(fieldKey, selection, { force = false } = {}) {
    if (!fieldKey || !selection) return
    const from = Number(selection.from)
    const to = Number(selection.to)
    if (!Number.isFinite(from) || !Number.isFinite(to)) return

    const now = Date.now()
    const lockUntil = Number(this._selectionLocks.get(fieldKey) || 0)
    if (lockUntil && lockUntil <= now) this._selectionLocks.delete(fieldKey)
    const existing = this._savedSelections.get(fieldKey)
    const incomingEmpty = Boolean(selection.empty) || from === to
    const hasProtectedRange = existing && !existing.empty && existing.from !== existing.to

    // Toolbar/select controls temporarily steal browser focus. During that brief
    // interaction ProseMirror may report a collapsed caret on blur. Never let that
    // transient caret overwrite the user's real highlighted range.
    if (!force && incomingEmpty && hasProtectedRange && lockUntil > now) return existing

    const next = {
      from,
      to,
      anchor: Number.isFinite(Number(selection.anchor)) ? Number(selection.anchor) : from,
      head: Number.isFinite(Number(selection.head)) ? Number(selection.head) : to,
      empty: incomingEmpty,
      savedAt: now,
    }
    this._savedSelections.set(fieldKey, next)
    return next
  }

  captureActiveSelection({ lock = false, lockMs = 1800 } = {}) {
    const key = this.getActiveFieldKey()
    const editor = key ? this.get(key)?.editor : null
    const selection = editor?.state?.selection
    if (!key || !selection) return null
    this.saveSelection(key, selection, { force: true })
    if (lock) this._selectionLocks.set(key, Date.now() + Math.max(250, Number(lockMs) || 1800))
    return this.getSelection(key)
  }

  beginToolbarInteraction(lockMs = 1800) {
    return this.captureActiveSelection({ lock: true, lockMs })
  }

  endToolbarInteraction(fieldKey, { saveCurrent = true } = {}) {
    const key = fieldKey || this.getActiveFieldKey()
    if (!key) return null
    const editor = this.get(key)?.editor
    if (saveCurrent && editor?.state?.selection) {
      this.saveSelection(key, editor.state.selection, { force: true })
    }
    this._selectionLocks.delete(key)
    return this.getSelection(key)
  }

  isSelectionLocked(fieldKey) {
    const key = fieldKey || this.getActiveFieldKey()
    const until = Number(this._selectionLocks.get(key) || 0)
    if (until && until <= Date.now()) {
      this._selectionLocks.delete(key)
      return false
    }
    return until > Date.now()
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
    this._selectionLocks.clear()
    this._activeFieldKey = null
    this._lastFocusedFieldKey = null
  }
}

// Global or context-instantiable singleton instance
export const globalFieldRegistry = new EditorFieldRegistry()
