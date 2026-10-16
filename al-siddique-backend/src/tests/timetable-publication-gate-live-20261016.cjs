'use strict'
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path')
const {Client}=require('pg')
const {publicationAssessment}=require('../services/timetablePublicationGate')
const optIn=process.env.ASSPS_DB_INTEGRATION==='1'
if(!optIn){console.log('SKIPPED: set ASSPS_DB_INTEGRATION=1 for authorized read-only school data audit');process.exit(0)}
require('dotenv').config({path:process.env.ASSPS_DB_ENV_PATH||'/var/www/apex-backend/.env'})
;(async()=>{
 const c=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),
  database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000})
 try{
  await c.connect();await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const roster=await c.query("SELECT class,section,COUNT(*)::int n,COUNT(*) FILTER(WHERE parent_user_id IS NOT NULL)::int parent_linked FROM students WHERE school_id=$1 AND is_active=true GROUP BY class,section ORDER BY class,section",[1])
  const entries=await c.query("SELECT class_name,section,period_label,subject,teacher_display_name,teacher_id,source_sha256,academic_session FROM timetable WHERE school_id=$1 AND class_name<>$2 ORDER BY class_name,section,period_label",[1,'School-wide'])
  const report=publicationAssessment({schoolId:1,roster:roster.rows,entries:entries.rows})
  await c.query('ROLLBACK')
  if(!['HOLD_FULL_RELEASE','FULL_RELEASE_READY'].includes(report.decision))throw Error('INVALID_GATE_STATE')
  const outDir='/root/assps-release-backups/timetable-parent-mission-20261016/qa'
  fs.mkdirSync(outDir,{recursive:true,mode:0o700})
  const output=path.join(outDir,'timetable-coverage-live-report-20261016.json')
  const content=JSON.stringify({audited_at:new Date().toISOString(),...report},null,2)+'\n'
  fs.writeFileSync(output,content,{mode:0o600});fs.chmodSync(output,0o600)
  console.log('TIMETABLE_PUBLICATION_GATE_RESULT',report.decision,
   'total',report.total_active_students,'verified',report.fully_verified_subject_timetable_students,
   'pending',report.students_subject_timetable_pending,'unlinked_parents',report.unlinked_parent_students,
   'unlinked_teacher_periods',report.unlinked_teacher_periods,'orphan_groups',report.unmatched_imported_groups.join(','),
   'sha256',crypto.createHash('sha256').update(content).digest('hex'))
  if(report.decision==='FULL_RELEASE_READY'&&report.reasons.length)throw Error('CONTRADICTORY_FULL_RELEASE')
 }catch(e){console.error('READ_ONLY_PUBLICATION_GATE_FAILED',e.code||'',e.message);process.exitCode=1;await c.query('ROLLBACK').catch(()=>{})}
 finally{await c.end().catch(()=>{})}
})()
