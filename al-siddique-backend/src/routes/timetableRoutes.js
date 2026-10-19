'use strict'
const express = require('express')
const router = express.Router()
const { query, pool, applyTenantContext } = require('../config/database')
const writeGuard = require('../services/timetableWriteGuard')
const { protect, requireScopeForServiceOnly } = require('../middleware/auth')
const { tenantClause } = require('../middleware/tenant')
const { schoolBellSchedule } = require('../domain/schoolBellSchedule')

const CLASS_NAME_MAP = {
  '1': 'One', 'one': 'One',
  '2': 'Two', 'two': 'Two',
  '3': 'Three', 'three': 'Three',
  '4': 'Four', 'four': 'Four',
  '5': 'Five', 'five': 'Five',
  '6': 'Six', 'six': 'Six',
  '7': 'Seven', 'seven': 'Seven',
  '8': 'Eight', 'eight': 'Eight',
  '9': 'Nine', 'nine': 'Nine', '9-boys': 'Nine', '9-girls': 'Nine', 'usman': 'Nine', 'fatima': 'Nine',
  '10': 'Ten', 'ten': 'Ten',
  'pre-nine': 'Pre-Nine', 'prenine': 'Pre-Nine', 'pre 9': 'Pre-Nine',
  'starter': 'Starter', 'mover': 'Mover', 'flyer': 'Flyer',
  'school-wide': 'School-wide'
}

function normalizeClass(cls) {
  if (!cls) return null
  const key = String(cls).trim().toLowerCase()
  return CLASS_NAME_MAP[key] || String(cls).trim()
}

router.get('/bells', protect, async (req, res) => {
  try {
    const schoolId = Number(req.school_id || req.user?.school_id || 0)
    const schedule = schoolBellSchedule(schoolId)
    if (!schedule) return res.status(403).json({ success: false, code: 'TIMETABLE_BELLS_NOT_AVAILABLE_FOR_SCHOOL' })
    res.json({ success: true, data: schedule })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/workload', protect, async (req, res) => {
  try {
    const schoolId = Number(req.school_id || req.user?.school_id || 0)
    const tenant = await tenantClause(req, { table: 'timetable', paramIndex: 1 })

    const workloadSql = `
      SELECT
        teacher_id,
        COALESCE(teacher_display_name, 'Unassigned') as teacher_name,
        COUNT(*) as total_periods,
        COUNT(DISTINCT day_name) as teaching_days,
        json_agg(json_build_object(
          'day_name', day_name,
          'period_label', period_label,
          'start_time', start_time,
          'end_time', end_time,
          'class_name', class_name,
          'section', section,
          'subject', subject
        ) ORDER BY day_order, start_time) as assignments
      FROM timetable
      WHERE 1=1 ${tenant.clause} AND teacher_id IS NOT NULL AND day_name != 'Regular'
      GROUP BY teacher_id, teacher_display_name
      ORDER BY total_periods DESC
    `
    const workloadResult = await query(workloadSql, tenant.params)

    const clashSql = `
      SELECT t1.day_name, t1.period_label, t1.start_time, t1.end_time,
             t1.teacher_id, t1.teacher_display_name,
             t1.class_name as class1, t1.section as section1, t1.subject as subject1,
             t2.class_name as class2, t2.section as section2, t2.subject as subject2
      FROM timetable t1
      JOIN timetable t2 ON t1.school_id = t2.school_id
                       AND t1.day_name = t2.day_name
                       AND t1.period_label = t2.period_label
                       AND t1.teacher_id = t2.teacher_id
                       AND t1.id < t2.id
      WHERE t1.school_id = $1 AND t1.teacher_id IS NOT NULL AND t1.day_name != 'Regular'
        AND NOT (t1.class_name = t2.class_name AND t1.section = t2.section)
      ORDER BY t1.day_order, t1.start_time
    `
    const clashResult = await query(clashSql, [schoolId])

    res.json({
      success: true,
      data: {
        workload: workloadResult.rows,
        clashes: clashResult.rows
      }
    })
  } catch (err) {
    console.error('Workload error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/save', protect, async (req, res) => {
 let client
 try {
  const {schoolId,actorId}=writeGuard.authority(req)
  if (!schoolBellSchedule(schoolId)) throw new writeGuard.GateError(403,'TIMETABLE_SCHOOL_NOT_CONFIGURED')
  // Never promote a submitted source hash into a server-trusted approval.
  const trusted=process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256 || ''
  const attested=process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED === 'true'
  const replacement=writeGuard.normalize(req.body,schoolBellSchedule(schoolId),{sourceSha:trusted,attested})
  const ids=[...new Set(replacement.entries.map(e=>e.teacher_id))]
  client=await pool.connect()
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
  await applyTenantContext(client)
  const lockKey=[schoolId,replacement.class_name.toLowerCase(),replacement.section.toLowerCase(),
                 replacement.day_name,replacement.academic_session].join('|')
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[lockKey])
  const where='WHERE school_id=$1 AND lower(class_name)=lower($2) AND lower(section)=lower($3) AND day_name=$4 AND academic_session=$5'
  const args=[schoolId,replacement.class_name,replacement.section,replacement.day_name,replacement.academic_session]
  const existing=await client.query('SELECT period_label,start_time,end_time,subject,teacher_id,teacher_display_name,source_sha256,staff_identity_reviewed FROM public.timetable '+where+' ORDER BY period_label FOR UPDATE',args)
  writeGuard.matchSnapshot(existing.rows,replacement.expected_snapshot_sha256)
  const identity=await client.query("SELECT u.id AS uid,e.name AS employee_name FROM public.users u JOIN public.employees e ON e.school_id=u.school_id AND e.user_id=u.id AND e.is_active=true WHERE u.school_id=$1 AND u.is_active=true AND lower(u.role)='teacher' AND u.id=ANY($2::int[])",[schoolId,ids])
  const known=new Map(identity.rows.map(row=>[Number(row.uid),String(row.employee_name||'').trim().toLowerCase()]))
  if(ids.some(id=>!known.has(id))||replacement.entries.some(e=>known.get(e.teacher_id)!==e.teacher_display_name.toLowerCase()))
   throw new writeGuard.GateError(409,'TIMETABLE_STAFF_IDENTITY_REVIEW_REQUIRED')
  await client.query('DELETE FROM public.timetable '+where,args)
  for(const e of replacement.entries) {
   await client.query('INSERT INTO public.timetable (school_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_id,teacher_display_name,academic_session,staff_identity_reviewed,source_sha256,source_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$15)',
    [schoolId,['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(replacement.day_name)+1,
     replacement.day_name,e.start_time,e.end_time,e.subject,replacement.class_name,replacement.section,e.room,
     e.period_label,e.teacher_id,e.teacher_display_name,replacement.academic_session,
     replacement.source_sha256,'Principal-reviewed replacement; actor='+actorId+'; base='+replacement.expected_snapshot_sha256])
  }
  await client.query('COMMIT')
  return res.json({success:true,count:8,message:'Eight reviewed periods saved'})
 } catch(error) {
  if(client)await client.query('ROLLBACK').catch(()=>{})
  const known=error instanceof writeGuard.GateError
  return res.status(known?error.status:503).json({success:false,code:known?error.code:'TIMETABLE_SAVE_UNAVAILABLE',message:'Timetable changes were not applied.'})
 } finally {if(client)client.release()}
})

router.get('/snapshot', protect, async (req,res)=>{
 try {
  const {schoolId}=writeGuard.authority(req)
  if (!schoolBellSchedule(schoolId)) throw new writeGuard.GateError(403,'TIMETABLE_SCHOOL_NOT_CONFIGURED')
  const className=String(req.query.class_name||'').trim()
  const section=String(req.query.section||'').trim()
  const day=String(req.query.day_name||'').trim()
  const session=String(req.query.academic_session||'').trim()
  if(!className||!section||!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].includes(day)||
      session!==schoolBellSchedule(schoolId)?.academic_session)
   return res.status(422).json({success:false,code:'TIMETABLE_SNAPSHOT_SCOPE_REQUIRED'})
  const rows=await query('SELECT period_label,start_time,end_time,subject,teacher_id,teacher_display_name,source_sha256,staff_identity_reviewed FROM public.timetable WHERE school_id=$1 AND lower(class_name)=lower($2) AND lower(section)=lower($3) AND day_name=$4 AND academic_session=$5 ORDER BY period_label',
   [schoolId,className,section,day,session])
  writeGuard.matchSnapshot(rows.rows,writeGuard.digest(rows.rows))
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,expected_snapshot_sha256:writeGuard.digest(rows.rows),entries:rows.rows})
 } catch(error) {
  const known=error instanceof writeGuard.GateError
  return res.status(known?error.status:503).json({success:false,code:known?error.code:'TIMETABLE_SNAPSHOT_UNAVAILABLE'})
 }
})

router.get('/', protect, requireScopeForServiceOnly('school.timetable.read'), async (req, res) => {
  try {
    const filters = []
    const params = []
    let idx = 1

    if (req.query.class) {
      const norm = normalizeClass(req.query.class)
      filters.push(`(LOWER(class_name) = LOWER($${idx++}) OR LOWER(class_name) = LOWER($${idx++}))`)
      params.push(req.query.class.trim(), norm)
    }
    if (req.query.section) {
      filters.push(`LOWER(section) = LOWER($${idx++})`)
      params.push(req.query.section.trim())
    }
    if (req.query.teacher_id) {
      filters.push(`teacher_id = $${idx++}`)
      params.push(req.query.teacher_id)
    }
    if (req.query.day_name) {
      filters.push(`LOWER(day_name) = LOWER($${idx++})`)
      params.push(req.query.day_name.trim())
    }

    const tenant = await tenantClause(req, { table: 'timetable', paramIndex: idx })
    let sql = 'SELECT * FROM timetable WHERE 1=1'
    // School1 has preserved historical Regular rows alongside active weekday rows.
    // Never double-count them unless a manager explicitly requests historical evidence.
    if (Number(req.school_id) === 1 && !req.query.day_name && req.query.include_historical !== 'true')
      sql += " AND day_name <> 'Regular'"
    if (filters.length) sql += ` AND ${filters.join(' AND ')}`
    sql += tenant.clause
    sql += ' ORDER BY day_order, start_time, class_name, section LIMIT 500'
    params.push(...tenant.params)

    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Timetable list error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
