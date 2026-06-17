const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { pool } = require('../config/database')

const SCHOOL_ID = Number(process.env.MIGRATION_SCHOOL_ID || 1)
const DRY_RUN = process.argv.includes('--dry-run')
const DEFAULT_PERMISSIONS = [
  'students_view',
  'attendance_mark',
  'attendance_view',
  'exams_marks',
  'exams_results',
  'paper_generator',
  'timetable',
  'datesheet',
  'messages',
  'notifications',
]

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function nullable(value) {
  const next = normalize(value)
  return next ? next : null
}

function digits(value) {
  return normalize(value).replace(/\D/g, '')
}

function sqlDate(value) {
  const next = normalize(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null
}

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"'
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function slug(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40) || 'staff'
}

function staffPassword(record) {
  const first = normalize(record.name).split(' ')[0] || 'Staff'
  return `${first}@${new Date().getFullYear()}`
}

function empId(record) {
  return `EMP-${String(record.sno).padStart(4, '0')}`
}

function username(record) {
  return `T-${String(record.sno).padStart(3, '0')}`
}

function preferredStaffEmail(record) {
  const email = nullable(record.email)
  if (email) return email.toLowerCase()
  return `${slug(record.name)}.${String(record.sno).padStart(3, '0')}@assps.staff`
}

async function uniqueStaffEmail(client, record, currentUserId = null) {
  const preferred = preferredStaffEmail(record)
  const owner = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [preferred])
  if (!owner.rows[0] || (currentUserId && Number(owner.rows[0].id) === Number(currentUserId))) return preferred

  const generated = `${slug(record.name)}.${String(record.sno).padStart(3, '0')}@assps.staff`
  const generatedOwner = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [generated])
  if (!generatedOwner.rows[0] || (currentUserId && Number(generatedOwner.rows[0].id) === Number(currentUserId))) return generated
  return `${slug(record.name)}.${String(record.sno).padStart(3, '0')}.${crypto.randomBytes(2).toString('hex')}@assps.staff`
}

function designationFor(record) {
  const q = normalize(record.qualification).toLowerCase()
  const name = normalize(record.name).toLowerCase()
  if (name.includes('haseeb')) return 'Principal'
  if (q.includes('matric') && name.includes('umar')) return 'Security Guard'
  if (q.includes('matric') && name.includes('riffat')) return 'Support Staff'
  return 'Teacher'
}

async function ensureColumn(client, table, column, definition) {
  await client.query(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN IF NOT EXISTS ${quoteIdent(column)} ${definition}`)
}

async function ensureSchema(client) {
  await client.query('ALTER TABLE employees ALTER COLUMN emp_id TYPE VARCHAR(50)')
  await client.query('ALTER TABLE employees ALTER COLUMN name TYPE VARCHAR(150)')
  await client.query('ALTER TABLE employees ALTER COLUMN department TYPE VARCHAR(100)')
  await client.query('ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(150)')
  await ensureColumn(client, 'users', 'username', 'VARCHAR(100)')
  await ensureColumn(client, 'users', 'permissions', "JSONB DEFAULT '[]'::jsonb")
  await ensureColumn(client, 'users', 'entity_type', 'VARCHAR(30)')
  await ensureColumn(client, 'users', 'entity_id', 'INTEGER')
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(LOWER(username)) WHERE username IS NOT NULL')
  await client.query('CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_type, entity_id)')

  const employeeColumns = [
    ['father_name', 'VARCHAR(150)'],
    ['gender', 'VARCHAR(20)'],
    ['dob', 'DATE'],
    ['blood_group', 'VARCHAR(20)'],
    ['religion', 'VARCHAR(50)'],
    ['photo', 'TEXT'],
    ['cnic', 'VARCHAR(30)'],
    ['marital_status', 'VARCHAR(30)'],
    ['nationality', 'VARCHAR(50)'],
    ['alt_phone', 'VARCHAR(30)'],
    ['address_street', 'TEXT'],
    ['address_city', 'VARCHAR(100)'],
    ['address_tehsil', 'VARCHAR(100)'],
    ['address_district', 'VARCHAR(100)'],
    ['address_province', 'VARCHAR(100)'],
    ['emergency_name', 'VARCHAR(150)'],
    ['emergency_relation', 'VARCHAR(50)'],
    ['emergency_phone', 'VARCHAR(30)'],
    ['emergency_address', 'TEXT'],
    ['subject', 'VARCHAR(100)'],
    ['contract_type', 'VARCHAR(50)'],
    ['probation_end', 'DATE'],
    ['highest_education', 'VARCHAR(150)'],
    ['degree_title', 'VARCHAR(150)'],
    ['institution', 'VARCHAR(150)'],
    ['graduation_year', 'VARCHAR(20)'],
    ['experience_years', 'VARCHAR(20)'],
    ['previous_employer', 'VARCHAR(150)'],
    ['previous_role', 'VARCHAR(150)'],
    ['bank_name', 'VARCHAR(150)'],
    ['account_number', 'VARCHAR(100)'],
    ['account_title', 'VARCHAR(150)'],
    ['iban', 'VARCHAR(100)'],
    ['branch_name', 'VARCHAR(150)'],
    ['app_access', "JSONB DEFAULT '[]'::jsonb"],
    ['user_id', 'INTEGER REFERENCES users(id)'],
    ['portal_username', 'VARCHAR(100)'],
    ['portal_password', 'VARCHAR(100)'],
    ['portal_role', "VARCHAR(30) DEFAULT 'teacher'"],
    ['portal_permissions', "JSONB DEFAULT '[]'::jsonb"],
    ['portal_active', 'BOOLEAN DEFAULT true'],
    ['migration_source', 'VARCHAR(120)'],
    ['migration_serial', 'INTEGER'],
    ['migration_batch', 'VARCHAR(100)'],
    ['raw_import', "JSONB DEFAULT '{}'::jsonb"],
    ['updated_at', 'TIMESTAMP DEFAULT NOW()'],
  ]

  for (const [column, definition] of employeeColumns) {
    await ensureColumn(client, 'employees', column, definition)
  }
  await client.query('CREATE INDEX IF NOT EXISTS idx_employees_migration_serial ON employees(school_id, migration_serial)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id)')
}

async function backupTables(client, batchSuffix) {
  await client.query('CREATE SCHEMA IF NOT EXISTS migration_backups')
  await client.query(`CREATE TABLE ${quoteIdent('migration_backups')}.${quoteIdent(`employees_${batchSuffix}`)} AS TABLE employees WITH DATA`)
  await client.query(`CREATE TABLE ${quoteIdent('migration_backups')}.${quoteIdent(`users_${batchSuffix}`)} AS TABLE users WITH DATA`)
}

async function findDuplicate(client, record) {
  const cnic = digits(record.cnic)
  const phone = digits(record.cell_no)
  const employeeId = empId(record)
  const name = normalize(record.name)
  const father = normalize(record.father_husband_name)
  const result = await client.query(
    `
      SELECT id, emp_id, name, father_name, phone, cnic, user_id
      FROM employees
      WHERE school_id = $1
        AND (
          emp_id = $2
          OR ($3 <> '' AND regexp_replace(COALESCE(cnic, ''), '[^0-9]', '', 'g') = $3)
          OR (
            $4 <> ''
            AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $4
            AND LOWER(name) = LOWER($5)
          )
          OR (
            LOWER(name) = LOWER($5)
            AND COALESCE(LOWER(father_name), '') = COALESCE(LOWER($6), '')
          )
        )
      ORDER BY id
      LIMIT 1
    `,
    [SCHOOL_ID, employeeId, cnic, phone, name, father || null],
  )
  return result.rows[0] || null
}

async function ensurePortalUser(client, record, plainPassword, permissions, existingUserId = null) {
  const loginId = username(record)
  const role = 'teacher'
  const existing = await client.query(
    `SELECT id FROM users
     WHERE id = COALESCE($1::integer, -1)
        OR LOWER(COALESCE(username, '')) = LOWER($2)
     LIMIT 1`,
    [existingUserId, loginId],
  )
  const email = await uniqueStaffEmail(client, record, existing.rows[0]?.id || null)
  const passwordHash = await bcrypt.hash(plainPassword, 10)
  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE users
        SET
          username = COALESCE(username, $2),
          name = COALESCE(NULLIF(name, ''), $3),
          password = COALESCE(password, $4),
          role = COALESCE(NULLIF(role, ''), $5),
          designation = COALESCE(NULLIF(designation, ''), $6),
          phone = COALESCE(NULLIF(phone, ''), $7),
          permissions = COALESCE(permissions, $8::jsonb),
          entity_type = COALESCE(entity_type, 'teacher'),
          entity_id = COALESCE(entity_id, $9),
          is_active = true,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        existing.rows[0].id,
        loginId,
        normalize(record.name),
        passwordHash,
        role,
        designationFor(record),
        nullable(record.cell_no),
        JSON.stringify(permissions),
        null,
      ],
    )
    return { id: existing.rows[0].id, created: false, email, username: loginId, password: null }
  }

  const inserted = await client.query(
    `
      INSERT INTO users (
        school_id, username, name, email, password, role, designation, phone,
        permissions, entity_type, is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'teacher',true)
      RETURNING id
    `,
    [
      SCHOOL_ID,
      loginId,
      normalize(record.name),
      email,
      passwordHash,
      role,
      designationFor(record),
      nullable(record.cell_no),
      JSON.stringify(permissions),
    ],
  )
  return { id: inserted.rows[0].id, created: true, email, username: loginId, password: plainPassword }
}

async function insertEmployee(client, record, batch, user, plainPassword, permissions) {
  const result = await client.query(
    `
      INSERT INTO employees (
        school_id, emp_id, name, father_name, gender, dob, cnic, marital_status,
        phone, email, salary, join_date, designation, department, subject,
        contract_type, highest_education, degree_title, app_access, user_id,
        portal_username, portal_password, portal_role, portal_permissions, portal_active,
        migration_source, migration_serial, migration_batch, raw_import, is_active
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19::jsonb,$20,$21,$22,'teacher',$23::jsonb,true,
        'Staff List.pdf',$24,$25,$26::jsonb,true
      )
      RETURNING id
    `,
    [
      SCHOOL_ID,
      empId(record),
      normalize(record.name),
      nullable(record.father_husband_name),
      nullable(record.gender),
      sqlDate(record.dob),
      nullable(record.cnic),
      nullable(record.marital_status === 'Select' ? '' : record.marital_status),
      nullable(record.cell_no),
      preferredStaffEmail(record),
      record.salary ?? null,
      sqlDate(record.join_date),
      designationFor(record),
      'Academics',
      nullable(record.qualification),
      'Permanent',
      nullable(record.qualification),
      nullable(record.qualification),
      JSON.stringify(permissions),
      user.id,
      user.username,
      plainPassword,
      JSON.stringify(permissions),
      record.sno,
      batch,
      JSON.stringify(record),
    ],
  )
  await client.query('UPDATE users SET entity_id = $1 WHERE id = $2', [result.rows[0].id, user.id])
  return result.rows[0].id
}

async function updateDuplicate(client, employeeId, record, batch, user, plainPassword, permissions) {
  await client.query(
    `
      UPDATE employees
      SET
        father_name = COALESCE(NULLIF(father_name, ''), $2),
        gender = COALESCE(NULLIF(gender, ''), $3),
        dob = COALESCE(dob, $4::date),
        cnic = COALESCE(NULLIF(cnic, ''), $5),
        marital_status = COALESCE(NULLIF(marital_status, ''), $6),
        phone = COALESCE(NULLIF(phone, ''), $7),
        email = COALESCE(NULLIF(email, ''), $8),
        salary = COALESCE(salary, $9),
        join_date = COALESCE(join_date, $10::date),
        designation = COALESCE(NULLIF(designation, ''), $11),
        department = COALESCE(NULLIF(department, ''), 'Academics'),
        subject = COALESCE(NULLIF(subject, ''), $12),
        highest_education = COALESCE(NULLIF(highest_education, ''), $12),
        degree_title = COALESCE(NULLIF(degree_title, ''), $12),
        app_access = COALESCE(app_access, $13::jsonb),
        user_id = COALESCE(user_id, $14),
        portal_username = COALESCE(NULLIF(portal_username, ''), $15),
        portal_password = COALESCE(NULLIF(portal_password, ''), $16),
        portal_role = COALESCE(NULLIF(portal_role, ''), 'teacher'),
        portal_permissions = COALESCE(portal_permissions, $13::jsonb),
        portal_active = true,
        migration_source = COALESCE(NULLIF(migration_source, ''), 'Staff List.pdf'),
        migration_serial = COALESCE(migration_serial, $17),
        migration_batch = COALESCE(NULLIF(migration_batch, ''), $18),
        raw_import = COALESCE(raw_import, $19::jsonb),
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      employeeId,
      nullable(record.father_husband_name),
      nullable(record.gender),
      sqlDate(record.dob),
      nullable(record.cnic),
      nullable(record.marital_status === 'Select' ? '' : record.marital_status),
      nullable(record.cell_no),
      preferredStaffEmail(record),
      record.salary ?? null,
      sqlDate(record.join_date),
      designationFor(record),
      nullable(record.qualification),
      JSON.stringify(permissions),
      user.id,
      user.username,
      plainPassword,
      record.sno,
      batch,
      JSON.stringify(record),
    ],
  )
  await client.query('UPDATE users SET entity_id = COALESCE(entity_id, $1) WHERE id = $2', [employeeId, user.id])
}

async function main() {
  const jsonPath = process.argv.find(arg => arg.endsWith('.json'))
  if (!jsonPath) {
    throw new Error('Usage: node src/scripts/importStaffList.js /path/to/staff_list.json [--dry-run]')
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const records = Array.isArray(payload.records) ? payload.records : []
  if (!records.length) throw new Error('No staff records found in JSON payload.')
  if (payload.reported_total_strength && Number(payload.reported_total_strength) !== records.length) {
    throw new Error(`PDF total (${payload.reported_total_strength}) does not match extracted records (${records.length}).`)
  }

  const batch = `staff_pdf_20260529_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`
  const batchSuffix = batch.replace(/[^a-zA-Z0-9_]/g, '_')
  const outDir = path.join(process.cwd(), 'migration-output')
  fs.mkdirSync(outDir, { recursive: true })
  const credentialsPath = path.join(outDir, `${batch}_teacher_credentials_private.csv`)
  const reportPath = path.join(outDir, `${batch}_report.json`)
  const client = await pool.connect()
  const credentials = [['sno', 'employee_id', 'name', 'email', 'login_id', 'password', 'status']]
  const summary = {
    batch,
    dryRun: DRY_RUN,
    sourceFile: payload.source_file || 'Staff List.pdf',
    reportedTotalStrength: payload.reported_total_strength || null,
    extracted: records.length,
    imported: 0,
    duplicates: 0,
    failed: 0,
    portalUsersCreated: 0,
    portalUsersUpdated: 0,
    manualReview: [],
    duplicateRecords: [],
    failedRecords: [],
    backupTables: DRY_RUN ? [] : [
      `migration_backups.employees_${batchSuffix}`,
      `migration_backups.users_${batchSuffix}`,
    ],
    credentialsPath: DRY_RUN ? null : credentialsPath,
  }

  try {
    await ensureSchema(client)
    if (!DRY_RUN) await backupTables(client, batchSuffix)
    await client.query('BEGIN')

    for (const record of records) {
      try {
        if (record.manual_review) summary.manualReview.push({ sno: record.sno, name: record.name, note: record.manual_review })
        const duplicate = await findDuplicate(client, record)
        const plainPassword = staffPassword(record)
        const permissions = [...DEFAULT_PERMISSIONS]
        const portalUser = await ensurePortalUser(client, record, plainPassword, permissions, duplicate?.user_id || null)
        if (portalUser.created) summary.portalUsersCreated += 1
        else summary.portalUsersUpdated += 1

        let employeeId
        if (duplicate) {
          summary.duplicates += 1
          employeeId = duplicate.id
          await updateDuplicate(client, employeeId, record, batch, portalUser, plainPassword, permissions)
          summary.duplicateRecords.push({ sno: record.sno, name: record.name, employeeId, matchedBy: duplicate.emp_id })
        } else {
          employeeId = await insertEmployee(client, record, batch, portalUser, plainPassword, permissions)
          summary.imported += 1
        }

        if (portalUser.password) {
          credentials.push([record.sno, empId(record), record.name, portalUser.email, portalUser.username, portalUser.password, 'created'])
        } else {
          credentials.push([record.sno, empId(record), record.name, portalUser.email, portalUser.username, '(existing user preserved)', 'existing'])
        }
      } catch (err) {
        summary.failed += 1
        summary.failedRecords.push({ sno: record.sno, name: record.name, error: err.message })
      }
    }

    if (summary.failed > 0) {
      throw new Error(`${summary.failed} staff records failed; transaction rolled back.`)
    }

    if (DRY_RUN) {
      await client.query('ROLLBACK')
    } else {
      await client.query('COMMIT')
      fs.writeFileSync(credentialsPath, credentials.map(row => row.map(csvCell).join(',')).join('\n'))
    }

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2))
    console.log(JSON.stringify(summary, null, 2))
  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    summary.error = err.message
    summary.failed = summary.failed || records.length
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2))
    console.error(JSON.stringify(summary, null, 2))
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
