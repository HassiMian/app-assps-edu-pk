import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')
const script='al-siddique-frontend/scripts/verify-protected-templates.mjs'
const manifest='docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt'
const attest='docs/template-baseline/RESULT_CARD_AMENDMENT_20261022.json'
const original='docs/template-baseline/history/resultCardTemplates.20261005.jsx'
const current='al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx'
const manifestPaths=fs.readFileSync(path.join(repo,manifest),'utf8').trim().split(/\r?\n/).map(line=>line.trim().split(/\s+/).slice(1).join(' '))
function fixture() {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-template-proof-'))
 for(const file of [script,manifest,attest,original,...manifestPaths]) {
  const dest=path.join(dir,file)
  fs.mkdirSync(path.dirname(dest),{recursive:true})
  fs.copyFileSync(path.join(repo,file),dest)
 }
 return dir
}
function run(dir){return spawnSync(process.execPath,[path.join(dir,script)],{encoding:'utf8'})}
test('exact historical source, 19 Oct release hash and unchanged collateral templates pass',()=>{
 const dir=fixture()
 try{const out=run(dir);assert.equal(out.status,0,out.stderr);assert.match(out.stdout,/provenance-pinned amendment/)}
 finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('even a 1-character template edit fails closed',()=>{
 const dir=fixture()
 try{
  fs.appendFileSync(path.join(dir,current),'\n// unauthorized edit')
  assert.notEqual(run(dir).status,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('fake amendment hash or tampered October 5 original cannot bypass approval gate',()=>{
 const dir=fixture()
 try{
  const p=path.join(dir,attest)
  const json=JSON.parse(fs.readFileSync(p,'utf8'))
  json.reconciled_sha256='a'.repeat(64)
  fs.writeFileSync(p,JSON.stringify(json))
  assert.notEqual(run(dir).status,0)
  fs.copyFileSync(path.join(repo,attest),p)
  fs.appendFileSync(path.join(dir,original),'\n')
  assert.notEqual(run(dir).status,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('other protected templates cannot drift under narrowly scoped reconciliation',()=>{
 const dir=fixture()
 try{
  const other=manifestPaths.find(p=>p!==current)
  assert.ok(other)
  fs.appendFileSync(path.join(dir,other),'\n// accidental change')
  assert.notEqual(run(dir).status,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
