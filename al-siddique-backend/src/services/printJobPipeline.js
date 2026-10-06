const crypto = require('crypto')
let _pool = null
const getPool = () => (_pool ||= require('../config/database').pool)

const clean = value => String(value ?? '').trim()
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
    : value
const sha256 = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')

const FORBIDDEN_ANSWER_KEYS = new Set([
  'answer','answers','answerkey','answer_key','correctanswer','correct_answer','correctoption','correct_option',
  'correctmappings','correct_mappings','iscorrect','is_correct','explanation','explanations','solution','solutions',
  'markingscheme','marking_scheme','teachernotes','teacher_notes',
])

function normalizeKey(value) { return String(value || '').replace(/[^a-z0-9_]/gi,'').toLowerCase() }

function stripAnswerMaterial(value) {
  if (Array.isArray(value)) return value.map(stripAnswerMaterial)
  if (!value || typeof value !== 'object') return value
  const out={}
  for (const [k,v] of Object.entries(value)) {
    if (FORBIDDEN_ANSWER_KEYS.has(normalizeKey(k))) continue
    out[k]=stripAnswerMaterial(v)
  }
  return out
}

function containsForbiddenAnswerMaterial(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenAnswerMaterial)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([k,v]) => FORBIDDEN_ANSWER_KEYS.has(normalizeKey(k)) || containsForbiddenAnswerMaterial(v))
}

function buildStudentSafeProjection(releaseSnapshot = {}, bindings = {}) {
  const snapshot=stripAnswerMaterial(releaseSnapshot)
  const projection={
    projectionType:'STUDENT_SAFE',
    paper:snapshot,
    personalization:{
      student:bindings.student ? {
        displayName:clean(bindings.student.displayName),
        rollNumber:clean(bindings.student.rollNumber),
        className:clean(bindings.student.className),
        section:clean(bindings.student.section),
      } : null,
      teacher:bindings.teacher ? { displayName:clean(bindings.teacher.displayName), subject:clean(bindings.teacher.subject) } : null,
    },
  }
  if (containsForbiddenAnswerMaterial(projection)) throw new Error('Student-safe projection retained forbidden answer material')
  return projection
}

function buildStaffAnswerKeyProjection(releaseSnapshot = {}, { role } = {}) {
  const allowed=new Set(['super_admin','admin','school_admin','principal','teacher'])
  if (!allowed.has(String(role||'').toLowerCase())) {
    const error=new Error('Staff authorization is required for answer-key projection')
    error.code='ANSWER_KEY_ROLE_REQUIRED'
    error.status=403
    throw error
  }
  return {projectionType:'STAFF_ANSWER_KEY',paper:JSON.parse(JSON.stringify(releaseSnapshot))}
}

function planPersonalizedBooklets({ members = [], pageCounts = {}, duplex = false, maxStudents = 500 } = {}) {
  if (!Array.isArray(members)) throw new Error('members must be an array')
  if (members.length > maxStudents) { const e=new Error(`Personalized batch exceeds ${maxStudents} students`); e.code='PRINT_BATCH_LIMIT_EXCEEDED'; throw e }
  let cursor=1
  const booklets=members.map((member,index)=>{
    const id=String(member.id ?? member.rosterMemberId ?? index+1)
    const raw=Number(pageCounts[id] ?? pageCounts[index] ?? member.pageCount)
    if (!Number.isInteger(raw) || raw<1) throw new Error(`Valid page count required for roster member ${id}`)
    const paddingPages=duplex && raw%2===1 ? 1 : 0
    const row={rosterMemberId:member.id ?? member.rosterMemberId ?? null,bookletIndex:index+1,startPage:cursor,contentPages:raw,paddingPages,totalBookletPages:raw+paddingPages}
    cursor += row.totalBookletPages
    return row
  })
  if (duplex && booklets.some(row=>row.startPage%2===0)) throw new Error('Duplex boundary planner produced a back-side student start')
  return {duplex,totalPages:cursor-1,booklets}
}

async function withTenantTransaction(schoolId, fn) {
  const tenantId=Number(schoolId)
  if (!Number.isInteger(tenantId) || tenantId<=0) throw new Error('schoolId is required')
  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id',$1,true)",[String(tenantId)])
    const result=await fn(client,tenantId)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { client.release() }
}

async function createRosterSnapshot({ schoolId, className, section = null, userId = null } = {}) {
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    const params=[tenantId,clean(className)]
    let sql=`SELECT id,gr_number,name,roll_number,class,section FROM students WHERE school_id=$1 AND class=$2 AND COALESCE(is_active,true)=true`
    if (section != null && clean(section)) { params.push(clean(section)); sql += ` AND COALESCE(section,'')=$3` }
    sql += ` ORDER BY NULLIF(regexp_replace(COALESCE(roll_number,''),'[^0-9]','','g'),'')::int NULLS LAST,COALESCE(roll_number,''),name,id`
    const result=await client.query(sql,params)
    const members=result.rows.map((row,index)=>({ordinal:index+1,studentId:row.id,studentKey:row.gr_number||String(row.id),displayName:row.name,rollNumber:row.roll_number||'',className:row.class,section:row.section||''}))
    const rosterHash=sha256(members)
    const publicId=`roster-${crypto.randomUUID()}`
    const snapshot=await client.query(`INSERT INTO roster_snapshots(school_id,public_id,class_name,section,student_count,roster_hash,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[tenantId,publicId,clean(className),clean(section)||null,members.length,rosterHash,userId])
    const persistedMembers=[]
    for (const member of members) {
      const inserted=await client.query(`INSERT INTO roster_snapshot_members(school_id,roster_snapshot_id,ordinal,student_id,student_key,display_name,roll_number,class_name,section) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[tenantId,snapshot.rows[0].id,member.ordinal,member.studentId,member.studentKey,member.displayName,member.rollNumber,member.className,member.section])
      persistedMembers.push({...member,id:inserted.rows[0].id})
    }
    return {...snapshot.rows[0],members:persistedMembers}
  })
}

async function createTeacherBindingSnapshot({ schoolId, className, section = null, subject, userId = null, override = null } = {}) {
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    let teacher
    if (override) {
      if (!clean(override.teacherName) || !clean(override.reason)) { const e=new Error('Manual teacher override requires teacherName and reason'); e.code='TEACHER_OVERRIDE_REASON_REQUIRED'; throw e }
      teacher={teacher_user_id:override.teacherUserId||null,teacher_name:clean(override.teacherName),binding_source:'manual_override',source_assignment_id:null,override_reason:clean(override.reason)}
    } else {
      const params=[tenantId,clean(className),clean(subject)]
      let where=`tca.school_id=$1 AND tca.class_name=$2 AND LOWER(COALESCE(tca.subject,''))=LOWER($3) AND tca.is_active=true`
      if (section != null && clean(section)) { params.push(clean(section)); where += ` AND COALESCE(tca.section,'')=$4` }
      const found=await client.query(`SELECT tca.id AS assignment_id,tca.teacher_user_id,u.name AS teacher_name FROM teacher_class_assignments tca JOIN users u ON u.id=tca.teacher_user_id AND u.school_id=tca.school_id WHERE ${where} ORDER BY tca.id`,params)
      if (!found.rowCount) { const e=new Error('Teacher assignment was not found'); e.code='TEACHER_BINDING_NOT_FOUND'; throw e }
      if (found.rowCount>1) { const e=new Error('Multiple teacher assignments require an explicit override'); e.code='TEACHER_BINDING_AMBIGUOUS'; throw e }
      teacher={teacher_user_id:found.rows[0].teacher_user_id,teacher_name:found.rows[0].teacher_name,binding_source:'assignment',source_assignment_id:found.rows[0].assignment_id,override_reason:null}
    }
    const publicId=`teacher-binding-${crypto.randomUUID()}`
    const inserted=await client.query(`INSERT INTO teacher_binding_snapshots(school_id,public_id,class_name,section,subject,teacher_user_id,teacher_name,binding_source,source_assignment_id,override_reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[tenantId,publicId,clean(className),clean(section)||null,clean(subject),teacher.teacher_user_id,teacher.teacher_name,teacher.binding_source,teacher.source_assignment_id,teacher.override_reason,userId])
    return inserted.rows[0]
  })
}

async function createPrintJob({ schoolId, releaseId, rosterSnapshotId = null, teacherBindingSnapshotId = null, artifactKind = 'master', duplex = false, copyCount = 1, rendererVersion, browserEngineVersion = null, settings = {}, userId = null } = {}) {
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    const release=await client.query('SELECT id FROM assessment_releases WHERE school_id=$1 AND release_id=$2',[tenantId,clean(releaseId)])
    if (!release.rowCount) { const e=new Error('Assessment release not found'); e.code='ASSESSMENT_RELEASE_NOT_FOUND'; throw e }
    if (artifactKind==='student_batch' && !rosterSnapshotId) { const e=new Error('Student batch requires immutable roster snapshot'); e.code='ROSTER_SNAPSHOT_REQUIRED'; throw e }
    if (rosterSnapshotId) {
      const roster=await client.query('SELECT id FROM roster_snapshots WHERE school_id=$1 AND id=$2',[tenantId,Number(rosterSnapshotId)])
      if (!roster.rowCount) { const e=new Error('Roster snapshot not found'); e.code='ROSTER_SNAPSHOT_NOT_FOUND'; throw e }
    }
    if (teacherBindingSnapshotId) {
      const binding=await client.query('SELECT id FROM teacher_binding_snapshots WHERE school_id=$1 AND id=$2',[tenantId,Number(teacherBindingSnapshotId)])
      if (!binding.rowCount) { const e=new Error('Teacher binding snapshot not found'); e.code='TEACHER_BINDING_SNAPSHOT_NOT_FOUND'; throw e }
    }
    const count=Number(copyCount)
    if (!Number.isInteger(count)||count<1||count>500) { const e=new Error('copyCount must be between 1 and 500'); e.code='INVALID_COPY_COUNT'; throw e }
    const publicId=`print-${crypto.randomUUID()}`
    const inserted=await client.query(`INSERT INTO print_jobs(school_id,public_id,assessment_release_id,roster_snapshot_id,teacher_binding_snapshot_id,artifact_kind,personalized,duplex,copy_count,renderer_version,browser_engine_version,settings_json,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13) RETURNING *`,[tenantId,publicId,release.rows[0].id,rosterSnapshotId,teacherBindingSnapshotId,artifactKind,artifactKind==='student_batch',Boolean(duplex),count,clean(rendererVersion)||'unknown',clean(browserEngineVersion)||null,JSON.stringify(settings||{}),userId])
    return inserted.rows[0]
  })
}

async function recordPrintAttempt({ schoolId, printJobPublicId, actorId = null, operatorConfirmed = false, note = null } = {}) {
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    const found=await client.query('SELECT * FROM print_jobs WHERE school_id=$1 AND public_id=$2 FOR UPDATE',[tenantId,clean(printJobPublicId)])
    if (!found.rowCount) { const e=new Error('Print job not found'); e.code='PRINT_JOB_NOT_FOUND'; throw e }
    const job=found.rows[0]
    if (job.artifact_kind==='student_batch' && Number(job.attempt_count)>0 && !operatorConfirmed) { const e=new Error('Retrying a personalized batch requires operator confirmation'); e.code='PRINT_RETRY_CONFIRMATION_REQUIRED'; e.status=409; throw e }
    const next=Number(job.attempt_count)+1
    await client.query('UPDATE print_jobs SET attempt_count=$1,status=\'printing\',updated_at=NOW() WHERE school_id=$2 AND id=$3',[next,tenantId,job.id])
    const attempt=await client.query(`INSERT INTO print_job_attempts(school_id,print_job_id,attempt_number,status,operator_confirmed,note,actor_id) VALUES($1,$2,$3,'printing',$4,$5,$6) RETURNING *`,[tenantId,job.id,next,Boolean(operatorConfirmed),clean(note)||null,actorId])
    return attempt.rows[0]
  })
}


async function recordBookletPlan({ schoolId, printJobPublicId, pageCounts = {} } = {}) {
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    const found=await client.query('SELECT id,roster_snapshot_id,artifact_kind,duplex FROM print_jobs WHERE school_id=$1 AND public_id=$2 FOR UPDATE',[tenantId,clean(printJobPublicId)])
    if (!found.rowCount) { const e=new Error('Print job not found'); e.code='PRINT_JOB_NOT_FOUND'; throw e }
    const job=found.rows[0]
    if (job.artifact_kind!=='student_batch' || !job.roster_snapshot_id) { const e=new Error('Booklet planning is only valid for personalized student batches'); e.code='BOOKLET_PLAN_REQUIRES_STUDENT_BATCH'; throw e }
    const membersResult=await client.query('SELECT id,ordinal,student_key FROM roster_snapshot_members WHERE school_id=$1 AND roster_snapshot_id=$2 ORDER BY ordinal',[tenantId,job.roster_snapshot_id])
    const members=membersResult.rows.map(row=>({id:row.id,ordinal:row.ordinal,studentKey:row.student_key}))
    const normalizedPageCounts={}
    for (const member of members) {
      const raw=pageCounts?.[member.studentKey] ?? pageCounts?.[String(member.ordinal)] ?? pageCounts?.[member.ordinal-1]
      if (raw != null) normalizedPageCounts[String(member.id)]=raw
    }
    const plan=planPersonalizedBooklets({members,pageCounts:normalizedPageCounts,duplex:job.duplex})
    const existing=await client.query('SELECT roster_member_id,booklet_index,start_page,content_pages,padding_pages FROM print_job_booklets WHERE school_id=$1 AND print_job_id=$2 ORDER BY booklet_index',[tenantId,job.id])
    if (existing.rowCount) {
      const same=existing.rows.length===plan.booklets.length && existing.rows.every((row,index)=>{
        const p=plan.booklets[index]
        return String(row.roster_member_id)===String(p.rosterMemberId) && Number(row.booklet_index)===p.bookletIndex && Number(row.start_page)===p.startPage && Number(row.content_pages)===p.contentPages && Number(row.padding_pages)===p.paddingPages
      })
      if (!same) { const e=new Error('Immutable booklet plan already exists for this print job'); e.code='PRINT_BOOKLET_PLAN_ALREADY_FROZEN'; throw e }
      return {...plan,idempotentReplay:true}
    }
    for (const booklet of plan.booklets) {
      await client.query(`INSERT INTO print_job_booklets(school_id,print_job_id,roster_member_id,booklet_index,start_page,content_pages,padding_pages) VALUES($1,$2,$3,$4,$5,$6,$7)`,[tenantId,job.id,booklet.rosterMemberId,booklet.bookletIndex,booklet.startPage,booklet.contentPages,booklet.paddingPages])
    }
    return {...plan,idempotentReplay:false}
  })
}
module.exports={sha256,stripAnswerMaterial,containsForbiddenAnswerMaterial,buildStudentSafeProjection,buildStaffAnswerKeyProjection,planPersonalizedBooklets,createRosterSnapshot,createTeacherBindingSnapshot,createPrintJob,recordPrintAttempt,recordBookletPlan,withTenantTransaction}
