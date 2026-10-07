import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {buildCanonicalDocxModel,canonicalDocxModelText} from '../export/canonicalDocxModel.js'
import {packCanonicalDocx} from '../export/canonicalDocxExport.js'

const PNG_1PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='
const SHA='a'.repeat(64)
function fixture(){return {
 id:'docx-math-assets-fixture',schemaVersion:3,format:'assps-canonical-paper',
 metadata:{title:'Math & Image DOCX',className:'7',subjectName:'Mathematics',language:'english',direction:'ltr'},
 authority:{authoritativePaperTotal:4,storedConfiguredTotal:4},
 assets:[{id:'asset-img-1',kind:'image',storage:'embedded',mimeType:'image/png',sha256:SHA,byteLength:68,widthPx:1,heightPx:1,altText:'Triangle diagram',description:'Deterministic image fixture',contentDataUrl:PNG_1PX}],
 sections:[{id:'s1',title:'Questions',direction:'ltr',authoritativeSectionTotal:4,nodes:[
  {id:'q1',type:'short_question',direction:'ltr',stemText:'Solve the expression.',authoritativeNodeMarks:2,math:{format:'latex',source:'x^2 + y^2 = z^2',display:'block'}},
  {id:'q2',type:'short_question',direction:'ltr',stemText:'Study the diagram.',authoritativeNodeMarks:2,assetRefs:['asset-img-1']},
 ]}],
}}
function inspect(buffer){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'docx-cap-'));const file=path.join(dir,'paper.docx');fs.writeFileSync(file,buffer);try{return {
 xml:execFileSync('unzip',['-p',file,'word/document.xml'],{encoding:'utf8',maxBuffer:20*1024*1024}),
 rels:execFileSync('unzip',['-p',file,'word/_rels/document.xml.rels'],{encoding:'utf8',maxBuffer:20*1024*1024}),
 listing:execFileSync('unzip',['-l',file],{encoding:'utf8',maxBuffer:20*1024*1024}),
}}finally{fs.rmSync(dir,{recursive:true,force:true})}}

test('Canonical DOCX model preserves orthogonal math and immutable image capability identity',()=>{
 const model=buildCanonicalDocxModel(fixture())
 const math=model.blocks.find(b=>b.kind==='math_capability')
 const image=model.blocks.find(b=>b.kind==='image_capability')
 assert.ok(math);assert.equal(math.nodeId,'q1');assert.equal(math.source,'x^2 + y^2 = z^2');assert.equal(math.format,'latex')
 assert.ok(image);assert.equal(image.nodeId,'q2');assert.equal(image.assetId,'asset-img-1');assert.equal(image.sha256,SHA);assert.equal(image.altText,'Triangle diagram')
 const text=canonicalDocxModelText(model)
 assert.match(text,/x\^2 \+ y\^2 = z\^2/);assert.match(text,/Triangle diagram/)
})

test('Canonical DOCX binary embeds image media and preserves math source',async()=>{
 const buffer=await packCanonicalDocx(fixture(),{as:'buffer'})
 assert.equal(buffer.subarray(0,2).toString(),'PK')
 const {xml,rels,listing}=inspect(buffer)
 assert.ok(xml.includes('x^2 + y^2 = z^2'))
 assert.match(xml,/<a:blip[^>]+r:embed=/)
 assert.match(rels,/relationships\/image/)
 assert.match(listing,/word\/media\//)
 assert.match(xml,/Triangle diagram|Deterministic image fixture/)
 console.log('G20_DOCX_MATH_IMAGE 2/2 PASS')
})
