// src/routes/questionBankRoutes.js
// Al Siddique Smart School OS - Question Bank API

const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const { query, applyTenantContext } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { ensureTeacherAssignmentSchema } = require('../services/teacherAssignmentService')
const { captureQuestionGovernance, transitionQuestionLifecycle } = require('../services/questionBankGovernance')

const canUseQuestionBank = requireRoles('super_admin', 'admin', 'principal', 'teacher')
const canManageQuestionBank = requireRoles('super_admin', 'admin', 'principal')

router.use(protect, canUseQuestionBank)

function requireSchoolContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId && req.user?.role !== 'super_admin') {
    res.status(403).json({ success: false, message: 'School context is required.' })
    return null
  }
  if (!schoolId) {
    res.status(400).json({ success: false, message: 'school_id is required for super admin question-bank access.' })
    return null
  }
  return schoolId
}

// Helper to generate IDs
function generateId() {
  return `q_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

// Governance V1 — duplicate-safe capture and lifecycle control.
router.post('/governance/capture', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey
    const result = await captureQuestionGovernance({
      schoolId,
      userId:req.user?.id || null,
      idempotencyKey,
      question:req.body?.question || req.body || {},
      sourceQuestionBankId:req.body?.sourceQuestionBankId || req.body?.question?.id || req.body?.id || null,
    })
    res.status(result.replayed ? 200 : (result.created ? 201 : 200)).json({ success:true, data:result })
  } catch (error) {
    const status = Number(error.status) || 500
    if (status >= 500) console.error('Question governance capture failed:', error)
    res.status(status).json({ success:false, code:error.code || 'QUESTION_GOVERNANCE_CAPTURE_FAILED', message:error.message || 'Question governance capture failed' })
  }
})

router.patch('/governance/:publicId/status', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const data = await transitionQuestionLifecycle({
      schoolId,
      userId:req.user?.id || null,
      publicId:req.params.publicId,
      toStatus:req.body?.status,
    })
    res.json({ success:true, data })
  } catch (error) {
    const status = Number(error.status) || (error.code === 'INVALID_QUESTION_LIFECYCLE_TRANSITION' ? 409 : 500)
    if (status >= 500) console.error('Question governance lifecycle failed:', error)
    res.status(status).json({ success:false, code:error.code || 'QUESTION_GOVERNANCE_LIFECYCLE_FAILED', message:error.message || 'Question governance lifecycle failed' })
  }
})

// ─── 1. Get List of Questions (with filters) ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { subject, classLevel, chapter, type, difficulty, approved, limit = 50, offset = 0 } = req.query

    let sql = `SELECT * FROM question_bank WHERE school_id = $1`
    const params = [schoolId]
    let paramCount = 1
    const role = String(req.user?.role || '').toLowerCase()
    if (role === 'teacher') {
      await ensureTeacherAssignmentSchema()
      paramCount++
      sql += ` AND is_approved = true AND EXISTS (
        SELECT 1 FROM teacher_class_assignments tca
        WHERE tca.school_id = question_bank.school_id
          AND tca.teacher_user_id = $${paramCount}
          AND tca.is_active = true
          AND LOWER(tca.class_name) = LOWER(COALESCE(question_bank.class_level,''))
          AND (COALESCE(tca.subject,'') = '' OR LOWER(tca.subject) = LOWER(COALESCE(question_bank.subject,'')))
      )`
      params.push(req.user?.id)
    }

    if (subject) {
      paramCount++
      sql += ` AND subject ILIKE $${paramCount}`
      params.push(`%${subject}%`)
    }
    if (classLevel) {
      paramCount++
      sql += ` AND class_level = $${paramCount}`
      params.push(classLevel)
    }
    if (chapter) {
      paramCount++
      sql += ` AND chapter_name ILIKE $${paramCount}`
      params.push(`%${chapter}%`)
    }
    if (type) {
      paramCount++
      sql += ` AND question_type = $${paramCount}`
      params.push(type)
    }
    if (difficulty) {
      paramCount++
      sql += ` AND difficulty = $${paramCount}`
      params.push(difficulty)
    }
    if (approved !== undefined && String(req.user?.role || '').toLowerCase() !== 'teacher') {
      paramCount++
      sql += ` AND is_approved = $${paramCount}`
      params.push(approved === 'true')
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)
    
    // Get total count for pagination
    const countSql = sql.split('ORDER BY')[0].replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = await query(countSql, params.slice(0, paramCount))

    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: parseInt(countResult.rows[0]?.total || 0),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
  } catch (error) {
    console.error('Error fetching question bank:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch questions' })
  }
})

// ─── 2. Get Single Question ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { id } = req.params

    const role = String(req.user?.role || '').toLowerCase()
    if (role === 'teacher') await ensureTeacherAssignmentSchema()
    const result = await query(
      `SELECT * FROM question_bank q
       WHERE q.id = $1 AND q.school_id = $2
         ${role === 'teacher' ? `AND q.is_approved=true AND EXISTS (
           SELECT 1 FROM teacher_class_assignments tca
           WHERE tca.school_id=q.school_id AND tca.teacher_user_id=$3 AND tca.is_active=true
             AND LOWER(tca.class_name)=LOWER(COALESCE(q.class_level,''))
             AND (COALESCE(tca.subject,'')='' OR LOWER(tca.subject)=LOWER(COALESCE(q.subject,'')))
         )` : ''}`,
      role === 'teacher' ? [id, schoolId, req.user?.id] : [id, schoolId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error fetching question:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch question' })
  }
})

// ─── 3-5. Legacy mutation compatibility through Governance V1 ─────────────────
// Legacy callers keep their endpoint shape, but every mutation now converges on
// QuestionMaster + immutable QuestionRevision. No direct row update/delete is allowed.
function governanceIdempotencyKey(prefix, req, questionId = '') {
  const supplied = String(req.get('Idempotency-Key') || req.body?.idempotencyKey || '').trim()
  if (supplied) return supplied
  const nonce = crypto.randomUUID()
  return `legacy:${prefix}:${questionId || 'new'}:${nonce}`
}

async function loadLegacyQuestion(schoolId, id) {
  const result = await query('SELECT * FROM question_bank WHERE school_id=$1 AND id=$2 LIMIT 1', [schoolId, id])
  return result.rows[0] || null
}

function governedLegacyResponse(legacy, governance) {
  return {
    ...legacy,
    is_approved: governance.lifecycleStatus === 'ready',
    governance: {
      publicId: governance.publicId,
      lifecycleStatus: governance.lifecycleStatus,
      currentRevision: governance.currentRevision,
      revisionCreated: governance.revisionCreated,
      duplicate: governance.duplicate,
      replayed: governance.replayed,
    },
  }
}

router.post('/', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res); if (!schoolId) return
    const data = req.body || {}; const id = generateId(); const userId = req.user?.id || null
    const governance = await captureQuestionGovernance({
      schoolId, userId,
      idempotencyKey: governanceIdempotencyKey('create', req, id),
      question: { ...data, id },
      sourceQuestionBankId: id,
    })
    const legacyResult=await query(`INSERT INTO question_bank
      (id,school_id,class_level,subject,medium,board,chapter_no,chapter_name,topic_name,question_type,question_text,question_text_urdu,options,correct_option,answer,explanation,marks,difficulty,priority,is_approved,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,false,$20) RETURNING *`,
      [id,schoolId,data.class_level,data.subject,data.medium||'english',data.board||null,data.chapter_no,data.chapter_name,data.topic_name,data.question_type,data.question_text,data.question_text_urdu,JSON.stringify(data.options||[]),data.correct_option,data.answer,data.explanation,data.marks||1,data.difficulty||'medium',data.priority||'exercise',userId])
    res.status(201).json({ success:true, data:governedLegacyResponse(legacyResult.rows[0], governance) })
  } catch (error) {
    const status=Number(error.statusCode||error.status||500)
    if(status>=500) console.error('Governed question create failed:',error)
    res.status(status).json({success:false,code:error.code||'QUESTION_CREATE_FAILED',message:error.message||'Failed to add question'})
  }
})

router.put('/:id', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId=requireSchoolContext(req,res); if(!schoolId)return
    const existing=await loadLegacyQuestion(schoolId,req.params.id)
    if(!existing)return res.status(404).json({success:false,message:'Question not found or no permission'})
    const merged={...existing,...(req.body||{}),id:existing.id,school_id:schoolId}
    const governance=await captureQuestionGovernance({
      schoolId,userId:req.user?.id||null,
      idempotencyKey:governanceIdempotencyKey('edit',req,existing.id),
      question:merged,sourceQuestionBankId:existing.id,
    })
    res.json({success:true,data:governedLegacyResponse(merged,governance)})
  } catch(error) {
    const status=Number(error.statusCode||error.status||500)
    if(status>=500) console.error('Governed question edit failed:',error)
    res.status(status).json({success:false,code:error.code||'QUESTION_EDIT_FAILED',message:error.message||'Failed to update question'})
  }
})

router.delete('/:id', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId=requireSchoolContext(req,res); if(!schoolId)return
    const existing=await loadLegacyQuestion(schoolId,req.params.id)
    if(!existing)return res.status(404).json({success:false,message:'Question not found or no permission'})
    const captured=await captureQuestionGovernance({
      schoolId,userId:req.user?.id||null,
      idempotencyKey:governanceIdempotencyKey('retire-capture',req,existing.id),
      question:existing,sourceQuestionBankId:existing.id,
    })
    let lifecycle=captured.lifecycleStatus
    if(lifecycle==='candidate') lifecycle=(await transitionQuestionLifecycle({schoolId,userId:req.user?.id||null,publicId:captured.publicId,toStatus:'reviewed'})).lifecycle_status
    if(lifecycle==='reviewed') lifecycle=(await transitionQuestionLifecycle({schoolId,userId:req.user?.id||null,publicId:captured.publicId,toStatus:'ready'})).lifecycle_status
    if(lifecycle==='ready') lifecycle=(await transitionQuestionLifecycle({schoolId,userId:req.user?.id||null,publicId:captured.publicId,toStatus:'retired'})).lifecycle_status
    res.json({success:true,message:'Question retired; historical revisions preserved.',data:{id:existing.id,governancePublicId:captured.publicId,lifecycleStatus:lifecycle,hardDeleted:false}})
  } catch(error) {
    const status=Number(error.statusCode||error.status||500)
    if(status>=500) console.error('Governed question retirement failed:',error)
    res.status(status).json({success:false,code:error.code||'QUESTION_RETIRE_FAILED',message:error.message||'Failed to retire question'})
  }
})

// ─── 6. Bulk Add / Approve AI Imported Questions ──────────────────────────────
router.post('/import/approve', canManageQuestionBank, async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { questions, importJobId } = req.body
    const userId = req.user?.id || null

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions provided' })
    }

    const client = await require('../config/database').pool.connect()
    try {
      await client.query('BEGIN')
      await applyTenantContext(client)

      const insertedQuestions = []
      
      for (const q of questions) {
        const id = generateId()
        const result = await client.query(
          `INSERT INTO question_bank (
            id, school_id, class_level, subject, medium, 
            chapter_no, chapter_name, question_type, 
            question_text, question_text_urdu, options, answer, marks, 
            source_type, source_file_id, is_approved, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          ) RETURNING *`,
          [
            id, schoolId, q.class_level || q.classLevel, q.subject, q.medium || 'english',
            q.chapter_no || q.chapterNo, q.chapter_name || q.chapterName || q.chapter, q.question_type || q.type,
            q.question_text || q.en || q.text, q.question_text_urdu || q.ur || q.textUrdu, 
            JSON.stringify(q.options || []), q.answer, q.marks || 1,
            'ai_import', importJobId, true, userId
          ]
        )
        insertedQuestions.push(result.rows[0])
      }

      if (importJobId) {
        await client.query(
          `UPDATE question_bank_imports 
           SET questions_approved = questions_approved + $1, status = 'completed', updated_at = NOW() 
           WHERE id = $2 AND school_id = $3`,
          [insertedQuestions.length, importJobId, schoolId]
        )
      }

      await client.query('COMMIT')
      res.status(201).json({ success: true, count: insertedQuestions.length, data: insertedQuestions })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error approving imported questions:', error)
    res.status(500).json({ success: false, message: 'Failed to approve questions' })
  }
})

// ─── 7. Get Filter Options (Subjects, Chapters, Topics) ───────────────────────
router.get('/filters/metadata', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    
    // Get unique subjects
    const subjectsRes = await query(
      `SELECT DISTINCT subject FROM question_bank WHERE school_id = $1 AND subject IS NOT NULL ORDER BY subject`,
      [schoolId]
    )
    
    // Get unique classes
    const classesRes = await query(
      `SELECT DISTINCT class_level FROM question_bank WHERE school_id = $1 AND class_level IS NOT NULL ORDER BY class_level`,
      [schoolId]
    )

    res.json({
      success: true,
      data: {
        subjects: subjectsRes.rows.map(r => r.subject),
        classes: classesRes.rows.map(r => r.class_level)
      }
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch metadata' })
  }
})

router.get('/filters/chapters', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { subject, classLevel } = req.query
    
    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required' })

    let sql = `SELECT DISTINCT chapter_name FROM question_bank WHERE school_id = $1 AND subject = $2 AND chapter_name IS NOT NULL`
    const params = [schoolId, subject]
    
    if (classLevel) {
      sql += ` AND class_level = $3`
      params.push(classLevel)
    }
    
    sql += ` ORDER BY chapter_name`
    
    const result = await query(sql, params)
    
    res.json({
      success: true,
      data: result.rows.map(r => r.chapter_name)
    })
  } catch (error) {
    console.error('Error fetching chapters:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch chapters' })
  }
})

// ─── 8. Parse Bulk Text into Questions ────────────────────────────────────────
const { parseBulkText } = require('../services/ai/questionClassifier')

router.post('/parse-text', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { text } = req.body
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' })
    }
    
    const parsedQuestions = parseBulkText(text)
    
    res.json({
      success: true,
      data: parsedQuestions
    })
  } catch (error) {
    console.error('Error parsing text:', error)
    res.status(500).json({ success: false, message: 'Failed to parse text' })
  }
})

module.exports = router
