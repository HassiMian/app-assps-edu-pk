const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canRead = requireRoles('super_admin', 'admin', 'principal', 'school_admin', 'teacher', 'accountant')
const canManage = requireRoles('super_admin', 'admin', 'principal', 'school_admin', 'teacher')
const CATEGORIES = new Set(['Textbook', 'Reference', 'Fiction', 'Non-fiction'])

let schemaReady = null
async function ensureSchema() {
  if (schemaReady) return true
  const result = await query("SELECT to_regclass('public.library_books') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('library_books schema migration is not applied.')
    err.code = 'DOMAIN_SCHEMA_NOT_READY'
    throw err
  }
  schemaReady = true
  return true
}

function normalize(body = {}) {
  const title = String(body.title || '').trim().slice(0, 220)
  const author = String(body.author || '').trim().slice(0, 180)
  const category = String(body.category || '').trim()
  const available = body.available !== false
  const errors = []
  if (!title) errors.push('Book title is required.')
  if (!author) errors.push('Author is required.')
  if (!CATEGORIES.has(category)) errors.push('Invalid book category.')
  return { errors, value: { title, author, category, available } }
}

router.get('/', protect, canRead, async (req, res) => {
  try {
    await ensureSchema()
    const result = await query(`SELECT id, title, author, category, available, created_at, updated_at FROM library_books WHERE school_id=$1 ORDER BY title, id`, [currentSchoolId(req)])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Library list error:', err.message)
    res.status(err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 'Library storage is not initialized.' : 'Library inventory could not be loaded.' })
  }
})

router.post('/', protect, canManage, async (req, res) => {
  const parsed = normalize(req.body)
  if (parsed.errors.length) return res.status(422).json({ success: false, message: 'Book validation failed.', fieldErrors: parsed.errors })
  try {
    await ensureSchema()
    const { title, author, category, available } = parsed.value
    const result = await query(`INSERT INTO library_books (school_id, title, author, category, available, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, author, category, available, created_at, updated_at`, [currentSchoolId(req), title, author, category, available, req.user?.id || null])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Library create error:', err.message)
    res.status(err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 'Library storage is not initialized.' : 'Book could not be saved.' })
  }
})

router.put('/:id', protect, canManage, async (req, res) => {
  const parsed = normalize(req.body)
  if (parsed.errors.length) return res.status(422).json({ success: false, message: 'Book validation failed.', fieldErrors: parsed.errors })
  try {
    await ensureSchema()
    const { title, author, category, available } = parsed.value
    const result = await query(`UPDATE library_books SET title=$1, author=$2, category=$3, available=$4, updated_at=NOW() WHERE id=$5 AND school_id=$6 RETURNING id, title, author, category, available, created_at, updated_at`, [title, author, category, available, Number(req.params.id), currentSchoolId(req)])
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Book not found.' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Library update error:', err.message)
    res.status(err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 'Library storage is not initialized.' : 'Book could not be updated.' })
  }
})

module.exports = router
