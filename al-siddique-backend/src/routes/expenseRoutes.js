const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canManageExpenses = requireRoles('super_admin', 'admin', 'principal', 'accountant', 'school_admin')

let schemaReady = null
function ensureExpenseSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id BIGSERIAL PRIMARY KEY,
          school_id INTEGER NOT NULL REFERENCES schools(id),
          category VARCHAR(80) NOT NULL,
          description TEXT NOT NULL,
          amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
          expense_date DATE NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await query('CREATE INDEX IF NOT EXISTS idx_expenses_school_date ON expenses (school_id, expense_date DESC)')
    })().catch(err => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
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
    res.status(500).json({ success: false, message: 'Expenses could not be loaded.' })
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
    res.status(500).json({ success: false, message: 'Expense could not be saved.' })
  }
})

module.exports = router
