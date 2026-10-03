const MODES=new Set(['LATIN_TERM_RETAINED','TEXTBOOK_URDU_TRANSLITERATION','TEXTBOOK_URDU_EQUIVALENT','TEXTBOOK_MIXED_FORM'])
const HASH=/^[a-f0-9]{64}$/i
const text=x=>typeof x==='string'&&x.trim().length>0
export function validateTextbookTermEvidence(term){
 const errors=[]
 if(!term||typeof term!=='object')return {valid:false,errors:['term evidence object required']}
 if(!text(term.conceptId)||!text(term.englishTerm))errors.push('concept identity and English term required')
 if(!text(term.verifiedTextbookForm))errors.push('exact verified textbook form required')
 if(!MODES.has(term.renderingMode))errors.push('textbook rendering mode required')
 const e=term.evidence
 if(!e||!text(e.catalogRecordId)||!HASH.test(e.pdfSha256||'')||!Number.isInteger(e.physicalPage)||e.physicalPage<1||!text(e.anchor))
  errors.push('exact official textbook catalog/hash/page/anchor evidence required')
 if(e?.reviewStatus!=='VISUALLY_VERIFIED')errors.push('term evidence must be visually verified')
 if(term.dictionaryGenerated===true||term.inventedPureUrdu===true)errors.push('dictionary or invented pure-Urdu translation prohibited')
 return {valid:errors.length===0,errors}
}
export function validateUrduQuestionTerminology({stemUr,containsTechnicalVocabulary,technicalTerms}={}){
 const errors=[]
 if(!text(stemUr))errors.push('Urdu question stem required')
 if(!Array.isArray(technicalTerms))errors.push('technicalTerms array required')
 if(containsTechnicalVocabulary===true&&Array.isArray(technicalTerms)&&technicalTerms.length===0)
  errors.push('technical vocabulary cannot be released without textbook term evidence')
 for(const term of technicalTerms||[]){
  const checked=validateTextbookTermEvidence(term);errors.push(...checked.errors.map(x=>term?.conceptId+': '+x))
  if(text(stemUr)&&text(term?.verifiedTextbookForm)&&!stemUr.includes(term.verifiedTextbookForm))
   errors.push(term.conceptId+': question does not use exact verified textbook form')
 }
 return {valid:errors.length===0,errors}
}
