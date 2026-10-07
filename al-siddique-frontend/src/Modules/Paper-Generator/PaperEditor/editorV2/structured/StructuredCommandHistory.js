// StructuredCommandHistory.js — In-memory undo/redo stack for structural commands.
// RULE: Never stores full-document snapshots. Each entry is a command + its pre-computed inverse.
// RULE: Undo does NOT decrement the ID allocator.

const MAX_HISTORY = 100

export class StructuredCommandHistory {
  constructor() {
    this._undo = []  // StructuralCommand[]
    this._redo = []  // StructuralCommand[]
  }

  /**
   * Pushes a new command. Clears redo stack (branching history).
   * No new IDs are issued here — IDs are already assigned during command creation.
   */
  push(command) {
    this._undo.push(command)
    if (this._undo.length > MAX_HISTORY) {
      this._undo.shift()
    }
    this._redo = []  // branching: redo history cleared on new command
  }

  /**
   * Pops the top undo entry. Returns the INVERSE command (what to apply).
   * Returns null if stack is empty.
   */
  undo() {
    const cmd = this._undo.pop()
    if (!cmd) return null
    this._redo.push(cmd)
    return cmd.inverse
  }

  /**
   * Pops the top redo entry. Returns the original command (what to apply).
   * Returns null if stack is empty.
   */
  redo() {
    const cmd = this._redo.pop()
    if (!cmd) return null
    this._undo.push(cmd)
    return cmd
  }

  canUndo() { return this._undo.length > 0 }
  canRedo() { return this._redo.length > 0 }

  clear() {
    this._undo = []
    this._redo = []
  }

  undoStackSize() { return this._undo.length }
  redoStackSize() { return this._redo.length }
}
