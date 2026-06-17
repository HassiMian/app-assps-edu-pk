const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { pool } = require('../config/database')

const SCHOOL_ID = Number(process.env.MIGRATION_SCHOOL_ID || 1)
const SESSION = process.env.MIGRATION_ACADEMIC_SESSION || '2026-2027'
const DRY_RUN = process.argv.includes('--dry-run')
const ARCHIVE_EXISTING_ACTIVE = process.argv.includes('--archive-existing-active')

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

function password(prefix) {
  return `${prefix}@${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function studentPassword(record) {
  const father = normalize(record.father_name || 'Student').replace(/\s+/g, '').slice(0, 4) || 'Stud'
  return `${father}${new Date().getFullYear()}`
}

function parentPassword(record) {
  const phone = digits(record.cell_no || record.father_cell || record.home_cell || record.mother_cell).slice(-4) || '0000'
  return `${phone}@${new Date().getFullYear()}`
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function classKey(record) {
  return `${record.class || ''} / ${record.section || ''}`
}

function buildGrNumber(record) {
  const serial = String(record.sno).padStart(3, '0')
  return `MIG26-${serial}`
}

function parentIdentity(record) {
  const phone = digits(record.cell_no || record.father_cell || record.home_cell || record.mother_cell)
  if (phone) {
    return {
      key: `phone:${phone}`,
      email: `parent_${phone}@assps.edu.pk`,
      phone,
    }
  }
  const familyCode = normalize(record.family_code)
  if (familyCode) {
    return {
      key: `family:${familyCode}`,
      email: `parent_family_${familyCode.toLowerCase()}@assps.edu.pk`,
      phone: '',
    }
  }
  return {
    key: `record:${record.sno}`,
    email: `parent_mig26_${String(record.sno).padStart(3, '0')}@assps.edu.pk`,
    phone: '',
  }
}

async function ensureColumn(client, table, column, definition) {
  await client.query(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN IF NOT EXISTS ${quoteIdent(column)} ${definition}`)
}

async function ensureSchema(client) {
  await client.query('ALTER TABLE students ALTER COLUMN class TYPE VARCHAR(100)')
  await client.query('ALTER TABLE students ALTER COLUMN section TYPE VARCHAR(50)')
  await client.query('ALTER TABLE students ALTER COLUMN gr_number TYPE VARCHAR(50)')
  await ensureColumn(client, 'students', 'family_code', 'VARCHAR(50)')
  await ensureColumn(client, 'students', 'father_cnic', 'VARCHAR(20)')
  await ensureColumn(client, 'students', 'father_occupation', 'VARCHAR(100)')
  await ensureColumn(client, 'students', 'locality', 'VARCHAR(150)')
  await ensureColumn(client, 'students', 'admitted_class', 'VARCHAR(100)')
  await ensureColumn(client, 'students', 'academic_session', 'VARCHAR(20)')
  await ensureColumn(client, 'students', 'pdf_source', 'VARCHAR(120)')
  await ensureColumn(client, 'students', 'pdf_serial', 'INTEGER')
  await ensureColumn(client, 'students', 'pdf_gr_number', 'VARCHAR(50)')
  await ensureColumn(client, 'students', 'migration_batch', 'VARCHAR(80)')
  await ensureColumn(client, 'students', 'student_user_id', 'INTEGER REFERENCES users(id)')
  await ensureColumn(client, 'students', 'parent_user_id', 'INTEGER REFERENCES users(id)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_students_migration_batch ON students(migration_batch)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_students_family_code ON students(school_id, family_code)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_students_pdf_serial ON students(school_id, pdf_serial)')
}

async function backupTables(client, batchTableSuffix) {
  await client.query('CREATE SCHEMA IF NOT EXISTS migration_backups')
  await client.query(`CREATE TABLE ${quoteIdent('migration_backups')}.${quoteIdent(`students_${batchTableSuffix}`)} AS TABLE students WITH DATA`)
  await client.query(`CREATE TABLE ${quoteIdent('migration_backups')}.${quoteIdent(`users_${batchTableSuffix}`)} AS TABLE users WITH DATA`)
}

async function findDuplicate(client, record) {
  const name = normalize(record.student_name)
  const fatherName = normalize(record.father_name)
  const dob = sqlDate(record.dob)
  const phone = digits(record.cell_no || record.father_cell || record.home_cell || record.mother_cell)
  const familyCode = normalize(record.family_code)

  const result = await client.query(
    `
      SELECT id, gr_number, name, father_name, date_of_birth, parent_phone, family_code
      FROM students
      WHERE school_id = $1
        AND LOWER(name) = LOWER($2)
        AND COALESCE(LOWER(father_name), '') = COALESCE(LOWER($3), '')
        AND (
          ($4::date IS NOT NULL AND date_of_birth = $4::date)
          OR ($5 <> '' AND regexp_replace(COALESCE(parent_phone, ''), '[^0-9]', '', 'g') = $5)
          OR ($6 <> '' AND COALESCE(family_code, '') = $6)
          OR pdf_serial = $7
        )
      LIMIT 1
    `,
    [SCHOOL_ID, name, fatherName || null, dob, phone, familyCode, record.sno],
  )
  return result.rows[0] || null
}

async function ensureUser(client, { email, name, role, designation, phone, plainPassword }) {
  const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, created: false, password: null }
  }
  const hashed = await bcrypt.hash(plainPassword, 10)
  const username = role === 'student'
    ? email.replace(/^student_/i, '').replace(/@assps\.edu\.pk$/i, '').toUpperCase()
    : null
  const inserted = await client.query(
    `
      INSERT INTO users (school_id, name, email, username, password, role, designation, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING id
    `,
    [SCHOOL_ID, name, email, username, hashed, role, designation, phone || null],
  )
  return { id: inserted.rows[0].id, created: true, password: plainPassword }
}

async function insertStudent(client, record, batch, parentUserId, studentUserId) {
  const grNumber = buildGrNumber(record)
  const phone = nullable(record.cell_no || record.father_cell || record.home_cell || record.mother_cell)
  const result = await client.query(
    `
      INSERT INTO students (
        school_id, gr_number, name, father_name, mother_name, class, section, roll_number,
        date_of_birth, gender, address, parent_phone, parent_whatsapp, admission_date,
        is_active, family_code, father_cnic, father_occupation, locality, admitted_class,
        academic_session, pdf_source, pdf_serial, pdf_gr_number, migration_batch,
        parent_user_id, student_user_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        true,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )
      RETURNING id
    `,
    [
      SCHOOL_ID,
      grNumber,
      normalize(record.student_name),
      nullable(record.father_name),
      null,
      normalize(record.class),
      normalize(record.section) || 'Blue',
      null,
      sqlDate(record.dob),
      null,
      nullable([record.address, record.locality].filter(Boolean).join(', ')),
      phone,
      phone,
      sqlDate(record.doa),
      nullable(record.family_code),
      nullable(record.cnic),
      nullable(record.occupation === '--' ? '' : record.occupation),
      nullable(record.locality || record.address),
      nullable(record.admitted_class),
      SESSION,
      'Print Class List.pdf',
      record.sno,
      nullable(record.gr_no),
      batch,
      parentUserId,
      studentUserId,
    ],
  )
  return result.rows[0].id
}

async function updateDuplicate(client, duplicateId, record, batch, parentUserId, studentUserId) {
  const phone = nullable(record.cell_no || record.father_cell || record.home_cell || record.mother_cell)
  await client.query(
    `
      UPDATE students
      SET
        class = COALESCE(NULLIF(class, ''), $2),
        section = COALESCE(NULLIF(section, ''), $3),
        date_of_birth = COALESCE(date_of_birth, $4::date),
        address = COALESCE(NULLIF(address, ''), $5),
        parent_phone = COALESCE(NULLIF(parent_phone, ''), $6),
        parent_whatsapp = COALESCE(NULLIF(parent_whatsapp, ''), $6),
        admission_date = COALESCE(admission_date, $7::date),
        family_code = COALESCE(NULLIF(family_code, ''), $8),
        father_cnic = COALESCE(NULLIF(father_cnic, ''), $9),
        father_occupation = COALESCE(NULLIF(father_occupation, ''), $10),
        locality = COALESCE(NULLIF(locality, ''), $11),
        admitted_class = COALESCE(NULLIF(admitted_class, ''), $12),
        academic_session = COALESCE(NULLIF(academic_session, ''), $13),
        pdf_source = COALESCE(NULLIF(pdf_source, ''), 'Print Class List.pdf'),
        pdf_serial = COALESCE(pdf_serial, $14),
        pdf_gr_number = COALESCE(NULLIF(pdf_gr_number, ''), $15),
        migration_batch = COALESCE(NULLIF(migration_batch, ''), $16),
        parent_user_id = COALESCE(parent_user_id, $17),
        student_user_id = COALESCE(student_user_id, $18),
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      duplicateId,
      normalize(record.class),
      normalize(record.section) || 'Blue',
      sqlDate(record.dob),
      nullable([record.address, record.locality].filter(Boolean).join(', ')),
      phone,
      sqlDate(record.doa),
      nullable(record.family_code),
      nullable(record.cnic),
      nullable(record.occupation === '--' ? '' : record.occupation),
      nullable(record.locality || record.address),
      nullable(record.admitted_class),
      SESSION,
      record.sno,
      nullable(record.gr_no),
      batch,
      parentUserId,
      studentUserId,
    ],
  )
}

async function main() {
  const jsonPath = process.argv.find(arg => arg.endsWith('.json'))
  if (!jsonPath) {
    throw new Error('Usage: node src/scripts/importAsspsStudents.js /path/to/assps_students.json [--dry-run]')
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const students = Array.isArray(payload.students) ? payload.students : []
  if (!students.length) throw new Error('No students found in JSON payload.')

  const batch = `assps_pdf_20260528_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`
  const batchTableSuffix = batch.replace(/[^a-zA-Z0-9_]/g, '_')
  const outDir = path.join(process.cwd(), 'migration-output')
  fs.mkdirSync(outDir, { recursive: true })
  const credentialsPath = path.join(outDir, `${batch}_credentials_private.csv`)
  const reportPath = path.join(outDir, `${batch}_report.json`)

  const client = await pool.connect()
  const createdParentKeys = new Map()
  const credentials = [['type', 'record_sno', 'student_name', 'father_name', 'email', 'password', 'linked_student_id']]
  const summary = {
    batch,
    dryRun: DRY_RUN,
    archiveExistingActive: ARCHIVE_EXISTING_ACTIVE,
    sourceTotal: students.length,
    imported: 0,
    duplicates: 0,
    archivedExistingActive: 0,
    failed: 0,
    parentCredentialsCreated: 0,
    studentCredentialsCreated: 0,
    classes: [...new Set(students.map(item => item.class).filter(Boolean))].sort(),
    sections: [...new Set(students.map(item => item.section).filter(Boolean))].sort(),
    classSectionImported: {},
    duplicateRecords: [],
    failedRecords: [],
    verification: payload.report || null,
    backupTables: DRY_RUN ? [] : [
      `migration_backups.students_${batchTableSuffix}`,
      `migration_backups.users_${batchTableSuffix}`,
    ],
    credentialsPath: DRY_RUN ? null : credentialsPath,
  }

  try {
    await ensureSchema(client)
    if (!DRY_RUN) {
      await backupTables(client, batchTableSuffix)
    }

    await client.query('BEGIN')

    if (ARCHIVE_EXISTING_ACTIVE) {
      const archived = await client.query(
        `
          UPDATE students
          SET
            is_active = false,
            migration_batch = COALESCE(NULLIF(migration_batch, ''), $2),
            updated_at = NOW()
          WHERE school_id = $1
            AND is_active = true
            AND (migration_batch IS NULL OR migration_batch NOT LIKE 'assps_pdf_20260528_%')
        `,
        [SCHOOL_ID, `${batch}_pre_import_archive`],
      )
      summary.archivedExistingActive = archived.rowCount
    }

    for (const record of students) {
      try {
        const duplicate = await findDuplicate(client, record)
        const parentInfo = parentIdentity(record)
        let parentUser = createdParentKeys.get(parentInfo.key)
        if (!parentUser) {
          const parentPlainPassword = parentPassword(record)
          parentUser = await ensureUser(client, {
            email: parentInfo.email,
            name: nullable(record.father_name) || 'Parent',
            role: 'parent',
            designation: 'Parent',
            phone: parentInfo.phone,
            plainPassword: parentPlainPassword,
          })
          if (parentUser.created) {
            summary.parentCredentialsCreated += 1
            credentials.push(['parent', record.sno, record.student_name, record.father_name, parentInfo.email, parentUser.password, ''])
          }
          createdParentKeys.set(parentInfo.key, parentUser)
        }

        const studentEmail = `student_${buildGrNumber(record).toLowerCase()}@assps.edu.pk`
        const studentPlainPassword = studentPassword(record)
        const studentUser = await ensureUser(client, {
          email: studentEmail,
          name: normalize(record.student_name),
          role: 'student',
          designation: 'Student',
          phone: digits(record.cell_no) || null,
          plainPassword: studentPlainPassword,
        })
        if (studentUser.created) {
          summary.studentCredentialsCreated += 1
          credentials.push(['student', record.sno, record.student_name, record.father_name, studentEmail, studentUser.password, 'pending'])
        }

        let studentId
        if (duplicate) {
          summary.duplicates += 1
          studentId = duplicate.id
          summary.duplicateRecords.push({ sno: record.sno, student_name: record.student_name, matched_id: duplicate.id, matched_gr_number: duplicate.gr_number })
          await updateDuplicate(client, duplicate.id, record, batch, parentUser.id, studentUser.id)
        } else {
          studentId = await insertStudent(client, record, batch, parentUser.id, studentUser.id)
          summary.imported += 1
        }

        for (const row of credentials) {
          if (row[1] === record.sno && row[6] === 'pending') row[6] = studentId
        }
        const key = classKey(record)
        summary.classSectionImported[key] = (summary.classSectionImported[key] || 0) + (duplicate ? 0 : 1)
      } catch (error) {
        summary.failed += 1
        summary.failedRecords.push({ sno: record.sno, student_name: record.student_name, error: error.message })
      }
    }

    if (summary.failed > 0) {
      throw new Error(`Migration blocked: ${summary.failed} failed record(s).`)
    }

    if (DRY_RUN) {
      await client.query('ROLLBACK')
    } else {
      await client.query('COMMIT')
      fs.writeFileSync(credentialsPath, credentials.map(row => row.map(csvCell).join(',')).join('\n'), 'utf8')
    }

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    summary.error = error.message
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
