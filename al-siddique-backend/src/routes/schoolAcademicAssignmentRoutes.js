'use strict'
const {router,protect,id,withApproval,audit}=require('./schoolAcademicApprovalCore')
router.post('/teacher-assignments',protect,(req,res)=>withApproval(req,res,async(c,actor)=>{
 const exam=id(req.body?.examId),user=id(req.body?.teacherUserId),employee=id(req.body?.employeeId)
 const cls=String(req.body?.className??'').trim(),section=String(req.body?.section??'').trim(),subject=String(req.body?.subject??'').trim()
 if(!exam||!user||!employee||!cls||!section||!subject||cls.length>80||section.length>80||subject.length>160)
  return {error:'INVALID_EXACT_TEACHER_ASSIGNMENT',status:422}
 const verified=await c.query(`SELECT u.id FROM users u JOIN employees p ON p.user_id=u.id AND p.school_id=u.school_id AND p.id=$3
 WHERE u.id=$1 AND u.school_id=$2 AND u.role='teacher' AND u.is_active=true AND p.is_active=true FOR SHARE OF u,p`,[user,actor.school,employee])
 if(verified.rowCount!==1)return {error:'ACTIVE_STAFF_IDENTITY_MISMATCH'}
 const offerings=await c.query(`SELECT COUNT(*)::int AS n FROM exam_subjects x JOIN exam_class_enrollments e ON e.school_id=x.school_id
 AND e.exam_id=x.exam_id AND e.is_active=true AND LOWER(BTRIM(e.class_name))=LOWER(BTRIM(x.class_name))
 AND LOWER(BTRIM(e.section))=LOWER(BTRIM(x.section))
 WHERE x.school_id=$1 AND x.exam_id=$2 AND x.is_active=true
 AND LOWER(BTRIM(x.class_name))=LOWER(BTRIM($3)) AND LOWER(BTRIM(x.section))=LOWER(BTRIM($4))
 AND LOWER(BTRIM(x.subject))=LOWER(BTRIM($5))`,[actor.school,exam,cls,section,subject])
 if(Number(offerings.rows[0].n)!==1)return {error:'EXACT_ENROLLED_SUBJECT_OFFERING_REQUIRED'}
 const duplicates=await c.query(`SELECT id FROM teacher_class_assignments WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true
 AND LOWER(BTRIM(class_name))=LOWER(BTRIM($3)) AND LOWER(BTRIM(section))=LOWER(BTRIM($4))
 AND LOWER(BTRIM(subject))=LOWER(BTRIM($5)) FOR UPDATE`,[actor.school,user,cls,section,subject])
 if(duplicates.rowCount)return {error:'ACTIVE_ASSIGNMENT_ALREADY_EXISTS'}
 const created=await c.query("INSERT INTO teacher_class_assignments(school_id,teacher_user_id,employee_id,class_name,section,subject,source,is_active) VALUES($1,$2,$3,$4,$5,$6,'signed-admin-review',true) RETURNING id",[actor.school,user,employee,cls,section,subject])
 await audit(c,actor,req,'teacher_assignment',exam,created.rows[0].id,null,1)
 return {data:{assignmentId:created.rows[0].id,examId:exam,teacherUserId:user,className:cls,section,subject}}
}))
module.exports=router
