'use strict'
// Source-derived IDs and direction ONLY: never export question text or student data.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const CORPUS = path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
function generate(source=CORPUS){
  const bytes=fs.readFileSync(source)
  const docs=JSON.parse(bytes).documents
  assert.ok(Array.isArray(docs) && docs.length===43,'CANONICAL_43_REQUIRED')
  const ids=new Set()
  const cases=docs.map(doc=>{
    const id=doc.id
    assert.match(id,/^doc__official-first-term-2026-class-[a-z0-9-]+$/)
    assert.ok(!ids.has(id),'DUPLICATE_CANONICAL_ID')
    ids.add(id)
    const language=String(doc.metadata?.language||doc.presentation?.language||'').toLowerCase()
    assert.ok(['urdu','english'].includes(language),'UNKNOWN_PAPER_LANGUAGE')
    const rtl=language==='urdu'
    return {id,dir:rtl?'rtl':'ltr',family:rtl?'Jameel':'Times New Roman'}
  })
  assert.equal(cases.filter(x=>x.dir==='rtl').length,17,'CANONICAL_RTL_17_REQUIRED')
  assert.equal(cases.filter(x=>x.dir==='ltr').length,26,'CANONICAL_LTR_26_REQUIRED')
  return {schema:'ASSPS_CANONICAL_WINDOWS_CASE_MANIFEST_V1',sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),expectedCount:43,cases}
}
if(require.main===module){process.stdout.write(JSON.stringify(generate())+'\n')}
module.exports={generate}
