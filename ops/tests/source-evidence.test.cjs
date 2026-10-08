const test=require('node:test'),assert=require('node:assert/strict')
const {parseSourceTag,index,inspectSourceRecord,summarize}=require('../qbank/verify-source-evidence.cjs')
const biology=index.get('pectaa-catalog-009')
const example={id:'candidate-9',class_level:'9th',subject:'Biology',medium:'English',
 question_type:'mcq',correct_option:'A',source_page_no:null,is_approved:false,is_duplicate:false,
 metadata:{provisional_internal:true,review_state:'provisional_internal',
 source:'PECTAA pectaa-catalog-009 | '+biology.pdfSha256+' | page 5'}}
test('well-formed manifest hash is only catalog provenance, not academic approval',()=>{
 const x=inspectSourceRecord(example)
 assert.equal(x.catalogDigestMatches,true)
 assert.equal(x.complete,false)
 assert.ok(x.flags.includes('QUESTION_NOT_APPROVED'))
 assert.ok(x.flags.includes('QUESTION_SOURCE_PAGE_NOT_VERIFIED'))
 assert.ok(x.flags.includes('EXERCISE_INDEX_NOT_VERIFIED'))
})
test('tampered PDF hash, cross-grade and subject mismatches are fail-closed',()=>{
 for(const mutate of [
  {...example,metadata:{...example.metadata,source:'PECTAA pectaa-catalog-009 | '+'0'.repeat(64)+' | page 5'}},
  {...example,class_level:'10th'},
  {...example,subject:'Chemistry'},
 ]){
  const x=inspectSourceRecord(mutate)
  assert.equal(x.complete,false)
  assert.ok(x.flags.some(f=>f.includes('MISMATCH')))
 }
})
test('unstructured sources do not satisfy evidence gate',()=>{
 assert.equal(parseSourceTag('page 5'),null)
 const x=inspectSourceRecord({...example,metadata:{source:'page 5'}})
 assert.ok(x.flags.includes('NO_STRUCTURED_CATALOG_LINK'))
})
test('suspicious provisional MCQ key bias remains an editorial warning',()=>{
 const rows=Array.from({length:25},(_,i)=>({...example,id:'q-'+i,correct_option:i===24?'C':'A'}))
 const a=summarize(rows)
 assert.equal(a.academicallyReady,0)
 assert.equal(a.inspected,25)
 assert.equal(a.subjects[0].mcqKeys.editorialReviewRequired,true)
 assert.equal(a.subjects[0].catalogHashMatches,25)
})
