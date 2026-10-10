import process from 'node:process'
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
