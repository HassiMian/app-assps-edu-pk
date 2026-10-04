require('dotenv').config({path:require('path').resolve(__dirname,'../.env')})
const {pool}=require('../config/database')
const {provisionStudentIdentities,ensureTeacherIdentity}=require('../services/portalIdentityService')
const fs=require('fs')
const schoolId=Number(process.argv.find(x=>x.startsWith('--school='))?.split('=')[1]||'1')
const apply=process.argv.includes('--apply')
const normalize=x=>String(x||'').replace(/\D/g,'')
async function main(){
 if(!Number.isInteger(schoolId)||schoolId<1)throw Error('Invalid school')
 const db=await pool.connect()
 const result={schoolId,mode:apply?'COMMIT':'DRY_RUN_ROLLBACK',review_missing_contact:0,review_ambiguous_guardian:0,review_unhandled_error:0,linked_students:0,linked_teachers:0,new_pending_accounts:0,reused_accounts:0}
 try{
  await db.query('BEGIN')
  // CREATE TABLE is transactional, including dry-run; never issue plaintext passwords to logs.
  await db.query(fs.readFileSync(require('path').resolve(__dirname,'../migrations/20261004_portal_identity_handoffs.sql'),'utf8'))
  const all=(await db.query('SELECT * FROM students WHERE school_id=$1 AND is_active=true ORDER BY id FOR UPDATE',[schoolId])).rows
  const fathersByPhone=new Map()
  for(const s of all){const phone=normalize(s.parent_phone||s.parent_whatsapp);if(phone.length<10)continue;const names=fathersByPhone.get(phone)||new Set();names.add(String(s.father_name||'').trim().toLowerCase());fathersByPhone.set(phone,names)}
  for(const record of all){
   if(record.student_user_id && record.parent_user_id)continue
   const phone=normalize(record.parent_phone||record.parent_whatsapp)
   if(!record.parent_user_id && phone.length<10){result.review_missing_contact++;continue}
   if(!record.parent_user_id && (fathersByPhone.get(phone)?.size||0)>1){result.review_ambiguous_guardian++;continue}
   await db.query('SAVEPOINT single_student')
   try{
    const identity=await provisionStudentIdentities(db,{schoolId,student:record})
    result.linked_students++
    for(const [role,value] of [['student',identity.student],['parent',identity.parent]]){
     if(value?.created){
      await db.query(`INSERT INTO portal_identity_handoffs(school_id,user_id,portal_role,state) VALUES($1,$2,$3,'pending') ON CONFLICT(user_id) DO NOTHING`,[schoolId,value.userId,role]);result.new_pending_accounts++
     }else result.reused_accounts++
    }
    await db.query('RELEASE SAVEPOINT single_student')
   }catch(err){await db.query('ROLLBACK TO SAVEPOINT single_student');await db.query('RELEASE SAVEPOINT single_student');result.review_unhandled_error++;console.error('One student record held for review:',err.code||err.name)}
  }
  const staff=(await db.query(`SELECT * FROM employees WHERE school_id=$1 AND is_active=true AND user_id IS NULL
   AND (LOWER(COALESCE(portal_role,''))='teacher' OR LOWER(COALESCE(designation,'')) LIKE '%teacher%') ORDER BY id FOR UPDATE`,[schoolId])).rows
  for(const employee of staff){
   await db.query('SAVEPOINT single_teacher')
   try{
    const identity=await ensureTeacherIdentity(db,{schoolId,employee});result.linked_teachers++
    if(identity.created){await db.query(`INSERT INTO portal_identity_handoffs(school_id,user_id,portal_role,state) VALUES($1,$2,'teacher','pending') ON CONFLICT(user_id) DO NOTHING`,[schoolId,identity.userId]);result.new_pending_accounts++}else result.reused_accounts++
    await db.query('RELEASE SAVEPOINT single_teacher')
   }catch(err){await db.query('ROLLBACK TO SAVEPOINT single_teacher');await db.query('RELEASE SAVEPOINT single_teacher');result.review_unhandled_error++;console.error('One teacher held for review:',err.code||err.name)}
  }
  const outstanding=(await db.query(`SELECT
   (SELECT COUNT(*)::int FROM students WHERE school_id=$1 AND is_active=true AND student_user_id IS NULL) student_links,
   (SELECT COUNT(*)::int FROM students WHERE school_id=$1 AND is_active=true AND parent_user_id IS NULL) parent_links,
   (SELECT COUNT(*)::int FROM employees WHERE school_id=$1 AND is_active=true AND user_id IS NULL AND (LOWER(COALESCE(portal_role,''))='teacher' OR LOWER(COALESCE(designation,'')) LIKE '%teacher%')) teacher_links,
   (SELECT COUNT(*)::int FROM portal_identity_handoffs WHERE school_id=$1 AND state='pending') pending_handoffs`,[schoolId])).rows[0]
  result.outstanding=outstanding
  if(apply)await db.query('COMMIT');else await db.query('ROLLBACK')
  console.log(JSON.stringify(result))
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}finally{db.release()}
}
main().then(()=>process.exit(0)).catch(e=>{console.error('PREPARATION FAILED',e.code||e.message);process.exit(1)})
