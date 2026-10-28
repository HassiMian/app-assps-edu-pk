// October 27, 2026 academic directive (ASSPS): Class Eight completes school year
// with its six-month FIRST TERM final; pupils were promoted to Pre-Nine.
// The current Second Term review/printing batch stops at Class Seven.
// This policy never deletes historical Class Eight data or changes Pre-Nine.
export const CURRENT_SECOND_TERM_BATCH=Object.freeze([
  'Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven'
])
const normalized=value=>String(value??'').trim().toLowerCase()
  .replace(/[_.-]/g,' ').replace(/\s+/g,' ').replace(/^(?:class|grade)\s+/, '')
const eighthLabels=new Set(['8','08','8th','eight','viii'])
export const isEighthClass=value=>{
  const valueText=normalized(value)
  return eighthLabels.has(valueText.split(' ')[0])
}
export const inCurrentSecondTermBatch=value=>{
  const canon=normalized(value).replace(/\s/g,'')
  return CURRENT_SECOND_TERM_BATCH.some(level=>level.toLowerCase()===canon)
}
export const isSecondTermLabel=value=>{
  const text=String(value??'').trim().toLowerCase()
    .replace(/[_.\u2010-\u2015-]/g,' ').replace(/\s+/g,' ')
  // Include source-derived labels such as "2026–27 / Second Term" without
  // matching a bare year or an unrelated First Term label.
  return text==='second'||
    /(?:^|[\s|/:·()[\]])(?:second|2nd|2|ii)\s+(?:term|semester)(?=$|[\s|/:·()[\]])/.test(text)||
    /(?:^|[\s|/:·()[\]])(?:term|semester)\s+(?:second|2nd|two|2|ii)(?=$|[\s|/:·()[\]])/.test(text)
}
// Explicit term fields may carry numeric or ordinal codes; never infer these
// from unrelated page/section numbers in source provenance.
const isSecondTermField=value=>isSecondTermLabel(value)||
  /^(?:0?2|2nd|ii|two)$/i.test(String(value??'').trim())
export function assertSecondTermAcademicPolicy(klass,term='Second Term',schoolId=null){
  // Never enforce ASSPS-specific school calendar against another tenant.
  if (Number(schoolId)!==1)return true
  if (isSecondTermField(term)&&isEighthClass(klass))
    throw Error('ASSPS academic policy: Class Eight has NO Second Term; its six-month First Term is final and students have been promoted to Pre-Nine.')
  return true
}
