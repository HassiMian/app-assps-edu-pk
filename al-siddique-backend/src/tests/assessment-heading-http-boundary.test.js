'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const crypto=require('node:crypto')
const http=require('node:http')
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x
const hash=doc=>crypto.createHash('sha256').update(JSON.stringify(stable(doc))).digest('hex')
const authPath=require.resolve('../middleware/auth')
const dbPath=require.resolve('../config/database')
const tenantPath=require.resolve('../middleware/tenant')
let connected=0, paper=null, version=null
const query=async(sql,params=[])=>{
 if(sql.includes('SELECT * FROM assessment_papers')&&sql.includes('FOR UPDATE'))return {rows:paper?[paper]:[],rowCount:paper?1:0}
 if(sql.includes('INSERT INTO assessment_papers')){
  paper={id:77,school_id:910001,public_id:params[1],title:params[2],current_revision:0}
  return {rows:[paper],rowCount:1}
 }
 if(sql.includes('INSERT INTO assessment_paper_revisions')){
  version={document_json:JSON.parse(params[3]),content_hash:params[4],revision_number:params[2]}
  return {rows:[],rowCount:1}
 }
 if(sql.includes('UPDATE assessment_papers')){paper.current_revision=params[3];return {rows:[],rowCount:1}}
 if(sql.includes('LEFT JOIN assessment_paper_revisions')){
  if(!paper||paper.public_id!==params[1])return {rows:[],rowCount:0}
  return {rows:[{public_id:paper.public_id,current_revision:paper.current_revision,document_json:version.document_json,content_hash:version.content_hash}],rowCount:1}
 }
 if(/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)||sql.includes('set_config'))return {rows:[],rowCount:1}
 throw Error('Unexpected synthetic SQL: '+sql.slice(0,180))
}
// Real Express HTTP and production route module, with deliberately synthetic
// authentication and in-memory SQL. This does not certify real JWT or RLS.
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
 pool:{connect:async()=>{connected++;return {query,release(){}}}},query
}}
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
 protect:(req,res,next)=>{if(req.headers.authorization!=='Bearer synthetic-teacher')return res.status(401).json({success:false,message:'Unauthorized'});req.user={id:17,role:'teacher',school_id:910001};next()},
 requireRoles:(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():res.sendStatus(403)
}}
require.cache[tenantPath]={id:tenantPath,filename:tenantPath,loaded:true,exports:{
 currentSchoolId:req=>req.user?.school_id||null,tenantClause:async()=>({})
}}
const router=require('../routes/assessmentStudioRoutes')
const request=(port,method,url,body,token='synthetic-teacher')=>new Promise((resolve,reject)=>{
 const data=body?JSON.stringify(body):''
 const req=http.request({host:'127.0.0.1',port,path:url,method,headers:{
  ...(token?{Authorization:'Bearer '+token}:{}),
  'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{})
 }},res=>{let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(raw)})}catch(e){reject(e)}})})
 req.on('error',reject);if(data)req.write(data);req.end()
})
test('real Express route rejects malformed optional formatting before any SQL; accepts and GETs hash-identical safe revision',{timeout:15000},async()=>{
 const app=express();app.use(express.json());app.use('/api/assessment-studio',router)
 const server=await new Promise(ok=>{const v=app.listen(0,'127.0.0.1',()=>ok(v))})
 const port=server.address().port
 try{
  const doc={format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,documentOrigin:'USER_AUTHORED',sourceIdentity:null,sections:[{
   id:'section-1',heading:'Q1. Explain why clouds form. (5)',operationalSectionTotal:5,
   headingFormatting:{questionSerial:'<b>Q1.</b>',headingInstruction:'<span style="font-weight:bold;text-decoration-line:underline">Explain</span> why clouds form.'}
  }]}
  const base={expectedRevision:0,title:'Synthetic author',document:doc}
  const bad=['<img src="x" onerror="evil()">','<span style="position:absolute">x</span>','<b>open','<span onclick="evil()">x</span>','<svg><script>bad</script></svg>']
  for(const html of bad){
   const response=await request(port,'POST','/api/assessment-studio/papers/safe-paper/revisions',{...base,document:{...doc,sections:[{...doc.sections[0],headingFormatting:{questionSerial:'<b>Q1.</b>',headingInstruction:html}}]}})
   assert.equal(response.status,400,'Must reject '+html)
   assert.match(response.body.message,/headingFormatting/)
  }
  assert.equal(connected,0,'Invalid revisions MUST fail before opening database connection')
  const anon=await request(port,'POST','/api/assessment-studio/papers/safe-paper/revisions',base,null)
  assert.equal(anon.status,401)
  const save=await request(port,'POST','/api/assessment-studio/papers/safe-paper/revisions',base)
  assert.equal(save.status,201,JSON.stringify(save.body));assert.equal(connected,1)
  assert.equal(save.body.data.currentRevision,1)
  assert.equal(save.body.data.contentHash,hash(doc))
  const get=await request(port,'GET','/api/assessment-studio/papers/safe-paper',null)
  assert.equal(get.status,200,JSON.stringify(get.body))
  assert.deepEqual(get.body.data.document_json,doc)
  assert.equal(get.body.data.content_hash,hash(doc))
  const conflict=await request(port,'POST','/api/assessment-studio/papers/safe-paper/revisions',base)
  assert.equal(conflict.status,409)
  assert.equal(conflict.body.currentRevision,1)
  console.log('ASSESSMENT_HEADING_REAL_EXPRESS_HTTP_SYNTHETIC_DB_PASS')
 }finally{await new Promise(ok=>server.close(ok))}
})
