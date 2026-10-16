'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {generate}=require('./emit_windows_canonical_manifest_20261016.cjs')
test('exact 43 canonical IDs, with 17 Urdu RTL and 26 English LTR; no contents exported',()=>{
 const m=generate()
 assert.equal(m.cases.length,43)
 assert.equal(m.cases.filter(x=>x.dir==='rtl').length,17)
 assert.equal(m.cases.filter(x=>x.dir==='ltr').length,26)
 assert.equal(new Set(m.cases.map(x=>x.id)).size,43)
 assert.match(m.sourceSha256,/^[a-f0-9]{64}$/)
 assert.ok(!JSON.stringify(m).includes('official_section'))
})
test('missing, duplicate, unsupported language and count drift fail closed',()=>{
 const dirname=fs.mkdtempSync(path.join(os.tmpdir(),'assps-corpus-test-'))
 const filename=path.join(dirname,'data.json')
 try{
  const base=generate().cases.map(x=>({id:x.id,metadata:{language:x.dir==='rtl'?'urdu':'english'}}))
  for(const docs of [
    base.slice(0,-1),
    [...base.slice(0,-1),base[0]],
    base.map((d,i)=>i===0?{...d,metadata:{language:'latin'}}:d)
  ]){
    fs.writeFileSync(filename,JSON.stringify({documents:docs}))
    assert.throws(()=>generate(filename))
  }
 }finally{fs.rmSync(dirname,{recursive:true,force:true})}
})
const {readManifest}=require('./verify_windows_canonical_chrome_cdp_20261016.cjs')
test('Windows runner accepts exact original manifest with correctly derived embedded font checks',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-manifest-'))
 try{
  const name=path.join(dir,'manifest.json');fs.writeFileSync(name,JSON.stringify(generate()))
  const cases=readManifest(name)
  assert.equal(cases.length,43)
  assert.equal(cases[0].dir,'rtl')
  assert.ok(cases[0].pdfFont.test('Jameel#20Noori#20Nastaleeq#20Kasheeda'))
  assert.ok(cases.find(x=>x.dir==='ltr').pdfFont.test('TimesNewRomanPS-Bold'))
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('Windows runner fails closed for tampered count, font, duplicate IDs or symlink',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-manifest-'))
 try{
  const file=path.join(dir,'manifest.json'),m=generate()
  for(const edit of [
    v=>{v.expectedCount=42},
    v=>{v.cases[0].family='Arial'},
    v=>{v.cases[1].id=v.cases[0].id},
    v=>{v.sourceSha256='not-a-digest'}
  ]){
   const copy=JSON.parse(JSON.stringify(m));edit(copy)
   fs.writeFileSync(file,JSON.stringify(copy));assert.throws(()=>readManifest(file))
  }
  const link=path.join(dir,'symlink.json');fs.symlinkSync(file,link)
  assert.throws(()=>readManifest(link))
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
