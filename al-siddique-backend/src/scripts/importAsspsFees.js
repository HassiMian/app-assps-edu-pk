const fs = require('fs')
const path = require('path')
const { pool } = require('../config/database')

const SOURCE_NAME = 'Fee Lists.pdf'
const DEFAULT_SESSION = '2026-2027'
const DEFAULT_CLASS_FEES = [
  ['Starter', 2500],
  ['Mover', 2500],
  ['Flyer', 2500],
  ['One', 2500],
  ['Two', 2500],
  ['Three', 2500],
  ['Four', 2500],
  ['Five', 2500],
  ['Six', 2800],
  ['Seven', 2800],
  ['Eight', 2800],
  ['Pre Nine', 3000],
  ['Hifaz Class', 2500],
]

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function digits(value) {
  return String(value || '').replace(/\D/g, '')
}

function money(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function hasFinancialValues(record) {
  return ['monthly_fee', 'discount', 'previous_arrears', 'gross_total', 'paid', 'remaining']
    .some((key) => record[key] !== null && record[key] !== undefined && record[key] !== '')
}

function classifyStatus(paid, remaining) {
  if (remaining <= 0 && paid > 0) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

function buildStudentIndex(students) {
  return students.map((student) => ({
    ...student,
    name_key: normalize(student.name),
    father_key: normalize(student.father_name),
    class_key: normalize(student.class),
    section_key: normalize(student.section),
    family_key: normalize(student.family_code),
    phone_key: digits(student.parent_phone || student.father_contact || student.phone),
    gr_key: normalize(student.gr_number),
  }))
}

function scoreMatch(record, student) {
  let score = 0
  if (normalize(record.student_name) === student.name_key) score += 40
  if (normalize(record.father_name) === student.father_key) score += 35
  if (normalize(record.class) === student.class_key) score += 15
  if (normalize(record.section) === student.section_key) score += 10
  if (record.family_code && normalize(record.family_code) === student.family_key) score += 20
  if (record.father_contact && digits(record.father_contact) && digits(record.father_contact) === student.phone_key) score += 15
  if (record.reporting_no && digits(record.reporting_no) && digits(record.reporting_no) === student.phone_key) score += 10
  if (record.gr_no && normalize(record.gr_no) === student.gr_key) score += 25
  return score
}

function findMatch(record, students) {
  const candidates = students
    .map((student) => ({ student, score: scoreMatch(record, student) }))
    .filter((item) => item.score >= 90)
    .sort((a, b) => b.score - a.score)

  if (!candidates.length) return { status: 'unmatched', candidates: [] }
  const best = candidates[0]
  const ties = candidates.filter((item) => item.score === best.score)
  if (ties.length > 1) return { status: 'ambiguous', candidates: ties.slice(0, 5) }
  return { status: 'matched', student: best.student, score: best.score }
}

async function ensureSchema(client) {
  await client.query(`
    ALTER TABLE fee_challans
      ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS previous_arrears DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gross_total DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS discount_package_id INTEGER,
      ADD COLUMN IF NOT EXISTS discount_label VARCHAR(150),
      ADD COLUMN IF NOT EXISTS fee_source VARCHAR(80),
      ADD COLUMN IF NOT EXISTS source_serial INTEGER,
      ADD COLUMN IF NOT EXISTS migration_batch VARCHAR(80);

    CREATE TABLE IF NOT EXISTS fee_class_settings (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) DEFAULT 1,
      class_name VARCHAR(100) NOT NULL,
      session VARCHAR(20) DEFAULT '2026-2027',
      monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(school_id, class_name, session)
    );

    CREATE TABLE IF NOT EXISTS fee_discount_packages (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) DEFAULT 1,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_sibling_count INTEGER NOT NULL DEFAULT 1,
      applicable_classes JSONB DEFAULT '[]'::jsonb,
      applicable_sessions JSONB DEFAULT '[]'::jsonb,
      active BOOLEAN DEFAULT true,
      auto_apply BOOLEAN DEFAULT true,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(school_id, name)
    );

    CREATE TABLE IF NOT EXISTS fee_discount_applications (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) DEFAULT 1,
      challan_id INTEGER REFERENCES fee_challans(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      package_id INTEGER REFERENCES fee_discount_packages(id),
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      reason TEXT,
      applied_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(challan_id, package_id)
    );

    CREATE INDEX IF NOT EXISTS idx_fee_challans_source_serial ON fee_challans(fee_source, source_serial);
    CREATE INDEX IF NOT EXISTS idx_fee_challans_migration_batch ON fee_challans(migration_batch);
  `)

  for (const [className, fee] of DEFAULT_CLASS_FEES) {
    await client.query(`
      INSERT INTO fee_class_settings (school_id, class_name, session, monthly_fee, active)
      VALUES (1, $1, $2, $3, true)
      ON CONFLICT (school_id, class_name, session)
      DO UPDATE SET monthly_fee = EXCLUDED.monthly_fee, active = true, updated_at = NOW()
    `, [className, DEFAULT_SESSION, fee])
  }

  await client.query(`
    INSERT INTO fee_discount_packages (
      school_id, name, description, discount_type, discount_value, min_sibling_count,
      applicable_classes, applicable_sessions, active, auto_apply
    )
    VALUES (
      1,
      'Triple Star Discount Package',
      'Automatically applies when a family has 3 or more active enrolled children.',
      'percentage',
      10,
      3,
      '[]'::jsonb,
      '["2026-2027"]'::jsonb,
      true,
      true
    )
    ON CONFLICT (school_id, name)
    DO UPDATE SET
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      min_sibling_count = EXCLUDED.min_sibling_count,
      active = true,
      auto_apply = true,
      updated_at = NOW()
  `)
}

async function backupTables(client, batch) {
  await client.query('CREATE SCHEMA IF NOT EXISTS migration_backups')
  const stamp = batch.replace(/[^a-zA-Z0-9_]/g, '_')
  for (const table of ['fee_challans', 'fee_class_settings', 'fee_discount_packages', 'fee_discount_applications']) {
    await client.query(`CREATE TABLE IF NOT EXISTS migration_backups.${table}_${stamp} AS TABLE ${table}`)
  }
}

async function main() {
  const input = process.argv[2]
  const dryRun = process.argv.includes('--dry-run')
  if (!input) {
    throw new Error('Usage: node scripts/importAsspsFees.js <assps_fee_lists.json> [--dry-run]')
  }

  const payload = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'))
  const batch = `assps_fee_pdf_${payload.year}${String(new Date(`${payload.challan_month} 1, ${payload.year}`).getMonth() + 1).padStart(2, '0')}_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  const client = await pool.connect()
  const report = {
    batch,
    dryRun,
    source: payload.source_pdf,
    month: payload.challan_month,
    year: payload.year,
    session: payload.session || DEFAULT_SESSION,
    extractedRecords: payload.records.length,
    financialRecords: payload.records.filter(hasFinancialValues).length,
    matchedRecords: 0,
    matchedFinancialRecords: 0,
    insertedChallans: 0,
    skippedNoFinancialValues: [],
    duplicates: [],
    unmatched: [],
    ambiguous: [],
    conflicts: [],
    totals: {
      monthly_fee: 0,
      discount: 0,
      previous_arrears: 0,
      gross_total: 0,
      paid: 0,
      remaining: 0,
    },
    pdfTotals: payload.totals || {},
    classWise: {},
    defaultFeeSettingsConfigured: DEFAULT_CLASS_FEES,
    discountPackageConfigured: 'Triple Star Discount Package',
  }

  try {
    await client.query('BEGIN')
    await ensureSchema(client)
    await backupTables(client, batch)

    const studentsResult = await client.query(`
      SELECT id, name, father_name, class, section, family_code, parent_phone, father_cnic, parent_user_id, gr_number
      FROM students
      WHERE COALESCE(is_active, true) = true AND COALESCE(school_id, 1) = 1
    `)
    const students = buildStudentIndex(studentsResult.rows)

    for (const record of payload.records) {
      const match = findMatch(record, students)
      const financial = hasFinancialValues(record)
      if (match.status === 'unmatched') {
        report.unmatched.push(record)
        continue
      }
      if (match.status === 'ambiguous') {
        report.ambiguous.push({
          record,
          candidates: match.candidates.map(({ student, score }) => ({ id: student.id, name: student.name, father_name: student.father_name, class: student.class, section: student.section, score })),
        })
        continue
      }

      report.matchedRecords += 1
      if (!financial) {
        report.skippedNoFinancialValues.push({ sr_no: record.sr_no, student_id: match.student.id, student_name: record.student_name })
        continue
      }
      report.matchedFinancialRecords += 1

      const existing = await client.query(`
        SELECT id, migration_batch, fee_source
        FROM fee_challans
        WHERE student_id = $1 AND month = $2 AND year = $3
        LIMIT 1
      `, [match.student.id, payload.challan_month, payload.year])

      if (existing.rows.length) {
        const current = existing.rows[0]
        if (current.fee_source === SOURCE_NAME) {
          report.duplicates.push({ sr_no: record.sr_no, student_id: match.student.id, existing_challan_id: current.id })
        } else {
          report.conflicts.push({ sr_no: record.sr_no, student_id: match.student.id, existing_challan_id: current.id, fee_source: current.fee_source })
        }
        continue
      }

      const monthlyFee = money(record.monthly_fee)
      const discount = money(record.discount)
      const previousArrears = money(record.previous_arrears)
      const grossTotal = money(record.gross_total)
      const paid = money(record.paid)
      const remaining = money(record.remaining)
      const status = classifyStatus(paid, remaining)
      const challanNo = `ASSPS-202608-${String(record.sr_no).padStart(3, '0')}`

      const insert = await client.query(`
        INSERT INTO fee_challans (
          school_id, challan_no, student_id, month, year, amount, paid_amount, discount, status,
          monthly_fee, previous_arrears, gross_total, remaining_balance,
          fee_source, source_serial, migration_batch, created_by
        )
        VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id
      `, [
        challanNo,
        match.student.id,
        payload.challan_month,
        payload.year,
        grossTotal,
        paid,
        discount,
        status,
        monthlyFee,
        previousArrears,
        grossTotal,
        remaining,
        SOURCE_NAME,
        record.sr_no,
        batch,
        null,
      ])

      report.insertedChallans += 1
      report.totals.monthly_fee += monthlyFee
      report.totals.discount += discount
      report.totals.previous_arrears += previousArrears
      report.totals.gross_total += grossTotal
      report.totals.paid += paid
      report.totals.remaining += remaining
      const key = `${record.class} / ${record.section}`
      report.classWise[key] = report.classWise[key] || { records: 0, monthly_fee: 0, previous_arrears: 0, gross_total: 0, paid: 0, remaining: 0 }
      report.classWise[key].records += 1
      report.classWise[key].monthly_fee += monthlyFee
      report.classWise[key].previous_arrears += previousArrears
      report.classWise[key].gross_total += grossTotal
      report.classWise[key].paid += paid
      report.classWise[key].remaining += remaining

      void insert
    }

    if (report.unmatched.length || report.ambiguous.length || report.conflicts.length) {
      throw new Error(`Migration blocked: unmatched=${report.unmatched.length}, ambiguous=${report.ambiguous.length}, conflicts=${report.conflicts.length}`)
    }

    const pdfTotals = payload.totals || {}
    for (const key of ['monthly_fee', 'discount', 'previous_arrears', 'gross_total', 'paid', 'remaining']) {
      if (money(pdfTotals[key]) !== report.totals[key]) {
        throw new Error(`Financial reconciliation failed for ${key}: pdf=${pdfTotals[key]} inserted=${report.totals[key]}`)
      }
    }

    if (dryRun) {
      await client.query('ROLLBACK')
    } else {
      await client.query('COMMIT')
    }

    const outputDir = path.resolve(process.cwd(), 'migration-output')
    fs.mkdirSync(outputDir, { recursive: true })
    const reportPath = path.join(outputDir, `${batch}_fee_report.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ success: true, dryRun, reportPath, ...report }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    const outputDir = path.resolve(process.cwd(), 'migration-output')
    fs.mkdirSync(outputDir, { recursive: true })
    const reportPath = path.join(outputDir, `${batch}_fee_report_failed.json`)
    fs.writeFileSync(reportPath, JSON.stringify({ ...report, error: error.message }, null, 2))
    console.error(JSON.stringify({ success: false, error: error.message, reportPath, report }, null, 2))
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
