'use strict'
const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const http=require('node:http')
const {createRequire}=require('node:module')
const express=require('express')
const backend=path.resolve(__dirname,'..')
const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-public-upload-gate-'))
for(const dir of ['branding','identity','payment-screenshots','private-records']){
 fs.mkdirSync(path.join(root,dir))
}
fs.writeFileSync(path.join(root,'branding','synthetic-logo.png'),'SYNTHETIC_BRANDING_ONLY')
fs.writeFileSync(path.join(root,'identity','synthetic-student.png'),'SYNTHETIC_STUDENT_IDENTITY_PRIVATE')
fs.writeFileSync(path.join(root,'payment-screenshots','synthetic-proof.png'),'SYNTHETIC_BILLING_PROOF_PRIVATE')
fs.writeFileSync(path.join(root,'private-records','synthetic-record.png'),'SYNTHETIC_PRIVATE_RECORD')
fs.symlinkSync(path.join(root,'identity','synthetic-student.png'),path.join(root,'branding','identity-link.png'))
const source=fs.readFileSync(path.join(backend,'server.js'),'utf8')
const start=source.indexOf("app.use(['/uploads/payment-screenshots'")
const end=source.indexOf('// ─── Health Check',start)
assert.ok(start>0 && end>start,'must exercise exact actual server static-route registrations')
const isolatedStaticRoutes=source.slice(start,end)
const app=express()
new Function('app','uploadsDir','express','process','require',isolatedStaticRoutes)(
 app,root,express,process,createRequire(path.join(backend,'server.js'))
)
let server
after(async()=>{
 await new Promise(resolve=>server?.close(()=>resolve())||resolve())
 fs.rmSync(root,{recursive:true,force:true})
})
const fetch=async(uri,method='GET')=>new Promise((resolve,reject)=>{
 const req=http.request({host:'127.0.0.1',port:server.address().port,path:uri,method},res=>{
  const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8'),headers:res.headers}))
 });req.on('error',reject);req.end()
})
test('actual server public upload mounts allow school branding on both URL aliases',{timeout:10000},async()=>{
 server=app.listen(0,'127.0.0.1')
 await new Promise(resolve=>server.once('listening',resolve))
 for(const prefix of ['/uploads','/api/uploads']){
  const r=await fetch(prefix+'/branding/synthetic-logo.png')
  assert.equal(r.status,200,prefix)
  assert.equal(r.body,'SYNTHETIC_BRANDING_ONLY')
  assert.equal(r.headers['x-content-type-options'],'nosniff')
 }
})
test('both server static aliases fail closed on anonymous/private upload directories',{timeout:12000},async()=>{
 for(const prefix of ['/uploads','/api/uploads']){
  for(const resource of ['identity/synthetic-student.png','payment-screenshots/synthetic-proof.png','private-records/synthetic-record.png']){
   const r=await fetch(prefix+'/'+resource)
   assert.equal(r.status,404,prefix+'/'+resource)
   assert.ok(!r.body.includes('SYNTHETIC_'),prefix+'/'+resource)
  }
  const brandedSymlink=await fetch(prefix+'/branding/identity-link.png')
  assert.equal(brandedSymlink.status,404,prefix+'/branding/identity-link.png MUST deny symlink private files')
  assert.ok(!brandedSymlink.body.includes('SYNTHETIC_PRIVATE'))
  const missing=await fetch(prefix+'/nonexistent/file.png')
  assert.equal(missing.status,404)
 }
})
