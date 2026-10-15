'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const r=require('../qbank/render-grade910-66-blind-and-key-review-packets-20261015.cjs')
test('two separately verified, reproducible offline faculty review documents cover all 66',()=>{
 const data=r.load()
 assert.equal(data.items.length,66)
 const m=r.write()
 assert.equal(m.candidateCount,66)
 assert.equal(m.blind.answerKeysIncluded,false)
 assert.equal(m.restricted.sourceReferenceKeysIncluded,true)
 assert.equal(m.restricted.schoolFacultyApprovalCount,0)
 assert.equal(m.hasRealSignatures,false)
 assert.equal(m.allowsElectronicApproval,false)
 assert.equal(m.academicallyApproved,false)
 assert.equal(m.published,false)
 assert.equal(r.verify().verified,true)
})
test('BLIND packet contains questions/options but not correct key fields or review approvals',()=>{
 const data=r.load()
 const blind=r.html(data.items,'blind',data.sourceHash)
 assert.equal((blind.match(/class="question"/g)||[]).length,66)
 assert.equal((blind.match(/class="options"/g)||[]).length,66)
 assert.doesNotMatch(blind,/SOURCE REFERENCE ANSWER|proposedCorrectOptionId|Answer Key|KEY CHECK:/)
 assert.doesNotMatch(blind,/<script\b|<iframe\b|<input\b/i)
 assert.match(blind,/NOT SCHOOL-APPROVED/)
 assert.match(blind,/Correct-letter metadata is deliberately not printed/)
 assert.match(blind,/dir="rtl"/)
 assert.match(blind,/Jameel Noori Nastaleeq/)
})
test('restricted packet shows original source SHA / proposal SHA and unverified-key warning',()=>{
 const data=r.load()
 const restricted=r.html(data.items,'restricted',data.sourceHash)
 assert.equal((restricted.match(/class="question"/g)||[]).length,66)
 assert.equal((restricted.match(/SOURCE REFERENCE ANSWER \(UNVERIFIED\)/g)||[]).length,66)
 assert.equal((restricted.match(/Proposal revision SHA-256/g)||[]).length,66)
 assert.match(restricted,/Only genuine institutional review/)
 assert.doesNotMatch(restricted,/<script\b|<iframe\b|<input\b/i)
 assert.equal(data.items.filter(x=>x.proposal.medium==='urdu').length,25)
})
test('HTML metacharacters and injected markup are encoded before rendering',()=>{
 const s=r.esc('<img src="x" onerror=\'boom()\'>&')
 assert.equal(s,'&lt;img src=&quot;x&quot; onerror=&#39;boom()&#39;&gt;&amp;')
 assert.doesNotMatch(s,/<img/)
 const sample=r.load().items[0]
 const payload=JSON.parse(JSON.stringify(sample))
 payload.proposal.originalStem='<script>doBad()</script>'
 const rendered=r.html([payload],'blind','mock')
 assert.doesNotMatch(rendered,/<script>doBad/)
 assert.match(rendered,/&lt;script&gt;doBad/)
})
test('renderer rejects illegal modes and exact bytes are required for verified print packets',()=>{
 const data=r.load()
 assert.throws(()=>r.html(data.items,'injected-mode',data.sourceHash),/UNKNOWN_REVIEW_MODE/)
 const original=fs.readFileSync(r.BLIND)
 try{
  fs.writeFileSync(r.BLIND,Buffer.concat([original,Buffer.from('BAD_CHANGE')]))
  assert.throws(()=>r.verify(),/RENDER_BYTES_CHANGED_blind/)
 }finally{fs.writeFileSync(r.BLIND,original)}
 assert.equal(r.verify().verified,true)
})

test('printable source answer and blind review packets remain in private untracked 0700 directory',()=>{
 const directory=path.dirname(r.BLIND)
 assert.ok(directory.includes('.assps-private-reviews'))
 assert.equal(fs.statSync(directory).mode&0o777,0o700)
 for(const file of [r.BLIND,r.KEY,r.MANIFEST]){
  assert.equal(path.dirname(file),directory)
  assert.equal(fs.statSync(file).mode&0o777,0o600)
  assert.ok(fs.existsSync(file))
 }
})
