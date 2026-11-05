// ASSPS V5 source recovery: structured, reviewable transformations of live server metadata.
// Read-only server responses; avoid fabricating original paper contents.
const SAFE_ID = /^[A-Za-z0-9._:-]{1,220}$/

export function normalizeAssessmentIndex(rows, localPapers = []) {
  const seen = new Set(
    (localPapers || []).flatMap(p => [p?.serverPaperId, p?.canonicalDocument?.id]).filter(Boolean).map(String)
  )
  if (!Array.isArray(rows)) throw new Error('Assessment server did not return a valid list.')
  return rows.flatMap(row => {
    const id = String(row?.public_id || '')
    if (!SAFE_ID.test(id) || seen.has(id)) return []
    seen.add(id)
    const revision = Number(row?.current_revision || 0)
    const revisionAvailable = row?.current_revision_available !== false && Number.isSafeInteger(revision) && revision > 0
    return [{
      id, name:String(row.title || 'Untitled assessment').slice(0,240),
      serverPaperId:id, serverOnly:true, userAuthored:true,
      serverRevision:Number.isSafeInteger(revision) ? revision : 0,
      revisionAvailable, status:String(row.status || 'DRAFT').slice(0,32),
      createdAt:row.created_at || null, updatedAt:row.updated_at || null,
      sourceTab:'saved',
      persistenceAuthority:'SERVER_REVISION_SOURCE_OF_TRUTH',
      persistenceMode:revisionAvailable ? 'SERVER_LISTED_NOT_YET_OPENED' : 'SERVER_REVISION_MISSING',
    }]
  })
}

export function normalizeVaultIndex(items) {
  if (!Array.isArray(items)) throw new Error('Authenticated Paper Vault returned an invalid list.')
  const seen = new Set()
  return items.flatMap(item => {
    const id = String(item?.id || '').trim()
    if (!/^[1-9][0-9]{0,19}$/.test(id) || seen.has(id)) return []
    seen.add(id)
    return [{
      id, name:String(item.name || 'Untitled Vault paper').slice(0,240),
      className:String(item.className || item.class_name || ''),
      section:String(item.section || ''), subjectName:String(item.subjectName || item.subject_name || ''),
      status:String(item.status || ''), revision:Number(item.revision || 0),
      updatedAt:item.updatedAt || item.updated_at || null,
    }]
  })
}

export function extractVaultRecord(responseData, row) {
  const record = responseData?.data
  if (responseData?.success !== true || !record || String(record.id) !== String(row.id)) {
    throw new Error('Authenticated Vault source unavailable. No source was reconstructed.')
  }
  const original = record.document
  if (!original || typeof original !== 'object' || Array.isArray(original)) {
    throw new Error('Vault record has no authentic document.')
  }
  const document = original.payload && typeof original.payload === 'object' && !Array.isArray(original.payload)
    && !Array.isArray(original.sections) ? original.payload : original
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Vault payload is not editable.')
  return {record, original, document}
}

export function createIndependentVaultDraft(responseData, row, time = Date.now()) {
  const {document} = extractVaultRecord(responseData, row)
  if (!Array.isArray(document.sections) || !document.sections.length) {
    throw new Error('Vault paper has no compatible editable sections.')
  }
  // Explicitly strip all publication and persistence authority from new copies.
  return {
    ...JSON.parse(JSON.stringify(document)),
    id:'vault-copy-'+row.id+'-'+time,
    name:String(document.name || row.name || 'Vault paper copy'),
    config:{
      ...(document.config || {}),
      classLevel:document.config?.classLevel || row.className,
      subject:document.config?.subject || row.subjectName,
    },
    userAuthored:true, creationMethod:'duplicate',
    status:'draft', revision:1, approvalStatus:'PENDING',
    approvedBy:null, approvedAt:null, approvalSignature:null,
    publisherApproval:null, publishedAt:null, isPublished:false,
    duplicateOf:'vault-'+String(row.id), sourceTab:'saved',
    persistenceMode:'UNSAVED_NEW_COPY', serverPaperId:null, canonicalDocument:null,
    vaultSourceId:String(row.id),
  }
}

export function vaultRecoveryExport(responseData,row) {
  const {record, original} = extractVaultRecord(responseData,row)
  const body=JSON.stringify({
    kind:'ASSPS_PAPER_VAULT_SOURCE_RECOVERY',
    sourcePaperId:String(row.id),
    sourceRevision:Number(record.revision || row.revision || 1),
    name:String(row.name || ''),
    sourceDocument:original,
    releaseStatus:'UNMODIFIED_READ_ONLY_SOURCE_NOT_APPROVED',
  },null,2)
  if (body.length > 10000000) throw new Error('Source exceeds safe browser export limit.')
  return body
}
