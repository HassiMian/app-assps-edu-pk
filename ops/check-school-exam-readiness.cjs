/**
 * ASSPS high-school daily-paper Question Bank readiness, tenant scoped.
 * Read-only. Never counts unapproved, duplicate, other-tenant or unmapped
 * questions as automatic paper inventory. Manual authoring remains independent.
 */

const CLASS_LEVELS = ['9th', '10th']
const BASIC_RECIPE = Object.freeze({ mcq: 5, short: 5, long: 1 })
const SCHOOL_CODE_PATTERN = /^[a-z][a-z0-9_-]{1,60}$/
// Content flagged provisional is NEVER eligible, even if a later metadata
// import accidentally flips is_approved. Only reviewed, tenant-local inventory
// can contribute to automatic paper generation readiness.
const GOVERNED_ELIGIBILITY_SQL = `is_approved IS TRUE AND is_duplicate IS NOT TRUE
  AND coalesce(metadata->>'provisional_internal','false') <> 'true'
  AND metadata->>'review_state' = 'academic_verified'
  AND NULLIF(trim(question_text), '') IS NOT NULL
  AND NULLIF(trim(source_file_id), '') IS NOT NULL
  AND source_page_no IS NOT NULL AND source_page_no > 0
  AND coalesce(metadata->>'source_pdf_sha256','') ~ '^[0-9a-fA-F]{64}$'`

function chapterStatus(row, recipe = BASIC_RECIPE) {
  const eligible = {
    mcq: Number(row.mcq_approved || 0),
    short: Number(row.short_approved || 0),
    long: Number(row.long_approved || 0),
  }
  const missing = Object.fromEntries(
    Object.entries(recipe).map(([kind, needed]) =>
      [kind, Math.max(0, needed - eligible[kind])]),
  )
  const mapped = String(row.chapter_no || '').trim().length > 0
  return {
    grade: row.class_level,
    subject: row.subject,
    chapter: row.chapter_no || 'UNMAPPED',
    discovered: Number(row.discovered || 0),
    approved: Number(row.approved || 0),
    eligible,
    needsSourcePageReview: Number(row.missing_source_page || 0),
    missing,
    ready: mapped && Object.values(missing).every(count => count === 0),
  }
}

function mcqAnswerSkew(rows = []) {
  const counts = Object.fromEntries(rows.map(row => [String(row.label || 'UNKNOWN').toUpperCase(),Number(row.count || 0)]))
  const total = Object.values(counts).reduce((sum,n)=>sum+n,0)
  const [dominantLabel,dominantCount] = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])[0] || [null,0]
  const dominantShare = total ? Number((dominantCount/total).toFixed(4)) : null
  return {total,byOption:counts,dominantLabel,dominantShare,
    editorialReviewFlag:total>=20 && dominantShare>0.8}
}

function aggregateStatus(chapters = []) {
  return {
    inspectedChapters: chapters.length,
    readyChapters: chapters.filter(x => x.ready).length,
    approvedQuestions: chapters.reduce((sum, x) => sum + x.approved, 0),
    discoveredQuestions: chapters.reduce((sum, x) => sum + x.discovered, 0),
    coverageReady: chapters.length > 0 && chapters.every(x => x.ready),
  }
}

async function inspectTenant({schoolId, schoolCode}) {
  if (!Number.isInteger(schoolId) || schoolId < 1)
    throw Error('Explicit positive --school-id is required')
  if (!SCHOOL_CODE_PATTERN.test(schoolCode || ''))
    throw Error('Explicit valid --school-code is required')
  if (process.env.DB_RUNTIME_ROLE !== 'apex_app_runtime')
    throw Error('Strict restricted DB_RUNTIME_ROLE=apex_app_runtime is required')
  const { pool, tenantContext } = require('../al-siddique-backend/src/config/database')

  return tenantContext.run({
    rlsEnabled: true, isSuperAdmin: false, tenantId: schoolId, tenantKey: schoolCode,
  }, async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN READ ONLY')
      const db = (await client.query('SELECT current_database() AS database, current_user AS role')).rows[0]
      if (db.role !== 'apex_app_runtime') throw Error('Effective DB role was not restricted')
      const school = (await client.query(
        'SELECT id, code FROM schools WHERE id=$1', [schoolId])).rows[0]
      if (!school || school.code !== schoolCode)
        throw Error('School identity mismatch; refusing to inspect another tenant')

      const sql = `
        SELECT class_level, subject, NULLIF(trim(chapter_no), '') AS chapter_no,
               count(*) AS discovered,
               count(*) FILTER (
                 WHERE ${GOVERNED_ELIGIBILITY_SQL}
               ) AS approved,
               count(*) FILTER (
                 WHERE ${GOVERNED_ELIGIBILITY_SQL}
                   AND question_type='mcq'
                   AND correct_option IS NOT NULL
                   AND CASE WHEN jsonb_typeof(options)='array'
                       THEN jsonb_array_length(options)>=4 ELSE false END
               ) AS mcq_approved,
               count(*) FILTER (
                 WHERE ${GOVERNED_ELIGIBILITY_SQL}
                   AND question_type='short'
               ) AS short_approved,
               count(*) FILTER (
                 WHERE ${GOVERNED_ELIGIBILITY_SQL}
                   AND question_type='long'
               ) AS long_approved,
               count(*) FILTER (WHERE source_page_no IS NULL) AS missing_source_page
          FROM question_bank
         WHERE school_id=$1 AND class_level=ANY($2::text[])
         GROUP BY class_level, subject, NULLIF(trim(chapter_no), '')
         ORDER BY class_level, subject, chapter_no
      `
      const rows = (await client.query(sql, [schoolId, CLASS_LEVELS])).rows
      const optionCounts = (await client.query(
        `SELECT upper(trim(correct_option)) AS label, count(*) AS count
           FROM question_bank WHERE school_id=$1
             AND class_level=ANY($2::text[]) AND question_type='mcq'
           GROUP BY upper(trim(correct_option)) ORDER BY count DESC`,
        [schoolId, CLASS_LEVELS])).rows
      await client.query('COMMIT')
      const chapters = rows.map(row => chapterStatus(row))
      return {
        schoolId, schoolCode, database: db.database, role: db.role,
        grades: CLASS_LEVELS, samplePaperRecipe: BASIC_RECIPE,
        ...aggregateStatus(chapters),
        mcqAnswerKeys: mcqAnswerSkew(optionCounts),
        chapters,
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      await client.release()
    }
  })
}

async function main() {
  const args = process.argv.slice(2)
  const value = key => args[args.indexOf(key) + 1]
  if (!args.includes('--school-id') || !args.includes('--school-code'))
    throw Error('Usage: --school-id NUMBER --school-code CODE')
  const schoolId = Number(value('--school-id'))
  const schoolCode = value('--school-code')
  const report = await inspectTenant({schoolId,schoolCode})
  console.log(JSON.stringify(report,null,2))
  if (!report.coverageReady) process.exitCode = 2
}
if (require.main === module) {
  main().catch(e => { console.error('EXAM_READINESS_GATE_FAIL', e.message); process.exitCode=2 })
    .finally(async () => {
      const { pool } = require('../al-siddique-backend/src/config/database')
      await pool.end()
    })
}
module.exports = { BASIC_RECIPE, CLASS_LEVELS, GOVERNED_ELIGIBILITY_SQL, chapterStatus, aggregateStatus, mcqAnswerSkew, inspectTenant }
