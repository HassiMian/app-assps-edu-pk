'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path')
const root=path.resolve(__dirname,'../../../al-siddique-backend/src')
const portalSource=fs.readFileSync(path.join(root,'routes/portalRoutes.js'),'utf8')
const importer=fs.readFileSync(path.join(root,'scripts/importStaffList.js'),'utf8')
const {employeePublicRecord}=require(path.join(root,'services/staffSecurityProjection.js'))
const provisioning=fs.readFileSync(path.join(root,'services/portalAccountService.js'),'utf8')
function construct(){
 const calls=[];let handler=null
 const router={get:(p,...args)=>{if(p==='/dashboard')handler=args.at(-1)},post:()=>{},put:()=>{},patch:()=>{},delete:()=>{}}
 const pool={query:async(sql,params=[])=>{
  calls.push({sql,params})
  if(/\bFROM employees\b/i.test(sql))return {rows:[{id:9,name:'Synthetic',portal_password:'SYNTHETIC_SECRET_NOT_REAL',school_id:1}]}
  return {rows:[],rowCount:0}
 }}
 const dependencies={
  express:{Router:()=>router},
  '../config/database':{pool},
  '../middleware/auth':{protect:(req,res,next)=>next(),requireRoles:()=>((req,res,next)=>next())},
  '../middleware/tenant':{currentSchoolId:()=>1},
  '../services/staffSecurityProjection':{employeePublicRecord},
 }
 const mod={exports:{}}
 vm.runInNewContext(portalSource,{
  require:(id)=>{if(!(id in dependencies))throw new Error('unexpected import '+id);return dependencies[id]},
  module:mod,exports:mod.exports,console,process:{env:{NODE_ENV:'production'}},
  Date,Math,Number,String,Boolean,Array,Object,Set,Promise,JSON,Error
 })
 assert.equal(typeof handler,'function')
 return {handler,calls}
}
async function invoke(handler,role){
 let statusCode=200,body
 const res={status(n){statusCode=n;return this},json(x){body=x;return this},set(){return this}}
 await handler({user:{role,id:33,school_id:1}},res)
 return {statusCode,body}
}
test('review source admin dashboard never exposes staff legacy password',async()=>{
 const {handler,calls}=construct()
 const {statusCode,body}=await invoke(handler,'principal')
 assert.equal(statusCode,200,JSON.stringify(body))
 assert.equal(body.data.employees.length,1)
 assert.equal(body.data.employees[0].portal_password,undefined)
 assert.ok(!JSON.stringify(body).includes('SYNTHETIC_SECRET_NOT_REAL'))
 assert.ok(calls.some(x=>/FROM employees/i.test(x.sql)))
 assert.ok(calls.every(x=>!/SELECT \* FROM employees/i.test(x.sql)))
})
test('parent role never queries employee directory',async()=>{
 const {handler,calls}=construct()
 const {statusCode,body}=await invoke(handler,'parent')
 assert.equal(statusCode,200,JSON.stringify(body))
 assert.equal(body.data.employees.length,0)
 assert.ok(!calls.some(x=>/FROM employees/i.test(x.sql)))
})
test('staff importer cannot write cleartext password to employee record',()=>{
 assert.match(importer,/\$21,NULL,'teacher',\$23::jsonb,true/)
 assert.match(importer,/portal_password = NULL,/)
 assert.match(importer,/bcrypt\.hash\(plainPassword, 10\)/)
})
test('private staff import filesystem controls retained in canonical review source',()=>{
 assert.match(importer,/fs\.mkdirSync\(outDir, \{ recursive: true, mode: 0o700 \}\)/)
 assert.match(importer,/fs\.chmodSync\(outDir, 0o700\)/)
 assert.match(importer,/fs\.chmodSync\(credentialsPath, 0o600\)/)
 assert.equal((importer.match(/fs\.chmodSync\(reportPath, 0o600\)/g)||[]).length,2)
})
test('newly included portal-account service reduces DB password hash exposure',()=>{
 assert.doesNotMatch(provisioning,/SELECT \* FROM users/)
 assert.equal((provisioning.match(/SELECT id, role FROM users/g)||[]).length,2)
 assert.match(provisioning,/PORTAL_USER_UPDATE_CONFLICT/)
})
