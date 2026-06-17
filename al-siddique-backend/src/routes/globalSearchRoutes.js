const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

router.get('/', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const { q } = req.query

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] })
    }

    const searchQuery = `%${q}%`
    const exactSearch = q.toLowerCase()
    
    // Arrays for parallel querying
    const promises = []
    const results = []

    // 1. Search Students
    promises.push(
      query(`
        SELECT id, name, gr_number, class as detail, 'student' as type
        FROM students 
        WHERE school_id = $1 AND is_active = true 
          AND (name ILIKE $2 OR gr_number ILIKE $2 OR father_name ILIKE $2)
        LIMIT 5
      `, [schoolId, searchQuery]).then(res => {
        res.rows.forEach(r => results.push({
          id: `student_${r.id}`,
          title: r.name,
          subtitle: `GR: ${r.gr_number} | Class: ${r.detail}`,
          type: 'student',
          url: `/teacher/students/${r.id}` // Defaulting to teacher route, adapt in UI
        }))
      })
    )

    // 2. Search Challans
    promises.push(
      query(`
        SELECT c.id, c.challan_no, c.month, c.year, c.status, s.name as student_name
        FROM fee_challans c
        JOIN students s ON c.student_id = s.id
        WHERE c.school_id = $1 
          AND (c.challan_no ILIKE $2 OR s.name ILIKE $2)
        LIMIT 5
      `, [schoolId, searchQuery]).then(res => {
        res.rows.forEach(r => results.push({
          id: `challan_${r.id}`,
          title: `Challan: ${r.challan_no}`,
          subtitle: `${r.student_name} | ${r.month} ${r.year} | Status: ${r.status}`,
          type: 'challan',
          url: `/accountant/fee-challan`
        }))
      })
    )

    // 3. Search Question Bank
    promises.push(
      query(`
        SELECT id, question_text, subject, class_level, chapter_name
        FROM question_bank
        WHERE school_id = $1 
          AND (question_text ILIKE $2 OR chapter_name ILIKE $2)
        LIMIT 5
      `, [schoolId, searchQuery]).then(res => {
        res.rows.forEach(r => results.push({
          id: `qbank_${r.id}`,
          title: r.question_text.length > 50 ? r.question_text.substring(0, 50) + '...' : r.question_text,
          subtitle: `${r.subject} | Class ${r.class_level} | ${r.chapter_name || ''}`,
          type: 'question',
          url: `/teacher/paper-generator`
        }))
      })
    )

    // Smart intents
    if (exactSearch.includes('paper') || exactSearch.includes('exam')) {
      results.push({
        id: 'action_paper_gen',
        title: 'Open Paper Generator',
        subtitle: 'Create a new exam or assignment',
        type: 'action',
        url: '/teacher/paper-generator'
      })
    }
    
    if (exactSearch.includes('fee') || exactSearch.includes('challan')) {
      results.push({
        id: 'action_fee_gen',
        title: 'Generate Fee Challan',
        subtitle: 'Create a new fee slip for a student',
        type: 'action',
        url: '/accountant/fee-challan'
      })
    }

    await Promise.allSettled(promises)

    res.json({ success: true, data: results })
  } catch (error) {
    console.error('Global search error:', error)
    res.status(500).json({ success: false, message: 'Search failed' })
  }
})

module.exports = router
