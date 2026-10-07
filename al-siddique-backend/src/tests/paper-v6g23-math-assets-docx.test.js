const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const crypto=require('node:crypto')
const {execFileSync}=require('node:child_process')
const {buildCanonicalDocxModel,buildCanonicalDocxBuffer}=require('../services/papers/paperCanonicalDocxProjectionV6G21')
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='
const SHA='a'.repeat(64)
function fixture(){return {id:'g23-math-image',schemaVersion:3,format:'assps-canonical-paper',metadata:{title:'G23 Math Image',className:'7',subjectName:'Mathematics',language:'english',direction:'ltr'},authority:{authoritativePaperTotal:4,storedConfiguredTotal:4},assets:[{id:'asset-g23',kind:'image',storage:'embedded',mimeType:'image/png',sha256:SHA,byteLength:68,widthPx:1,heightPx:1,altText:'Triangle diagram',description:'G23 deterministic image',contentDataUrl:PNG}],sections:[{id:'s1',title:'Questions',direction:'ltr',authoritativeSectionTotal:4,nodes:[{id:'q1',type:'short_question',direction:'ltr',stemText:'Solve.',authoritativeNodeMarks:2,math:{format:'latex',source:'x^2 + y^2 = z^2',display:'block'}},{id:'q2',type:'short_question',direction:'ltr',stemText:'Study diagram.',authoritativeNodeMarks:2,assetRefs:['asset-g23']}]}]}}
function inspect(buffer){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g23-docx-'));const file=path.join(dir,'paper.docx');fs.writeFileSync(file,buffer);try{return {xml:execFileSync('unzip',['-p',file,'word/document.xml'],{encoding:'utf8',maxBuffer:20*1024*1024}),rels:execFileSync('unzip',['-p',file,'word/_rels/document.xml.rels'],{encoding:'utf8',maxBuffer:20*1024*1024}),listing:execFileSync('unzip',['-l',file],{encoding:'utf8',maxBuffer:20*1024*1024})}}finally{fs.rmSync(dir,{recursive:true,force:true})}}

test('G23 backend DOCX model preserves math and immutable image identity',()=>{
 const model=buildCanonicalDocxModel(fixture())
 const math=model.blocks.find(b=>b.kind==='math_capability')
 const image=model.blocks.find(b=>b.kind==='image_capability')
 assert.ok(math);assert.equal(math.source,'x^2 + y^2 = z^2');assert.equal(math.format,'latex');assert.equal(math.nodeId,'q1')
 assert.ok(image);assert.equal(image.assetId,'asset-g23');assert.equal(image.sha256,SHA);assert.equal(image.altText,'Triangle diagram');assert.equal(image.nodeId,'q2')
})

test('G23 backend DOCX embeds image bytes, math source and exact byte SHA',async()=>{
 const built=await buildCanonicalDocxBuffer(fixture())
 assert.ok(Buffer.isBuffer(built.buffer));assert.equal(built.buffer.subarray(0,2).toString(),'PK')
 assert.equal(built.docxSha256,crypto.createHash('sha256').update(built.buffer).digest('hex'))
 const {xml,rels,listing}=inspect(built.buffer)
 assert.ok(xml.includes('x^2 + y^2 = z^2'))
 assert.match(xml,/<a:blip[^>]+r:embed=/)
 assert.match(rels,/relationships\/image/)
 assert.match(listing,/word\/media\//)
 assert.match(xml,/Triangle diagram|G23 deterministic image/)
 console.log('G23_DOCX_MATH_IMAGE 2/2 PASS')
})
