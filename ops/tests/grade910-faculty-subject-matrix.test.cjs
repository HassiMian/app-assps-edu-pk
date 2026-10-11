'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {summarize,markdown,OUT}=require('../qbank/report-grade910-faculty-subject-matrix.cjs')
test('all 2581 SHA-frozen research candidates are grouped without approval claims',()=>{
 const rows=summarize()
 assert.equal(rows.length,40)
 assert.equal(rows.reduce((n,x)=>n+x.candidates,0),2581)
 assert.equal(rows.reduce((n,x)=>n+x.mcq,0),875)
 assert.equal(rows.reduce((n,x)=>n+x.originalPageClaimMissing,0),1188)
 assert.equal(rows.reduce((n,x)=>n+x.languageClaimMissing,0),50)
 assert.equal(rows.reduce((n,x)=>n+x.unresolvedOverlapIds,0),6)
})
test('committed matrix is deterministic and carries visible research-only HOLD language',()=>{
 assert.equal(fs.readFileSync(OUT,'utf8'),markdown())
 assert.match(markdown(),/NOT the school-offered subject list/)
 assert.match(markdown(),/Publication: \*\*DENY\*\*/)
})
