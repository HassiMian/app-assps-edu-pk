'use strict'
// ASSPS School 1 only: Class Eight First Term is final; no Second Term.
// Historical First Term documents and all peer-school policies are untouched.
const isEight=value=>{
  const text=String(value??'').trim().toLowerCase()
    .replace(/[-_.]/g,' ').replace(/\s+/g,' ').replace(/^(class|grade)\s+/,'')
  return new Set(['8','08','8th','eight','viii']).has(text.split(' ')[0])
}
// Accept equivalent human-entered term labels; do not weaken the school boundary.
const isSecondTermLabel=value=>{
  const text=String(value??'').trim().toLowerCase()
    .replace(/[_.\u2010-\u2015-]/g,' ').replace(/\s+/g,' ')
  // Include source-derived labels such as "2026–27 / Second Term" without
  // matching a bare year or an unrelated First Term label.
  return text==='second'||
    /(?:^|[\s|/:·()[\]])(?:second|2nd|2|ii)\s+(?:term|semester)(?=$|[\s|/:·()[\]])/.test(text)||
    /(?:^|[\s|/:·()[\]])(?:term|semester)\s+(?:second|2nd|two|2|ii)(?=$|[\s|/:·()[\]])/.test(text)
}
function violatesAsspsSecondTermPolicy(schoolId,entry={}){
  if(Number(schoolId)!==1)return false
  const body=entry&&typeof entry==='object'?entry:{}
  const payload=body.payload&&typeof body.payload==='object'?body.payload:{}
  const nested=payload.plannerDocument&&typeof payload.plannerDocument==='object'
    ?payload.plannerDocument:{}
  const direct=body.plannerDocument&&typeof body.plannerDocument==='object'
    ?body.plannerDocument:{}
  // Serialized planner writes contain both outer metadata and a nested copy.
  // Checking just the first truthy class/term permits forged mismatches, e.g.
  // class Seven/First Term outside but Eight/Second Term inside. Fail closed
  // when ANY submitted class scope is Eight and ANY submitted term is Second.
  const scopes=[body,payload,nested,direct]
  const gradeEight=scopes.some(x=>[x.classLevel,x.class_level,x.klass,x.grade].some(isEight))
  const termSecond=scopes.some(x=>
    [x.termLabel,x.term,x.sessionTerm,x.session_term,x.term_name].some(isSecondTermLabel)||
    String(x.provenance?.sourceArchiveScope||'').trim().toUpperCase()==='SECOND_TERM_ONLY'||
    [x.provenance?.termKey,x.termKey].some(value=>
      String(value??'').split('|').some(isSecondTermLabel)))
  return gradeEight&&termSecond
}
module.exports={violatesAsspsSecondTermPolicy,isSecondTermLabel}
