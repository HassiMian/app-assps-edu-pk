'use strict'
const express=require('express')
const crypto=require('node:crypto')
const {pool,applyTenantContext}=require('../config/database')
const {protect,adminOnly}=require('../middleware/auth')
const {currentSchoolId}=require('../middleware/tenant')
const router=express.Router()
const {input}=require('../services/feeBatchRules')
const {build}=require('../services/feeBatchPlanner')
async function withTx(req,res,write){
 const school=Number(currentSchoolId(req))
 if(!Number.isSafeInteger(school)||school<=0)return res.status(403).json({success:false,code:'SCHOOL_SCOPE_REQUIRED'})
 let p
 try{p=input(req.body)}catch(e){return res.status(e.status||422).json({success:false,message:e.message})}
 let c,opened=false
 try{
  c=await pool.connect()
  await c.query(write?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');opened=true
  await applyTenantContext(c)
  const check=(await c.query("SELECT current_setting('app.tenant_id',true) AS tenant,row_security_active('public.fee_challans'::regclass) AS rls")).rows[0]
  if(check.tenant!==String(school)||check.rls!==true)throw Object.assign(new Error('School tenant isolation not enabled'),{status:503})
  const plan=await build(c,school,p)
  if(!write){
   await c.query('ROLLBACK');opened=false
   return res.json({success:true,scope:p.scope,month:p.month,year:p.year,summary:plan.summary,fingerprint:plan.fingerprint,students:plan.items})
  }
  if(req.body?.fingerprint!==plan.fingerprint){await c.query('ROLLBACK');opened=false;return res.status(409).json({success:false,code:'PREVIEW_STALE',message:'Fee balances or selections changed. Preview again before creating vouchers.'})}
  const ready=plan.items.filter(s=>s.status==='ready')
  if(!ready.length){await c.query('ROLLBACK');opened=false;return res.json({success:true,created:0,summary:plan.summary,students:[]})}
  const actor=Number(req.user?.id)
  if(!Number.isSafeInteger(actor)||actor<1)throw Object.assign(new Error('Authenticated fee creator required'),{status:403})
  const records=ready.map(s=>({...s,challan_no:'CH-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(5).toString('hex').toUpperCase()}))
  const saved=await c.query("INSERT INTO fee_challans(school_id,challan_no,student_id,month,year,amount,paid_amount,discount,status,due_date,created_by,payment_note,monthly_fee,previous_arrears,gross_total,remaining_balance,paper_fund,exam_fee,other_fee,discount_package_id,discount_label,fee_source,migration_batch) "
   +"SELECT $1,x.challan_no,x.student_id,$2,$3,x.total,0,x.discount,'unpaid',$4,$5,'Bulk '+$6+' | latest prior balance once | no payments collected',x.monthly_fee,x.arrears,x.total,x.total,x.paper_fund,x.exam_fee,x.other_fee,x.discount_package_id,x.discount_label,'school_authenticated_batch','ASSPS_FEE_BATCH_V3' "
   +"FROM jsonb_to_recordset($7::jsonb) AS x(challan_no text,student_id int,total numeric,discount numeric,monthly_fee numeric,arrears numeric,paper_fund numeric,exam_fee numeric,other_fee numeric,discount_package_id int,discount_label text) "
   +"ON CONFLICT DO NOTHING RETURNING id,student_id,amount,challan_no",
   [school,p.month,p.year,p.dueDate,actor,p.scope,JSON.stringify(records)])
  if(saved.rowCount!==ready.length)throw Object.assign(new Error('Concurrent duplicate or partial batch detected; all changes rolled back'),{status:409})
  if(money(saved.rows.reduce((n,x)=>n+Number(x.amount),0))!==plan.summary.due_total)throw Error('Batch amount invariant failed')
  await c.query('COMMIT');opened=false
  return res.status(201).json({success:true,created:saved.rowCount,summary:plan.summary,students:saved.rows})
 }catch(e){
  if(opened&&c)await c.query('ROLLBACK').catch(()=>{})
  console.error('Fee batch blocked',e.code||'VALIDATION',e.message)
  return res.status(e.status||503).json({success:false,code:'BATCH_SAFE_ABORT',message:e.status?e.message:'Batch was not created. No partial invoices saved.'})
 }finally{if(c)c.release()}
}
router.post('/preview',protect,adminOnly,(req,res)=>withTx(req,res,false))
router.post('/generate',protect,adminOnly,(req,res)=>withTx(req,res,true))
module.exports=router
