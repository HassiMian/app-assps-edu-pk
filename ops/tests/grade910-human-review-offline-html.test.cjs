'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto')
const m=require('../qbank/render-grade910-private-faculty-review.cjs')
const factory=require('../qbank/build-grade910-blind-faculty-packets.cjs')
const H=x=>crypto.createHash('sha256').update(x).digest('hex')
function stub(kind){
 if(kind==='blind')return {items:[{id:'SYNTH-1',gradeClaim:9,subjectClaim:'biology',
  mediumClaim:'dual',marks:2,originalQuestionRevisionSha256:'a'.repeat(64),
  originalSourceFileSha256:'b'.repeat(64),
  question:{en:{question:'What <script>alert(1)</script> & is "life"?',
    options:[{id:'A',text:'<img src=x onerror=alert(1)>'},{id:'B',text:'correct'},
     {id:'C',text:'wrong'},{id:'D',text:'wrong four'}]},
   ur:{question:'زندگی کیا ہے؟ <b>not HTML</b>',
    options:[{id:'A',text:'زندگی'},{id:'B',text:'آگ'},{id:'C',text:'پانی'},{id:'D',text:'مٹی'}]}}
 }]}
 if(kind==='answer')return {items:[{id:'SYNTH-1',gradeClaim:9,subjectClaim:'biology',mediumClaim:'dual',
  marks:2,originalQuestionRevisionSha256:'a'.repeat(64),
  originalSourceFileSha256:'b'.repeat(64),
  answerTextOriginalCandidateOnly:{en:{question:'What is life?',answerReference:'<script>test</script>'}},
  originalCorrectOptionIdNotIndependentCheck:'B'}]}
 return{items:[{originalQuestionId:'SYNTH-1',gradeClaim:9,subjectClaim:'biology',
  mediumClaim:'dual',marks:2,originalQuestionRevisionSha256:'a'.repeat(64),
  originalSourceFileSha256:'b'.repeat(64)}]}
}
test('script text is escaped and offline HTML embeds no scripts or network dependencies',()=>{
 const h=m.page(stub('blind'),{kind:'blind',batch:'test-synth--batch-001'})
 assert.match(h,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
 assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;/)
 assert.ok(!h.includes('<script'))
 assert.ok(!h.includes('https:'))
 assert.ok(!h.includes('<form'))
 assert.match(h,/default-src &#39;none&#39;/)
 assert.ok(!h.includes('Original answer key'))
 assert.ok(!h.includes('Original answer reference'))
 assert.match(h,/direction:rtl/)
 assert.match(h,/@page\{size:A4/)
 assert.match(h,/Jameel Noori Nastaleeq/)
})
test('original research answer key is only present in distinctly marked reference file',()=>{
 const h=m.page(stub('answer'),{kind:'answer',batch:'test-synth--batch-001'})
 assert.match(h,/Original answer key \(unverified\): B/)
 assert.match(h,/&lt;script&gt;test&lt;\/script&gt;/)
 assert.match(h,/NOT independently verified/)
 assert.ok(!h.includes('<script'))
})
test('blank teacher decisions are distinct from academic approval or authenticated school signoff',()=>{
 const html=m.page(stub('decisions'),{kind:'decisions',batch:'test-synth--batch-001'})
 assert.match(html,/Final reviewed QUESTION revision SHA/)
 assert.match(html,/School academic approver/)
 assert.match(html,/0 VERIFIED APPROVALS/)
 assert.ok(!html.includes('correctOptionId'))
})
test('complete private source 2580-ID archive can generate, then verify, private offline printable versions',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grade910-html-private-'))
 fs.chmodSync(dir,0o700)
 try{
  const exported=factory.exportPacks({base:dir,runId:'private-packet-preview-20261012',perPack:20})
  assert.equal(exported.questionCount,2580)
  const result=m.renderAll({base:dir,runId:'private-packet-preview-20261012',
   renderId:'offline-print-preview-20261012'})
  assert.equal(result.printedOriginals,2580)
  assert.equal(result.htmlQuestionSheets,exported.packs*3)
  assert.equal(result.schoolApproved,0)
  const verified=m.verifyRendered({base:dir,runId:'private-packet-preview-20261012',
   renderId:'offline-print-preview-20261012'})
  assert.equal(verified.privateCandidates,2580)
  assert.equal(verified.verifiedHtmlFiles,501)
  assert.equal(verified.academicApproved,0)
  assert.equal(verified.studentPublication,false)
  assert.throws(()=>m.renderAll({base:dir,runId:'private-packet-preview-20261012',
   renderId:'offline-print-preview-20261012'}),/EEXIST/)
  const index=JSON.parse(fs.readFileSync(path.join(result.privateRenderDir,'RENDERED_INDEX.json'),'utf8'))
  const f=path.join(result.privateRenderDir,index.files[0].name)
  fs.appendFileSync(f,'tampered')
  assert.throws(()=>m.verifyRendered({base:dir,runId:'private-packet-preview-20261012',
   renderId:'offline-print-preview-20261012'}),/RENDERED_HTML_TAMPER_OR_NETWORK/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
