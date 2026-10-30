// Display-only legacy card projection. Never turn an unentered mark into
// numeric zero or issue a pass/fail for an incomplete student result.
const decimalValue = raw => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
export function summarizeResultCardScores({studentId,subjects=[],marks={},totalMarks,passMarks}) {
  const perSubjectTotal = decimalValue(totalMarks)
  const maxValid = perSubjectTotal !== null && perSubjectTotal > 0
  const requiredPass = decimalValue(passMarks)
  const passValid = maxValid && requiredPass !== null &&
    requiredPass >= 0 && requiredPass <= perSubjectTotal
  const rows = (Array.isArray(subjects) ? subjects : []).map(subject => {
    const raw = marks?.[studentId]?.[subject]
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === ''))
      return {subject,status:'PENDING',score:null,label:'Pending'}
    const score = decimalValue(raw)
    if (score === null || score < 0 || (maxValid && score > perSubjectTotal))
      return {subject,status:'INVALID',score:null,label:'—'}
    return {subject,status:'SCORED',score,label:String(score)}
  })
  const complete = maxValid && rows.length > 0 && rows.every(row => row.status === 'SCORED')
  const totalObtained = rows.reduce((sum,row) => sum + (row.score ?? 0),0)
  const totalMax = maxValid ? rows.length * perSubjectTotal : null
  return {
    rows,perSubjectTotal,totalObtained,totalMax,complete,
    percentage:complete ? Math.round(totalObtained / totalMax * 100) : null,
    // A high total cannot mask a failed subject (e.g. 49.5 + genuine 0).
    // The exam's configured per-subject pass mark remains authoritative.
    pass:complete && passValid ? rows.every(row => row.score >= requiredPass) : null,
  }
}
