// A paper listed by the tenant-authorized server is not the same thing as a
// browser-local backup. Resolve its real revision before opening it for edits.
export function cloudAssessmentRows(serverRows) {
  if (!Array.isArray(serverRows)) throw new Error('Assessment server did not return a valid paper list.')
  const seen = new Set()
  return serverRows.filter(row => {
    const id=String(row?.public_id || '').trim()
    if (!id || seen.has(id)) return false
    seen.add(id); return true
  }).map(row => ({
    id: String(row.public_id),
    serverPaperId:String(row.public_id),
    serverOnly:true,
    userAuthored:true,
    name:String(row.title || '').trim() || 'Untitled assessment',
    serverRevision:Number(row.current_revision || 0),
    status:String(row.status || 'DRAFT'),
    createdAt:row.created_at || null,
    updatedAt:row.updated_at || null,
    persistenceAuthority:'SERVER_REVISION_SOURCE_OF_TRUTH',
    persistenceMode:'SERVER_LISTED_NOT_YET_OPENED',
  }))
}
