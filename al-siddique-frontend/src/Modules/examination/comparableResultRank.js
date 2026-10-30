/**
 * Review-only ranking guard: competition ranking is safe only inside an
 * explicitly comparable FIRST-TERM subject/max-score scheme. Does not mutate
 * result records or create false marks/approvals. Minority or tied schemes
 * have no verified rank until an academic authority reconciles the mapping.
 */
const normal = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ')
// Never coerce missing/boolean/scientific/hex marks to a legitimate zero.
// PostgreSQL numeric JSON values are numbers; older decimal-string data is allowed.
const decimalMark = raw => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}
const ordinal = n => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th'
    : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return String(n) + suffix
}

export function rankComparableResults(results, students, {
  classKey = normal, excludedSubject = () => false
} = {}) {
  const studentsById = new Map((students || []).map(s => [String(s.id),s]))
  const byStudent = new Map()
  for(const r of results || []) {
    if(excludedSubject(r?.subject || r?.subjectName))continue
    const id=String(r?.student_id ?? '')
    if(!id)continue
    let record=byStudent.get(id)
    if(!record) {
      const student=studentsById.get(id)
      const cls=classKey(student?.className || student?.class || r?.student_class || '')
      record={id,cls,invalid:!cls,obtained:0,marks:[],seen:new Set()}
      byStudent.set(id,record)
    }
    const subject=normal(r?.subject || r?.subjectName)
    const total=r?.total_marks
    const obtained=r?.marks_obtained
    const max=decimalMark(total),value=decimalMark(obtained)
    if(!subject || record.seen.has(subject) || max===null || max<=0 ||
       value===null || value<0 || value>max) {
      record.invalid=true
      continue
    }
    record.seen.add(subject)
    record.marks.push([subject,max])
    record.obtained+=value
  }
  const grouped=new Map()
  for(const record of byStudent.values()) {
    if(!grouped.has(record.cls))grouped.set(record.cls,[])
    grouped.get(record.cls).push(record)
  }
  const rankMap=new Map()
  for(const records of grouped.values()) {
    // Set explicit unknown rank to prevent unsafe fallback to a stale
    // student.position property in the printed result.
    for(const record of records)rankMap.set(record.id,null)
    const byScheme=new Map()
    for(const r of records) {
      if(r.invalid||!r.marks.length)continue
      const fingerprint=JSON.stringify([...r.marks].sort((a,b)=>a[0].localeCompare(b[0])))
      if(!byScheme.has(fingerprint))byScheme.set(fingerprint,[])
      byScheme.get(fingerprint).push(r)
    }
    const cohorts=[...byScheme.values()].sort((a,b)=>b.length-a.length)
    if(!cohorts.length)continue
    // No dominant scheme: do not appoint an arbitrary paper as the class norm.
    if(cohorts[1] && cohorts[0].length===cohorts[1].length)continue
    if(records.length>1 && cohorts[0].length<2)continue
    const comparable=cohorts[0].sort((a,b)=>b.obtained-a.obtained)
    let competitionRank=1
    comparable.forEach((item,index)=>{
      if(index && item.obtained<comparable[index-1].obtained)competitionRank=index+1
      rankMap.set(item.id,ordinal(competitionRank))
    })
  }
  return rankMap
}
