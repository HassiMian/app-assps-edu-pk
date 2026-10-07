import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {buildCanonicalDocxModel,canonicalDocxModelText} from '../export/canonicalDocxModel.js'
const here=path.dirname(fileURLToPath(import.meta.url))
const corpusPath=path.resolve(here,'../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const raw=JSON.parse(fs.readFileSync(corpusPath,'utf8'))
const corpus=Array.isArray(raw)?raw:(raw.papers||raw.documents||[])
const expectedTypes=new Set(['short_question','mcq','fill_blank','long_question','grammar_table','translation','true_false','letter','essay','section_banner','matching_columns','application','scope_header','vertical_math','definition'])

test('G20 canonical DOCX model covers every node in all 43 canonical papers without dropping identity',()=>{
 assert.equal(corpus.length,43)
 const seen=new Set();let nodeCount=0
 for(const doc of corpus){
  const model=buildCanonicalDocxModel(doc)
  assert.equal(model.sourceDocumentId,doc.id)
  assert.ok(['ltr','rtl'].includes(model.direction))
  const projectedIds=model.blocks.filter(b=>b.nodeId).map(b=>b.nodeId)
  for(const section of doc.sections||[])for(const node of section.nodes||[]){nodeCount++;seen.add(node.type);assert.ok(projectedIds.includes(node.id),`${doc.id}: missing ${node.type} ${node.id}`)}
  assert.ok(canonicalDocxModelText(model).trim().length>0,`${doc.id}: empty export text`)
 }
 assert.ok(nodeCount>900)
 assert.deepEqual([...seen].sort(),[...expectedTypes].sort())
 console.log(`G20_DOCX_MODEL_CORPUS 43/43 PASS nodes=${nodeCount} types=${seen.size}`)
})

test('G20 preserves structured table/math and RTL semantics in export model',()=>{
 let rtl=0,tables=0,math=0
 for(const doc of corpus){const model=buildCanonicalDocxModel(doc);for(const b of model.blocks){if(b.direction==='rtl')rtl++;if(b.kind==='table'){tables++;assert.ok(b.columns.length>=2);assert.ok(Array.isArray(b.rows))}if(b.kind==='vertical_math'){math++;assert.ok(b.operands.length>=1);assert.equal(b.direction,'ltr')}}}
 assert.ok(rtl>0);assert.ok(tables>0);assert.ok(math>0)
 console.log(`G20_DOCX_STRUCTURE_PASS rtl=${rtl} tables=${tables} verticalMath=${math}`)
})
