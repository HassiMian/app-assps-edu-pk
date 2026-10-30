'use strict'
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
const monthCase="CASE lower(trim(f.month)) WHEN 'january' THEN 1 WHEN 'february' THEN 2 WHEN 'march' THEN 3 WHEN 'april' THEN 4 WHEN 'may' THEN 5 WHEN 'june' THEN 6 WHEN 'july' THEN 7 WHEN 'august' THEN 8 WHEN 'september' THEN 9 WHEN 'october' THEN 10 WHEN 'november' THEN 11 WHEN 'december' THEN 12 ELSE 0 END"
const money=n=>Math.round(Number(n)*100)/100
function input(body){
 const scope=['all','class','student'].includes(body?.scope)?body.scope:null
 const className=scope==='class'?String(body?.class_name||'').trim():''
 const studentId=scope==='student'?Number(body?.student_id):null
 const month=String(body?.month||'').trim()
 const year=Number(body?.year)
 const fees=body?.fees||{}
 const extra={}
 for(const key of ['exam_fee','paper_fund','other_fee']){
  const text=String(fees[key]??0)
  if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Object.assign(new Error('Invalid '+key),{status:422})
  extra[key]=money(text)
  if(extra[key]>50000)throw Object.assign(new Error(key+' exceeds maximum; review manually'),{status:422})
 }
 if(!scope||(scope==='class'&&!className)||(scope==='student'&&(!Number.isSafeInteger(studentId)||studentId<1))||!MONTHS.includes(month)||!Number.isInteger(year)||year<2025||year>2032)throw Object.assign(new Error('Select a valid scope, class and billing month/year'),{status:422})
 const due=String(body?.due_date||'').trim()
 if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Object.assign(new Error('Due date format must be YYYY-MM-DD'),{status:422})
 const defaultDue=year+'-'+String(MONTHS.indexOf(month)+1).padStart(2,'0')+'-10'
 return {scope,className,studentId,month,year,monthNum:MONTHS.indexOf(month)+1,dueDate:due||defaultDue,extra}
}
function normalized(x){return String(x||'').trim().toLowerCase().replace(/\s+/g,' ')}
function profileMonthly(profile,classFee){const p=Number(profile||0);return p>0?p:Number(classFee||0)}
function chooseDiscount(student,pkgs,siblings,session,base){
 for(const p of pkgs){
  const classes=Array.isArray(p.applicable_classes)?p.applicable_classes:[]
  const sessions=Array.isArray(p.applicable_sessions)?p.applicable_sessions:[]
  if(classes.length&&!classes.includes(student.class))continue
  if(sessions.length&&!sessions.includes(session))continue
  if(siblings<Number(p.min_sibling_count||1))continue
  const amount=p.discount_type==='fixed'?Number(p.discount_value):money(base*Number(p.discount_value)/100)
  return {amount:Math.max(0,Math.min(base,money(amount))),packageId:Number(p.id),label:p.name}
 }
 return {amount:0,packageId:null,label:null}
}

module.exports={MONTHS,monthCase,money,input,normalized,profileMonthly,chooseDiscount}
