import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {packCanonicalDocx} from '../export/canonicalDocxExport.js'
const corpusPath=fileURLToPath(new URL('../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json',import.meta.url))
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

test('Paper DOCX Urdu RTL runs explicitly use Jameel Noori Nastaleeq, not silent Noto fallback', async () => {
 const urdu=pick('urdu')
 assert.ok(urdu)
 const xml=xmlOf(await packCanonicalDocx(urdu,{as:'buffer'}))
 // Test the actual zipped Word XML (not a CSS setting or mocked export model).
 assert.match(xml, /<w:rFonts[^>]*w:ascii="Jameel Noori Nastaleeq"/,
   'Real Urdu DOCX is not specifying the canonical Nastaleeq font on text runs')
 assert.doesNotMatch(xml, /Noto Nastaliq Urdu/,
   'Urdu export silently selected the wrong fallback family')
 assert.match(xml, /<w:rtl\s*\/?\s*>/)
 assert.match(xml, /<w:bidi\s*\/?\s*>/)
 const english=xmlOf(await packCanonicalDocx(pick('english'),{as:'buffer'}))
 assert.match(english, /<w:rFonts[^>]*w:ascii="Times New Roman"/)
 assert.doesNotMatch(english, /Jameel Noori Nastaleeq/,
   'The Urdu font leaked into the English-only export')
})

test('Paper DOCX does not turn missing/null section or node marks into fake zero marks', async () => {
 const base=structuredClone(pick('english'))
 base.id='qa-empty-vs-numeric-zero'
 base.sections=[{id:'qa-section',title:'QA MARKS',direction:'ltr',
  authoritativeSectionTotal:null,operationalSectionTotal:null,
  nodes:[{id:'qa-unmarked',type:'short_question',direction:'ltr',
    stemText:'QA unmarked question',authoritativeNodeMarks:null,operationalNodeMarks:null}]
 }]
 const noMarks=xmlOf(await packCanonicalDocx(base,{as:'buffer'}))
 assert.ok(noMarks.includes('QA unmarked question'))
 assert.doesNotMatch(noMarks, /\[0\]/,
   'Missing marks were silently converted into printable zero marks')
 base.sections[0].nodes[0].authoritativeNodeMarks=0
 const realZero=xmlOf(await packCanonicalDocx(base,{as:'buffer'}))
 assert.match(realZero, /\[0\]/, 'An actual numeric zero mark was silently discarded')
 base.sections[0].nodes[0].authoritativeNodeMarks=false
 const falseNotZero=xmlOf(await packCanonicalDocx(base,{as:'buffer'}))
 assert.doesNotMatch(falseNotZero, /\[0\]/, 'Boolean false was incorrectly treated as numeric zero')
 base.sections[0].nodes[0].authoritativeNodeMarks='  '
 const whitespaceNotZero=xmlOf(await packCanonicalDocx(base,{as:'buffer'}))
 assert.doesNotMatch(whitespaceNotZero, /\[0\]/, 'Whitespace-only marks were treated as numeric zero')
})

test('All 43 official canonical papers produce actual A4 DOCX OOXML with RTL font parity', async () => {
 assert.equal(corpus.length,43)
 let urduCount=0,englishCount=0
 for(const paper of corpus){
  const language=paper.metadata?.language
  assert.ok(['urdu','english'].includes(language),paper.id)
  const buf=await packCanonicalDocx(paper,{as:'buffer'})
  assert.equal(buf.subarray(0,2).toString(),'PK',paper.id)
  const xml=xmlOf(buf)
  assert.match(xml,/<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"\s*\/>/,paper.id)
  assert.ok(xml.includes(String(paper.metadata.subjectName||paper.metadata.subject)),paper.id)
  if(language==='urdu'){
   urduCount++
   assert.match(xml,/<w:rFonts[^>]*w:ascii="Jameel Noori Nastaleeq"/,paper.id)
   assert.match(xml,/<w:bidi\s*\/?\s*>/,paper.id)
   assert.doesNotMatch(xml,/Noto Nastaliq Urdu/,paper.id)
  }else{
   englishCount++
   assert.match(xml,/<w:rFonts[^>]*w:ascii="Times New Roman"/,paper.id)
   assert.doesNotMatch(xml,/<w:rFonts[^>]*w:ascii="Jameel Noori Nastaleeq"/,paper.id)
  }
 }
 assert.equal(urduCount,17)
 assert.equal(englishCount,26)
 console.log('ASSPS_CANONICAL_DOCX_A4_FONT_FULL43_PASS Urdu='+urduCount+' English='+englishCount)
})
