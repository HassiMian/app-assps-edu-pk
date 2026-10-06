const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canManageExpenses = requireRoles('super_admin', 'admin', 'principal', 'accountant', 'school_admin')

let schemaReady = null
async function ensureExpenseSchema() {
  if (schemaReady) return true
  const result = await query("SELECT to_regclass('public.expenses') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('expenses schema migration is not applied.')
    err.code = 'EXPENSE_SCHEMA_NOT_READY'
    throw err
  }
  schemaReady = true
  return true
}

function normalizeExpense(body = {}) {
  const category = String(body.category || '').trim().slice(0, 80)
  const description = String(body.description || '').trim().slice(0, 500)
  const amount = Number(body.amount)
  const expenseDate = String(body.date || body.expense_date || '').trim()
  const errors = []
  if (!category) errors.push('Category is required.')
  if (!description) errors.push('Description is required.')
  if (!Number.isFinite(amount) || amount < 0) errors.push('Amount must be a non-negative number.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) errors.push('A valid expense date is required.')
  return { errors, value: { category, description, amount, expense_date: expenseDate } }
}

router.get('/', protect, async (req, res) => {
  try {
    await ensureExpenseSchema()
    const schoolId = currentSchoolId(req)
    const result = await query(`
      SELECT id, category, description, amount::float AS amount, expense_date AS date, created_at
      FROM expenses
      WHERE school_id = $1
      ORDER BY expense_date DESC, id DESC
      LIMIT 500
    `, [schoolId])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Expense list error:', err.message)
    res.status(err.code === 'EXPENSE_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EXPENSE_SCHEMA_NOT_READY' ? 'Expense storage is not initialized.' : 'Expenses could not be loaded.' })
  }
})

router.post('/', protect, canManageExpenses, async (req, res) => {
  const normalized = normalizeExpense(req.body)
  if (normalized.errors.length) {
    return res.status(422).json({ success: false, code: 'INVALID_EXPENSE', message: 'Expense validation failed.', fieldErrors: normalized.errors })
  }
  try {
    await ensureExpenseSchema()
    const schoolId = currentSchoolId(req)
    const { category, description, amount, expense_date } = normalized.value
    const result = await query(`
      INSERT INTO expenses (school_id, category, description, amount, expense_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, category, description, amount::float AS amount, expense_date AS date, created_at
    `, [schoolId, category, description, amount, expense_date, req.user?.id || null])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Expense create error:', err.message)
    res.status(err.code === 'EXPENSE_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EXPENSE_SCHEMA_NOT_READY' ? 'Expense storage is not initialized.' : 'Expense could not be saved.' })
  }
})

module.exports = router
