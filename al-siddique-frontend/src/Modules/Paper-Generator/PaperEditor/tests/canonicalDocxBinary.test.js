import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {packCanonicalDocx} from '../export/canonicalDocxExport.js'
const corpusPath=path.join(process.cwd(),'al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const raw=JSON.parse(fs.readFileSync(corpusPath,'utf8'));const corpus=Array.isArray(raw)?raw:(raw.papers||raw.documents||[])
const pick=lang=>corpus.find(d=>d.metadata?.language===lang)
function xmlOf(buffer){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g20-docx-'));const file=path.join(dir,'paper.docx');fs.writeFileSync(file,buffer);try{return execFileSync('unzip',['-p',file,'word/document.xml'],{encoding:'utf8',maxBuffer:20*1024*1024})}finally{fs.rmSync(dir,{recursive:true,force:true})}}

test('G20 emits real OOXML DOCX for canonical English and Urdu papers',async()=>{
 for(const lang of ['english','urdu']){const paper=pick(lang);assert.ok(paper);const buf=await packCanonicalDocx(paper,{as:'buffer'});assert.equal(buf.subarray(0,2).toString(),'PK');assert.ok(buf.length>5000);const xml=xmlOf(buf);assert.match(xml,/<w:document/);assert.match(xml,/<w:tbl/);assert.ok(xml.includes(String(paper.metadata.subjectName||paper.metadata.subject)));if(lang==='urdu')assert.match(xml,/<w:bidi\/?/)}
 console.log('G20_DOCX_BINARY English+Urdu PASS')
})

test('G20 bilingual fixture emits both LTR and RTL text without dropping either script',async()=>{
 const base=structuredClone(pick('english'));base.id='g20-dual-fixture';base.metadata={...base.metadata,language:'dual',direction:'ltr',title:'Dual Fixture'};base.sections=[{id:'dual-s1',direction:'ltr',title:'Bilingual',authoritativeSectionTotal:2,nodes:[{id:'dual-en',type:'short_question',direction:'ltr',stemText:'Explain photosynthesis.',authoritativeNodeMarks:1},{id:'dual-ur',type:'short_question',direction:'rtl',stemText:'ضیائی تالیف کی وضاحت کریں۔',authoritativeNodeMarks:1}]}];const buf=await packCanonicalDocx(base,{as:'buffer'});const xml=xmlOf(buf);assert.ok(xml.includes('Explain photosynthesis.'));assert.ok(xml.includes('ضیائی تالیف کی وضاحت کریں۔'));assert.match(xml,/<w:bidi\/?/);console.log('G20_DOCX_BINARY Dual PASS')
})

test('G20 DOCX preserves math capability and embeds immutable image media',async()=>{
 const base=structuredClone(pick('english'))
 base.id='g20-math-image-fixture'
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='
 base.assets=[{id:'asset-g20-image-1',kind:'image',storage:'embedded',mimeType:'image/png',sha256:'a'.repeat(64),byteLength:Buffer.from(png,'base64').length,widthPx:120,heightPx:80,altText:'G20 immutable diagram',description:'Math image parity fixture',contentDataUrl:`data:image/png;base64,${png}`}]
 const nodes=base.sections.flatMap(s=>s.nodes||[])
 assert.ok(nodes.length>=2)
 nodes[0].math={format:'latex',source:'a^2 + b^2 = c^2',display:'block'}
 nodes[1].assetRefs=['asset-g20-image-1']
 const buf=await packCanonicalDocx(base,{as:'buffer'})
 assert.equal(buf.subarray(0,2).toString(),'PK')
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g20-cap-docx-'));const file=path.join(dir,'paper.docx');fs.writeFileSync(file,buf)
 try{
  const xml=execFileSync('unzip',['-p',file,'word/document.xml'],{encoding:'utf8',maxBuffer:20*1024*1024})
  assert.match(xml,/<m:oMath>/)
  assert.ok(xml.includes('a^2 + b^2 = c^2'))
  assert.ok(xml.includes('G20 immutable diagram'))
  const entries=execFileSync('unzip',['-Z1',file],{encoding:'utf8'}).trim().split(/\r?\n/)
  const media=entries.find(name=>name.startsWith('word/media/')&&!name.endsWith('/'))
  assert.ok(media,'DOCX must include an embedded media file')
  const mediaBytes=execFileSync('unzip',['-p',file,media],{encoding:'buffer',maxBuffer:20*1024*1024})
  assert.deepEqual(mediaBytes,Buffer.from(png,'base64'))
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log('G20_DOCX_MATH_IMAGE PASS')
})
