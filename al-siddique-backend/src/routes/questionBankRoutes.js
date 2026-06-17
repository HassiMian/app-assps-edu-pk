// src/routes/questionBankRoutes.js
// Al Siddique Smart School OS - Question Bank API

const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canUseQuestionBank = requireRoles('super_admin', 'admin', 'principal', 'teacher')

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
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── 1. Get List of Questions (with filters) ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { subject, classLevel, chapter, type, difficulty, approved, limit = 50, offset = 0 } = req.query

    let sql = `SELECT * FROM question_bank WHERE school_id = $1`
    const params = [schoolId]
    let paramCount = 1

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
    if (approved !== undefined) {
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

    const result = await query(
      `SELECT * FROM question_bank WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
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

// ─── 3. Add Single Question (Manual Entry) ────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const data = req.body
    const id = generateId()
    const userId = req.user?.id || null

    const result = await query(
      `INSERT INTO question_bank (
        id, school_id, class_level, subject, medium, board, 
        chapter_no, chapter_name, topic_name, question_type, 
        question_text, question_text_urdu, options, correct_option, 
        answer, explanation, marks, difficulty, priority, 
        is_approved, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        id, schoolId, data.class_level, data.subject, data.medium || 'english', data.board || 'Punjab Board',
        data.chapter_no, data.chapter_name, data.topic_name, data.question_type,
        data.question_text, data.question_text_urdu, JSON.stringify(data.options || []), data.correct_option,
        data.answer, data.explanation, data.marks || 1, data.difficulty || 'medium', data.priority || 'exercise',
        data.is_approved !== undefined ? data.is_approved : true, userId
      ]
    )

    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error adding question:', error)
    res.status(500).json({ success: false, message: 'Failed to add question' })
  }
})

// ─── 4. Edit Question ─────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { id } = req.params
    const data = req.body

    const result = await query(
      `UPDATE question_bank SET 
        class_level = COALESCE($1, class_level),
        subject = COALESCE($2, subject),
        medium = COALESCE($3, medium),
        chapter_no = COALESCE($4, chapter_no),
        chapter_name = COALESCE($5, chapter_name),
        topic_name = COALESCE($6, topic_name),
        question_type = COALESCE($7, question_type),
        question_text = COALESCE($8, question_text),
        question_text_urdu = COALESCE($9, question_text_urdu),
        options = COALESCE($10, options),
        correct_option = COALESCE($11, correct_option),
        answer = COALESCE($12, answer),
        marks = COALESCE($13, marks),
        difficulty = COALESCE($14, difficulty),
        priority = COALESCE($15, priority),
        is_approved = COALESCE($16, is_approved),
        updated_at = NOW()
      WHERE id = $17 AND school_id = $18
      RETURNING *`,
      [
        data.class_level, data.subject, data.medium,
        data.chapter_no, data.chapter_name, data.topic_name, data.question_type,
        data.question_text, data.question_text_urdu, 
        data.options ? JSON.stringify(data.options) : null, 
        data.correct_option, data.answer, data.marks, data.difficulty, 
        data.priority, data.is_approved,
        id, schoolId
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found or no permission' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error updating question:', error)
    res.status(500).json({ success: false, message: 'Failed to update question' })
  }
})

// ─── 5. Delete Question ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const schoolId = requireSchoolContext(req, res)
    if (!schoolId) return
    const { id } = req.params

    const result = await query(
      `DELETE FROM question_bank WHERE id = $1 AND school_id = $2 RETURNING id`,
      [id, schoolId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Question not found or no permission' })
    }

    res.json({ success: true, message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Error deleting question:', error)
    res.status(500).json({ success: false, message: 'Failed to delete question' })
  }
})

// ─── 6. Bulk Add / Approve AI Imported Questions ──────────────────────────────
router.post('/import/approve', async (req, res) => {
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
