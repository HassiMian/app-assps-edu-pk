// Explicit exam-paper status. Never infer examination absence from daily attendance.
export const RESULT_STATUS_LABELS = Object.freeze({
  SCORED:'', ABSENT:'AB', PENDING:'Pending', EXCUSED:'EX', INVALID:'—'
})
export function interpretSubjectResult(row = {}) {
  const rawStatus = row?.result_status ?? row?.exam_result_status
  const rawMark = row?.marks_obtained ?? row?.obtainedMarks
  const blank = rawMark === undefined || rawMark === null || rawMark === ''
  const explicit = rawStatus !== undefined && rawStatus !== null && rawStatus !== ''
  const status = explicit ? String(rawStatus).trim().toUpperCase() : (blank ? 'PENDING' : 'SCORED')
  if (!(status in RESULT_STATUS_LABELS)) return {status:'INVALID',score:null,label:'—'}
  if (status === 'SCORED') {
    if (blank || !Number.isFinite(Number(rawMark)) || Number(rawMark) < 0)
      return {status:'INVALID',score:null,label:'—'}
    return {status:'SCORED',score:Number(rawMark),label:String(Number(rawMark))}
  }
  if (!blank) return {status:'INVALID',score:null,label:'—'}
  return {status,score:null,label:RESULT_STATUS_LABELS[status]}
}
