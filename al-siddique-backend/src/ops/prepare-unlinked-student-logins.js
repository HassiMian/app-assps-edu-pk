require('dotenv').config({path:require('path').resolve(__dirname,'../.env')})
const {pool}=require('../config/database')
const {ensureStudentIdentity,schoolContext}=require('../services/portalIdentityService')
const schoolId=Number(process.argv.find(x=>x.startsWith('--school='))?.split('=')[1]||'1')
const apply=process.argv.includes('--apply')
async function main(){if(!Number.isInteger(schoolId)||schoolId<1)throw Error('Invalid school')
const db=await pool.connect(), result={schoolId,mode:apply?'COMMIT':'DRY_RUN_ROLLBACK',linked_student_records:0,new_pending_accounts:0,reused_accounts:0}
try{
 await db.query('BEGIN');const ctx=await schoolContext(db,schoolId)
 const unlinked=(await db.query('SELECT * FROM students WHERE school_id=$1 AND is_active=true AND student_user_id IS NULL ORDER BY id FOR UPDATE',[schoolId])).rows
 for(const student of unlinked){
  await db.query('SAVEPOINT one_student')
  try{
   const user=await ensureStudentIdentity(db,{schoolId,student})
   const linked=await db.query(`UPDATE students SET student_user_id=$1,tenant_id=$2,updated_at=NOW()
      WHERE id=$3 AND school_id=$4 AND student_user_id IS NULL RETURNING id`,[user.userId,ctx.tenantId,student.id,schoolId])
   if(linked.rowCount!==1)throw Error('Student link changed during preparation')
   if(user.created){await db.query(`INSERT INTO portal_identity_handoffs(school_id,user_id,portal_role,state)
       VALUES($1,$2,'student','pending') ON CONFLICT(user_id) DO NOTHING`,[schoolId,user.userId]);result.new_pending_accounts++}
   else result.reused_accounts++
   result.linked_student_records++;await db.query('RELEASE SAVEPOINT one_student')
  }catch(err){await db.query('ROLLBACK TO SAVEPOINT one_student');await db.query('RELEASE SAVEPOINT one_student');throw Error('Student login preparation paused for record-level review: '+(err.code||err.name))}
 }
 result.outstanding=(await db.query(`SELECT
  (SELECT COUNT(*)::int FROM students WHERE school_id=$1 AND is_active=true AND student_user_id IS NULL) students,
  (SELECT COUNT(*)::int FROM students WHERE school_id=$1 AND is_active=true AND parent_user_id IS NULL) parents,
  (SELECT COUNT(*)::int FROM portal_identity_handoffs WHERE school_id=$1 AND state='pending') pending_handoffs`,[schoolId])).rows[0]
 await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify(result))
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}finally{db.release()}}
main().then(()=>process.exit(0)).catch(err=>{console.error('UNLINKED STUDENT PREPARATION FAILED',err.code||err.message);process.exit(1)})
