const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { tenantClause } = require('../middleware/tenant')

const canViewAnalytics = requireRoles('super_admin', 'admin', 'principal')

function normalizeRange(value) {
  const map = { '7d': 7, '30d': 30, '90d': 90 }
  return map[String(value || '').toLowerCase()] || 30
}

router.get('/', protect, canViewAnalytics, async (req, res) => {
  try {
    const days = normalizeRange(req.query.range)
    const tStudents = await tenantClause(req, { table: 'students', alias: 's', paramIndex: 1 })
    const tExams = await tenantClause(req, { table: 'exams', alias: 'e', paramIndex: tStudents.nextIndex })
    const params = [...tStudents.params, ...tExams.params]
    const tenantFilters = `${tStudents.clause} ${tExams.clause.replace('WHERE', 'AND')}`

    const subjectSql = `
      SELECT er.subject,
             ROUND(AVG((er.marks_obtained::numeric / NULLIF(er.total_marks::numeric, 0)) * 100))::int AS average
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.total_marks > 0
        AND COALESCE(e.created_at, NOW()) >= NOW() - INTERVAL '${days} days'
        ${tenantFilters}
      GROUP BY er.subject
      ORDER BY average DESC, er.subject
      LIMIT 12
    `

    const classSql = `
      SELECT s.class AS class_name,
             ROUND(AVG((er.marks_obtained::numeric / NULLIF(er.total_marks::numeric, 0)) * 100))::int AS average,
             COUNT(DISTINCT er.student_id)::int AS student_count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.total_marks > 0
        AND COALESCE(e.created_at, NOW()) >= NOW() - INTERVAL '${days} days'
        ${tenantFilters}
      GROUP BY s.class
      ORDER BY s.class
      LIMIT 30
    `

    const atRiskSql = `
      SELECT er.subject, COUNT(DISTINCT er.student_id)::int AS count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.total_marks > 0
        AND (er.marks_obtained::numeric / NULLIF(er.total_marks::numeric, 0)) < 0.5
        AND COALESCE(e.created_at, NOW()) >= NOW() - INTERVAL '${days} days'
        ${tenantFilters}
      GROUP BY er.subject
      ORDER BY count DESC
      LIMIT 1
    `

    const topSql = `
      SELECT er.subject, COUNT(DISTINCT er.student_id)::int AS count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.total_marks > 0
        AND (er.marks_obtained::numeric / NULLIF(er.total_marks::numeric, 0)) >= 0.85
        AND COALESCE(e.created_at, NOW()) >= NOW() - INTERVAL '${days} days'
        ${tenantFilters}
      GROUP BY er.subject
      ORDER BY count DESC
      LIMIT 1
    `

    const [subjectRes, classRes, atRiskRes, topRes] = await Promise.all([
      query(subjectSql, params),
      query(classSql, params),
      query(atRiskSql, params),
      query(topSql, params),
    ])

    const insights = []
    if (atRiskRes.rows[0]) {
      insights.push({
        id: 'risk-results', type: 'risk', title: 'At-Risk Students Detected',
        description: `Students scoring below 50% were detected in ${atRiskRes.rows[0].subject}.`,
        studentCount: atRiskRes.rows[0].count, severity: 'high', subject: atRiskRes.rows[0].subject,
      })
    }
    if (topRes.rows[0]) {
      insights.push({
        id: 'top-results', type: 'performance', title: 'Top Performers Cluster',
        description: `Students scoring 85% or above were detected in ${topRes.rows[0].subject}.`,
        studentCount: topRes.rows[0].count, severity: 'low', subject: topRes.rows[0].subject,
      })
    }

    res.json({
      success: true,
      source: 'live_database',
      rangeDays: days,
      data: {
        insights,
        subjectPerformance: subjectRes.rows.map(row => ({ subject: row.subject, average: Number(row.average || 0) })),
        classPerformance: classRes.rows.map(row => ({ className: row.class_name, average: Number(row.average || 0), studentCount: Number(row.student_count || 0) })),
      },
    })
  } catch (err) {
    console.error('AI Analytics Error:', err.message)
    res.status(503).json({ success:false, message:'Analytics is temporarily unavailable.', source:'live_database' })
  }
})

module.exports = router
