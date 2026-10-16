'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {Client}=require('pg')
const schedule=require('../services/approvedSchoolTimetable')
require('dotenv').config({path:process.env.ASSPS_DB_ENV_PATH || '/var/www/apex-backend/.env'})
const optIn=process.env.ASSPS_DB_INTEGRATION==='1'
test('Exact ASSPS seven-class corpus, 56 source periods and both approved weekday timings', {skip:!optIn},async()=>{
 const c=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000})
 try{
  await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const x=await c.query('SELECT class_name,section,period_label,subject,teacher_display_name,teacher_id,source_sha256 FROM timetable WHERE school_id=$1 AND class_name<>$2 ORDER BY class_name,section,period_label',[schedule.SCHOOL_ID,'School-wide'])
  assert.equal(x.rows.length,56)
  const groups=new Map()
  for(const row of x.rows){
   assert(schedule.SOURCE_SHAS.includes(row.source_sha256?.trim()),'Invalid source fingerprint')
   assert.match(row.period_label,/^Period [1-8]$/)
   const k=schedule.studentGroupKey(row.class_name,row.section)
   if(!groups.has(k))groups.set(k,[])
   groups.get(k).push(row)
  }
  assert.equal(groups.size,7)
  for(const [group,rows] of groups){
   assert.equal(rows.length,8,'Expected exactly 8 periods: '+group)
   assert.equal(new Set(rows.map(x=>x.period_label)).size,8,'No duplicate period: '+group)
   for(const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']){
    const output=schedule.buildChildTimetable({id:0,name:'QA placeholder',class:rows[0].class_name,section:rows[0].section},rows,day)
    assert.equal(output.timetable_status,'complete',group+' '+day)
    assert.equal(output.periods.filter(x=>x.kind==='teaching').length,8)
    assert.equal(output.periods.filter(x=>x.period_verified).length,8)
    const first=rows.find(x=>x.period_label==='Period 1')
    assert.equal(output.class_incharge.name,first.teacher_display_name)
    for(const old of rows){
     const proj=output.periods.find(x=>x.label===old.period_label)
     assert.equal(proj.subject,old.subject)
     assert.equal(proj.teacher,old.teacher_display_name)
     assert.equal(proj.start,schedule.rowsForDay(day).find(x=>x.label===old.period_label).start)
     assert.equal(proj.end,schedule.rowsForDay(day).find(x=>x.label===old.period_label).end)
    }
    if(day==='Friday')assert.equal(output.periods.filter(x=>x.kind==='break').length,0)
    else assert.equal(output.periods.filter(x=>x.kind==='break').length,1)
   }
  }
  const roster=await c.query(`SELECT class,section,count(*)::int AS n FROM students WHERE school_id=1 AND is_active=true GROUP BY 1,2`)
  assert(roster.rows.some(x=>x.class==='Eight'))
  assert(!roster.rows.some(x=>x.class==='Pre-Nine'))
  assert(groups.has('pre-nine|'))
  assert(!groups.has('eight|blue'))
  await c.query('ROLLBACK')
  console.log('READ_ONLY_CORPUS_PASS seven_groups=7 imported_periods=56 weekdays=6 projected_period_checks=336 incharges=7 old_new_times_verified=true eight_pre_nine_not_aliased=true')
 } finally {await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{})}
})
