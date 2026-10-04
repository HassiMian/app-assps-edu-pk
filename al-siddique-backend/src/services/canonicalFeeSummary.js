// src/services/canonicalFeeSummary.js
// AL SIDDIQUE SMART SCHOOL OS — Canonical Fee Summary Service
// Single source of truth for fee collection KPIs across Dashboard and Fee modules

const { query } = require('../config/database')

const KARACHI_TZ = 'Asia/Karachi'

/**
 * Get period details scoped to school timezone (Asia/Karachi)
 */
function getKarachiDateInfo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KARACHI_TZ,
    year: 'numeric',
    month: '2-digit',
    monthName: 'long',
    day: '2-digit',
  }).formatToParts(date)

  const map = {}
  parts.forEach(p => { map[p.type] = p.value })

  // Full month name e.g. "September"
  const monthName = new Intl.DateTimeFormat('en-US', {
    timeZone: KARACHI_TZ,
    month: 'long',
  }).format(date)

  // Short month name e.g. "Sep"
  const monthShort = new Intl.DateTimeFormat('en-US', {
    timeZone: KARACHI_TZ,
    month: 'short',
  }).format(date)

  const year = Number(map.year)
  const monthNum = map.month // "09"
  const period = `${year}-${monthNum}` // "2026-09"
  const day = Number(map.day)

  // Standard academic session (April-March or Aug-July): e.g. 2026-2027
  const sessionStartYear = Number(monthNum) >= 4 ? year : year - 1
  const defaultSession = `${sessionStartYear}-${sessionStartYear + 1}`

  return {
    year,
    monthNum,
    monthName,
    monthShort,
    period,
    day,
    defaultSession,
    timezone: KARACHI_TZ,
  }
}

/**
 * Parse a period string e.g. "2026-09" or "September 2026"
 */
function parsePeriod(periodStr) {
  if (!periodStr || typeof periodStr !== 'string') return null
  const trimmed = periodStr.trim()

  // YYYY-MM
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})$/)
  if (matchIso) {
    const y = Number(matchIso[1])
    const m = matchIso[2]
    const d = new Date(Date.UTC(y, Number(m) - 1, 15))
    const mName = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
    const mShort = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    return { year: y, monthNum: m, monthName: mName, monthShort: mShort, period: trimmed }
  }

  // Month Year e.g. "September 2026"
  const matchNameYear = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/)
  if (matchNameYear) {
    const y = Number(matchNameYear[2])
    const mName = matchNameYear[1]
    const d = new Date(`${mName} 1, ${y} UTC`)
    if (!Number.isNaN(d.getTime())) {
      const mNum = (d.getUTCMonth() + 1).toString().padStart(2, '0')
      const mShort = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      return { year: y, monthNum: mNum, monthName: mName, monthShort: mShort, period: `${y}-${mNum}` }
    }
  }

  return null
}

/**
 * Safe numeric converter
 */
function asNumber(val) {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

/**
 * Calculate canonical fee summary for school, period and session.
 * 
 * Invariants:
 * 1. pendingStudentCount <= activeStudents (counts DISTINCT active students with remaining_balance > 0)
 * 2. pendingChallanCount = count of challan rows with remaining_balance > 0 (each partial challan counted ONCE)
 * 3. collectedAmountPkr = actual sum of paid_amount (includes partial payments, excludes uncollected promises)
 * 4. pendingAmountPkr = sum of actual remaining balances (GREATEST(0, remaining_balance or gross - paid))
 * 5. activeStudentFilter = excludes archived / inactive students
 */
async function getCanonicalFeeSummary({
  schoolId = 1,
  period = null,
  academicSession = null,
  targetDate = new Date(),
} = {}) {
  const karachi = getKarachiDateInfo(targetDate)
  const resolvedPeriod = parsePeriod(period) || karachi
  const session = academicSession || resolvedPeriod.defaultSession || '2026-2027'

  const schoolIdNum = Number(schoolId || 1)

  // Current Month / Scope Aggregates (scoped to active students)
  const currentMonthSql = `
    SELECT
      -- 1. Actual amount collected (cash received)
      COALESCE(SUM(COALESCE(f.paid_amount, 0)), 0) AS collected_amount,

      -- 2. Remaining balance for unpaid/partial challans
      COALESCE(SUM(
        CASE WHEN f.status <> 'paid' THEN
          GREATEST(
            0,
            COALESCE(
              f.remaining_balance,
              COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)
            )
          )
        ELSE 0 END
      ), 0) AS pending_amount,

      -- 3. Total active students with challans in this period
      COUNT(DISTINCT f.student_id) AS total_students_billed,

      -- 4. Distinct active students with remaining balance > 0
      COUNT(DISTINCT CASE 
        WHEN f.status <> 'paid' AND (
          COALESCE(
            f.remaining_balance,
            COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)
          ) > 0
        ) THEN f.student_id 
      END) AS pending_students,

      -- 5. Total challan count in this period
      COUNT(f.id) AS total_challans,

      -- 6. Challans with remaining balance > 0 (each partial counted ONCE)
      COUNT(f.id) FILTER (
        WHERE f.status <> 'paid' AND (
          COALESCE(
            f.remaining_balance,
            COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)
          ) > 0
        )
      ) AS pending_challans,

      -- 7. Partial challans (where some money received but not fully paid)
      COUNT(f.id) FILTER (
        WHERE f.status = 'partial' OR (
          COALESCE(f.paid_amount, 0) > 0 AND f.status <> 'paid'
        )
      ) AS partial_challans,

      -- 8. Overdue challans (due_date past and still outstanding)
      COUNT(f.id) FILTER (
        WHERE f.due_date IS NOT NULL 
          AND f.due_date < CURRENT_DATE 
          AND f.status <> 'paid'
          AND COALESCE(
            f.remaining_balance,
            COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)
          ) > 0
      ) AS overdue_challans

    FROM fee_challans f
    JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
    WHERE f.school_id = $1
      AND s.is_active = true
      AND f.year = $2
      AND (
        f.month ILIKE $3 || '%'
        OR f.month = $4
        OR f.month = $5
      )
      AND (s.academic_session = $6 OR s.academic_session IS NULL)
  `

  const monthParams = [
    schoolIdNum,
    resolvedPeriod.year,
    resolvedPeriod.monthName, // e.g. "September" (prefix match)
    resolvedPeriod.monthNum,  // e.g. "09"
    resolvedPeriod.period,    // e.g. "2026-09"
    session,
  ]

  // All-Time & Session Aggregates (for full transparency and analytics view)
  const sessionAllTimeSql = `
    SELECT
      -- Session totals (for same academic session and active students)
      COALESCE(SUM(CASE WHEN (s.academic_session = $2 OR s.academic_session IS NULL) THEN COALESCE(f.paid_amount, 0) ELSE 0 END), 0) AS session_collected,
      COALESCE(SUM(CASE WHEN (s.academic_session = $2 OR s.academic_session IS NULL) AND f.status <> 'paid' THEN
        GREATEST(0, COALESCE(f.remaining_balance, COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)))
      ELSE 0 END), 0) AS session_pending,

      -- All-time totals across active students
      COALESCE(SUM(COALESCE(f.paid_amount, 0)), 0) AS all_time_collected,
      COALESCE(SUM(CASE WHEN f.status <> 'paid' THEN
        GREATEST(0, COALESCE(f.remaining_balance, COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)))
      ELSE 0 END), 0) AS all_time_pending,

      COUNT(DISTINCT CASE WHEN f.status <> 'paid' AND COALESCE(f.remaining_balance, COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)) > 0 THEN f.student_id END) AS all_time_pending_students,
      COUNT(f.id) FILTER (WHERE f.status <> 'paid' AND COALESCE(f.remaining_balance, COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)) > 0) AS all_time_pending_challans
    FROM fee_challans f
    JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
    WHERE f.school_id = $1
      AND s.is_active = true
  `

  const [monthResult, sessionResult] = await Promise.all([
    query(currentMonthSql, monthParams),
    query(sessionAllTimeSql, [schoolIdNum, session]),
  ])

  const mRow = monthResult.rows[0] || {}
  const sRow = sessionResult.rows[0] || {}

  const collectedAmountPkr = asNumber(mRow.collected_amount)
  const pendingAmountPkr = asNumber(mRow.pending_amount)
  const pendingStudentCount = Number(mRow.pending_students || 0)
  const pendingChallanCount = Number(mRow.pending_challans || 0)
  const partialChallanCount = Number(mRow.partial_challans || 0)
  const overdueChallanCount = Number(mRow.overdue_challans || 0)
  const totalBilledStudents = Number(mRow.total_students_billed || 0)

  const sessionCollectedPkr = asNumber(sRow.session_collected)
  const sessionPendingAmountPkr = asNumber(sRow.session_pending)
  const allTimeCollectedPkr = asNumber(sRow.all_time_collected)
  const allTimePendingAmountPkr = asNumber(sRow.all_time_pending)
  const allTimePendingStudents = Number(sRow.all_time_pending_students || 0)
  const allTimePendingChallans = Number(sRow.all_time_pending_challans || 0)

  return {
    period: resolvedPeriod.period,
    monthName: resolvedPeriod.monthName,
    monthShort: resolvedPeriod.monthShort,
    year: resolvedPeriod.year,
    academicSession: session,
    timezone: KARACHI_TZ,

    // Canonical Current Month KPIs
    collectedAmountPkr,
    pendingAmountPkr,
    pendingStudentCount,
    pendingChallanCount,
    partialChallanCount,
    overdueChallanCount,
    totalBilledStudents,

    // Explicit Session & All-Time Collections (no mixing with monthly card)
    sessionCollectedPkr,
    sessionPendingAmountPkr,
    allTimeCollectedPkr,
    allTimePendingAmountPkr,
    allTimePendingStudents,
    allTimePendingChallans,

    source: 'fee_challans',
    generatedAt: new Date().toISOString(),

    // Deprecated backward-compatible fields (mapped to canonical values to prevent breaking changes)
    collected: collectedAmountPkr,
    pending: pendingAmountPkr,
    unpaid_students: pendingStudentCount, // Fixed: NO LONGER double counts partials
    fee_pending_count: pendingChallanCount, // Fixed: Scoped to current period
    overdue_challans: overdueChallanCount,
    partial_count: partialChallanCount,
  }
}

module.exports = {
  getCanonicalFeeSummary,
  getKarachiDateInfo,
  parsePeriod,
  KARACHI_TZ,
}
