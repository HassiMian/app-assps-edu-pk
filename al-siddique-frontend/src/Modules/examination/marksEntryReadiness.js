// Pure, tenant-data-free derived view of an authenticated Marks Entry roster.
// A missing mark is NEVER the number zero. Only acknowledged/read-back values
// are 'saved'; pending edits are kept separately until the server responds.
const valid = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value))
export function marksEntryReadiness(students = [], saved = {}, edited = {}) {
 const ids = [...new Set((students || []).map(row => String(row?.id ?? '')).filter(Boolean))]
 const savedCount = ids.filter(id => valid(saved[id])).length
 const editedCount = ids.filter(id => Object.hasOwn(edited,id) && valid(edited[id])).length
 const blankDraftCount = ids.filter(id => Object.hasOwn(edited,id) && !valid(edited[id])).length
 return {students:ids.length,saved:savedCount,pending:ids.length-savedCount,edited:editedCount,blankDraft:blankDraftCount,readyToEnter:ids.length>0}
}
export function retainNewerMarkEdits(current = {},submittedRows = []) {
 const next={...current}
 for (const row of submittedRows) {
  const id=String(row.student_id)
  // A newer edit of the same student must survive a prior async save.
  if (Object.hasOwn(next,id) && String(next[id]).trim()===String(row.marks_obtained)) delete next[id]
 }
 return next
}
