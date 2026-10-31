'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
const code=fs.readFileSync('/var/www/assps-releases/promotion-auth-v2-20261030/assets/SavedPapersTab-ASSPS-UNIFIED-RECOVERY-v5-20261031.js','utf8')
function harness(accept=true){
 const tag='const exportVaultSource=async item=>'
 const a=code.indexOf(tag),b=code.indexOf('},loadVaultCopy=async item=>',a)
 assert.ok(a>=0&&b>a)
 const expression='async item=>'+code.slice(a+tag.length,b+1)
 const output={requests:[],downloads:[],messages:[]}
 const ctx={
   vaultOpening:'',setVaultOpening:m=>output.opening=m,setVaultError:m=>output.messages.push(m),
   i:{get:async(path)=>{output.requests.push(path);return {data:{
     success:accept,data:{id:'19',revision:4,document:{name:'Original source',config:{className:'Seven'},sections:[],unknown:{preserve:true}}}
   }}}},
   String,Array,Number,JSON,Date,Blob,encodeURIComponent,setTimeout:fn=>fn(),
   URL:{createObjectURL:b=>{output.blob=b;return 'blob:synthetic'},revokeObjectURL:()=>{}},
   document:{body:{appendChild:el=>output.downloads.push(el)},createElement:()=>({href:'',download:'',click(){output.clicked=true},remove(){}})}
 }
 return {fn:vm.runInNewContext('('+expression+')',ctx),output,expression}
}
test('authenticated original Vault JSON exports incomplete historical document losslessly',async()=>{
 const {fn,output}=harness()
 await fn({id:19,name:'Original source',revision:4})
 assert.deepEqual(output.requests,['/api/portal/paper-studio/papers/19'])
 assert.equal(output.clicked,true)
 const payload=JSON.parse(await output.blob.text())
 assert.equal(payload.kind,'ASSPS_PAPER_VAULT_SOURCE_RECOVERY')
 assert.equal(payload.sourceRevision,4)
 assert.deepEqual(JSON.stringify(payload.sourceDocument.sections),'[]')
 assert.equal(payload.sourceDocument.unknown.preserve,true)
 assert.equal(payload.releaseStatus,'UNMODIFIED_READ_ONLY_SOURCE_NOT_APPROVED')
 assert.match(output.downloads[0].download,/Original_CONFIDENTIAL\.json/)
})
test('server denial never creates recovered output',async()=>{
 const {fn,output}=harness(false)
 await fn({id:19,name:'Original source'})
 assert.equal(output.downloads.length,0)
 assert.match(output.messages.at(-1),/Authenticated Vault source unavailable/)
})
test('download cannot modify, approve or save a school paper',()=>{
 const {expression}=harness()
 assert.match(expression,/i\.get\(/)
 assert.doesNotMatch(expression,/i\.(post|put|patch|delete)\(/)
 assert.match(code,/onClick:\(\)=>void exportVaultSource\(item\)/)
})
