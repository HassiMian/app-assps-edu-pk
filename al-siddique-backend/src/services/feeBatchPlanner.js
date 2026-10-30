'use strict'
const crypto=require('node:crypto')
const {monthCase,money,normalized,profileMonthly,chooseDiscount}=require('./feeBatchRules')
async function build(c,school,p){
 const sessionResult=await c.query('SELECT academic_setup FROM settings WHERE school_id=$1',[school])
 const setup=sessionResult.rows[0]?.academic_setup||{}
 const start=String(setup.sessionStart||'').slice(0,4),end=String(setup.sessionEnd||'').slice(0,4)
 const settings=await c.query('SELECT class_name,monthly_fee,session FROM fee_class_settings WHERE school_id=$1 AND active=true ORDER BY id DESC',[school])
 const activeSessions=[...new Set(settings.rows.map(x=>x.session).filter(Boolean))]
 const setupSession=/^\d{4}$/.test(start)&&/^\d{4}$/.test(end)?start+'-'+end:''
 const session=setupSession|| (activeSessions.length===1?activeSessions[0]:'')
 if(!session||!activeSessions.includes(session))throw Object.assign(new Error('School fee session is missing or ambiguous. Configure a single current fee session.'),{status:409})
 const classRates=new Map()
 for(const s of settings.rows){if(s.session===session&&!classRates.has(s.class_name))classRates.set(s.class_name,Number(s.monthly_fee))}
 const priorMonth=monthCase.replaceAll('f.month','old.month')
 const sql="SELECT s.id,s.name,s.father_name,s.gr_number,s.class,s.section,pf.monthly_fee AS profile_fee, "
  +"old.id AS prior_id,old.remaining_balance AS prior_balance,old.monthly_fee AS prior_monthly,nowfee.id AS existing_id "
  +"FROM students s LEFT JOIN student_fee_profiles pf ON pf.student_id=s.id AND pf.school_id=s.school_id "
  +"LEFT JOIN LATERAL(SELECT old.id,old.remaining_balance,old.monthly_fee FROM fee_challans old "
  +"WHERE old.school_id=s.school_id AND old.student_id=s.id AND (old.year<$3 OR (old.year=$3 AND "+priorMonth+"<$4)) "
  +"ORDER BY old.year DESC,"+priorMonth+" DESC,old.id DESC LIMIT 1) old ON true "
  +"LEFT JOIN LATERAL(SELECT f.id FROM fee_challans f WHERE f.school_id=s.school_id AND f.student_id=s.id "
  +"AND f.year=$3 AND lower(trim(f.month))=lower($5) LIMIT 1) nowfee ON true "
  +"WHERE s.school_id=$1 AND s.is_active=true AND ($2::text IS NULL OR s.class=$2) AND ($6::int IS NULL OR s.id=$6) ORDER BY s.class,s.id"
 const rows=(await c.query(sql,[school,p.scope==='class'?p.className:null,p.year,p.monthNum,p.month,p.scope==='student'?p.studentId:null])).rows
 const all=(await c.query("SELECT lower(trim(father_name)) AS father_name,count(*)::int n FROM students WHERE school_id=$1 AND is_active=true AND father_name IS NOT NULL AND length(trim(father_name))>1 GROUP BY lower(trim(father_name))",[school])).rows
 const siblings=new Map()
 for(const r of all){const k=normalized(r.father_name);siblings.set(k,Math.max(siblings.get(k)||0,Number(r.n)))}
 const pkg=(await c.query("SELECT * FROM fee_discount_packages WHERE school_id=$1 AND active=true AND auto_apply=true AND (start_date IS NULL OR start_date<=make_date($2,$3,1)) AND (end_date IS NULL OR end_date>=make_date($2,$3,1)) ORDER BY id",[school,p.year,p.monthNum])).rows
 const dupes=new Map()
 for(const s of rows){const key=s.class+'|'+normalized(s.name)+'|'+normalized(s.father_name);if(normalized(s.father_name))dupes.set(key,(dupes.get(key)||0)+1)}
 const historicHold=(process.env.ASSPS_202611_UNRECONCILED_IDS||'').split(',').map(Number).filter(Number.isInteger)
 const holdGr=String(process.env.ASSPS_202611_PRENINE_HOLD_GR||'')
 const items=rows.map(s=>{
  const rate=profileMonthly(s.profile_fee,profileMonthly(s.prior_monthly,classRates.get(s.class)))
  const arrears=Math.max(0,money(s.prior_balance||0))
  const d=chooseDiscount(s,pkg,siblings.get(normalized(s.father_name))||1,session,rate)
  const extra=money(p.extra.exam_fee+p.extra.paper_fund+p.extra.other_fee)
  const payable=money(rate+arrears+extra-d.amount)
  let hold=''
  if(s.existing_id)hold='ALREADY_GENERATED'
  else if(school===1&&holdGr&&s.gr_number===holdGr&&s.class!=='Pre Nine')hold='PRE_NINE_CORRECTION_REQUIRED'
  else if(school===1&&historicHold.includes(Number(s.id)))hold='HISTORICAL_RECONCILIATION_REQUIRED'
  else if(school===1&&p.year===2026&&p.month==='November'&&!holdGr)hold='HOLD_CONFIG_MISSING'
  else if(s.class==='Eight'&&p.year===2026&&p.month==='November')hold='PRE_NINE_PROMOTION_REQUIRED'
  else if(!rate||!Number.isFinite(payable)||payable<=0)hold='MISSING_MONTHLY_FEE'
  else if(dupes.get(s.class+'|'+normalized(s.name)+'|'+normalized(s.father_name))>1)hold='DUPLICATE_STUDENT_IDENTITY'
  return {student_id:Number(s.id),name:s.name,gr_number:s.gr_number,class:s.class,section:s.section,monthly_fee:rate,arrears,discount:d.amount,discount_package_id:d.packageId,discount_label:d.label,exam_fee:p.extra.exam_fee,paper_fund:p.extra.paper_fund,other_fee:p.extra.other_fee,total:payable,status:hold?(hold==='ALREADY_GENERATED'?'existing':'held'):'ready',reason:hold}
 })
 const summary={eligible:items.length,ready:items.filter(x=>x.status==='ready').length,existing:items.filter(x=>x.status==='existing').length,held:items.filter(x=>x.status==='held').length,monthly:money(items.filter(x=>x.status==='ready').reduce((n,x)=>n+x.monthly_fee,0)),arrears:money(items.filter(x=>x.status==='ready').reduce((n,x)=>n+x.arrears,0)),due_total:money(items.filter(x=>x.status==='ready').reduce((n,x)=>n+x.total,0))}
 const fingerprint=crypto.createHash('sha256').update(JSON.stringify({school,p,items})).digest('hex')
 return {p,items,summary,fingerprint}
}

module.exports={build}
