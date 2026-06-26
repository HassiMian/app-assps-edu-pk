#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Pool } = require('pg')
const dotenv = require('dotenv')

const DEFAULT_SCHOOL_NAME = 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'

const TYPE_MAP = {
  mcq: 'mcq',
  short: 'short',
  long: 'long',
  grammar: 'grammar',
  composition: 'essay',
  fill_blank: 'fill',
  match: 'columns',
  project_diagram: 'diagram',
}

const CATEGORY_LABELS = {
  mcq: 'MCQ',
  short: 'Short Question',
  long: 'Long Question',
  grammar: 'Grammar',
  composition: 'Writing / Composition',
  fill_blank: 'Fill in the Blanks',
  match: 'Match / Columns',
  project_diagram: 'Diagram / Project / Activity',
}

function argValue(name, fallback = '') {
  const idx = process.argv.indexOf(name)
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
  const eq = process.argv.find(arg => arg.startsWith(`${name}=`))
  return eq ? eq.slice(name.length + 1) : fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function loadEnv() {
  const envFile = argValue('--env', path.resolve(__dirname, '../.env'))
  dotenv.config({ path: envFile })
  return envFile
}

function createPool() {
  if (process.env.DATABASE_URL) {
    const isLocal = /localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL)
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    })
  }

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'apexos_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  })
}

function norm(value) {
  return String(value ?? '').trim()
}

function normalizeMedium(record) {
  const medium = norm(record.medium)
  const subject = norm(record.subject).toLowerCase()
  if (/urdu|pakistan studies urdu/.test(subject) || /urdu/i.test(medium) || /[\u0600-\u06ff]/.test(record.question_text || '')) {
    return 'Urdu'
  }
  return medium || 'English'
}

function questionType(record) {
  const raw = norm(record.question_type || record.category).toLowerCase()
  return TYPE_MAP[raw] || raw || 'short'
}

function stableId(record, index) {
  const seedId = norm(record.id)
  if (seedId) return `assps_seed_${seedId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const hash = crypto
    .createHash('sha1')
    .update([record.class_level, record.subject, record.chapter_name, record.question_text, index].map(norm).join('|'))
    .digest('hex')
    .slice(0, 16)
  return `assps_seed_${hash}`
}

function loadJson(file) {
  const resolved = path.resolve(file)
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'))
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.questions) ? parsed.questions : Array.isArray(parsed.data) ? parsed.data : []
  return { resolved, rows }
}

async function findSchool(client, selector) {
  const wanted = norm(selector || DEFAULT_SCHOOL_NAME)
  const result = await client.query(
    `SELECT id, name, slug
       FROM schools
      WHERE lower(name) = lower($1)
         OR lower(slug) = lower($1)
         OR lower(name) = lower($2)
      ORDER BY CASE WHEN lower(name) = lower($1) THEN 0 ELSE 1 END
      LIMIT 1`,
    [wanted, DEFAULT_SCHOOL_NAME]
  )
  return result.rows[0] || null
}

function normalizeRecord(record, index, schoolId, sourceFile) {
  const classLevel = norm(record.class_level || record.classLevel || record.class)
  const subject = norm(record.subject)
  const chapterName = norm(record.chapter_name || record.chapterName || record.chapter)
  const questionText = norm(record.question_text || record.questionText || record.text)
  const medium = normalizeMedium(record)
  const isRtl = medium.toLowerCase() === 'urdu' || /[\u0600-\u06ff]/.test(questionText)
  const rawCategory = norm(record.category || record.question_type)
  const type = questionType(record)
  const options = Array.isArray(record.options) ? record.options : []
  const tags = Array.isArray(record.tags) ? record.tags.map(norm).filter(Boolean) : []

  return {
    id: stableId(record, index),
    schoolId,
    classLevel,
    subject,
    medium,
    board: norm(record.board) || 'Punjab Board',
    chapterNo: norm(record.chapter_no || record.chapterNo),
    chapterName,
    topicName: norm(record.topic_name || record.topicName || chapterName),
    questionType: type,
    questionSubtype: rawCategory,
    questionText,
    questionTextUrdu: isRtl ? questionText : norm(record.question_text_urdu || record.textUrdu),
    questionTextEnglish: isRtl ? norm(record.question_text_english || record.textEnglish) : questionText,
    options,
    correctOption: norm(record.correct_option || record.correctOption),
    answer: record.answer === undefined || record.answer === null ? '' : String(record.answer),
    explanation: norm(record.explanation),
    marks: Number(record.marks || 1),
    difficulty: norm(record.difficulty) || 'medium',
    priority: norm(record.priority) || 'exercise',
    sourceType: 'json_seed',
    sourceFileId: path.basename(sourceFile),
    tags,
    metadata: {
      seed_id: record.id || null,
      source: record.source || '',
      original_category: rawCategory,
      category_label: CATEGORY_LABELS[rawCategory] || rawCategory,
      direction: isRtl ? 'rtl' : 'ltr',
    },
  }
}

function validate(row) {
  const missing = []
  if (!row.classLevel) missing.push('class_level')
  if (!row.subject) missing.push('subject')
  if (!row.chapterName) missing.push('chapter_name')
  if (!row.questionText) missing.push('question_text')
  if (!row.questionType) missing.push('question_type')
  return missing.length ? `Missing ${missing.join(', ')}` : ''
}

async function duplicateExists(client, row) {
  const result = await client.query(
    `SELECT id
       FROM question_bank
      WHERE school_id = $1
        AND btrim(class_level) = btrim($2)
        AND btrim(subject) = btrim($3)
        AND btrim(chapter_name) = btrim($4)
        AND btrim(question_text) = btrim($5)
      LIMIT 1`,
    [row.schoolId, row.classLevel, row.subject, row.chapterName, row.questionText]
  )
  return result.rows[0] || null
}

async function idExists(client, id) {
  const result = await client.query('SELECT id FROM question_bank WHERE id = $1 LIMIT 1', [id])
  return Boolean(result.rows[0])
}

async function insertQuestion(client, row) {
  let id = row.id
  if (await idExists(client, id)) {
    id = `${row.id}_${crypto.randomBytes(3).toString('hex')}`
  }
  await client.query(
    `INSERT INTO question_bank (
      id, school_id, class_level, subject, medium, board,
      chapter_no, chapter_name, topic_name, question_type, question_subtype,
      question_text, question_text_urdu, question_text_english,
      options, correct_option, answer, explanation, marks, difficulty, priority,
      source_type, source_file_id, tags, metadata, is_approved, confidence
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14,
      $15::jsonb, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25::jsonb, true, 100
    )`,
    [
      id, row.schoolId, row.classLevel, row.subject, row.medium, row.board,
      row.chapterNo, row.chapterName, row.topicName, row.questionType, row.questionSubtype,
      row.questionText, row.questionTextUrdu, row.questionTextEnglish,
      JSON.stringify(row.options), row.correctOption || null, row.answer, row.explanation,
      row.marks, row.difficulty, row.priority,
      row.sourceType, row.sourceFileId, row.tags, JSON.stringify(row.metadata),
    ]
  )
}

function summarizeBy(rows, keyFn) {
  const counts = new Map()
  rows.forEach(row => {
    const key = keyFn(row)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return Array.from(counts.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
}

async function main() {
  const envFile = loadEnv()
  const pool = createPool()
  const file = argValue('--file')
  const schoolSelector = argValue('--school', DEFAULT_SCHOOL_NAME)
  const dryRun = hasFlag('--dry-run') || !hasFlag('--apply')

  if (!file) {
    throw new Error('Usage: node scripts/seedQuestionBankFromJson.js --file path/to/all_question_bank_seed.json --school "AL SIDDIQUE SCHOLARS PUBLIC SCHOOL" --dry-run|--apply')
  }

  const { resolved, rows } = loadJson(file)
  const client = await pool.connect()
  const report = {
    file: resolved,
    dryRun,
    school: null,
    totalRead: rows.length,
    inserted: 0,
    skippedDuplicates: 0,
    failed: 0,
    failures: [],
    newSubjects: [],
    newChapters: [],
    byClassSubject: [],
    byType: [],
    envFile,
  }

  try {
    const school = await findSchool(client, schoolSelector)
    if (!school) throw new Error(`School not found: ${schoolSelector}`)
    report.school = school

    const beforeSubjects = new Set((await client.query('SELECT DISTINCT class_level, subject FROM question_bank WHERE school_id = $1', [school.id])).rows.map(r => `${r.class_level}||${r.subject}`))
    const beforeChapters = new Set((await client.query('SELECT DISTINCT class_level, subject, chapter_name FROM question_bank WHERE school_id = $1', [school.id])).rows.map(r => `${r.class_level}||${r.subject}||${r.chapter_name}`))

    const normalizedRows = rows.map((record, index) => normalizeRecord(record, index, school.id, resolved))
    report.byClassSubject = summarizeBy(normalizedRows, row => `Class ${row.classLevel} - ${row.subject}`)
    report.byType = summarizeBy(normalizedRows, row => row.questionType)

    await client.query('BEGIN')
    for (const [index, row] of normalizedRows.entries()) {
      const error = validate(row)
      if (error) {
        report.failed += 1
        report.failures.push({ index: index + 1, id: row.id, reason: error })
        continue
      }

      const duplicate = await duplicateExists(client, row)
      if (duplicate) {
        report.skippedDuplicates += 1
        continue
      }

      const subjectKey = `${row.classLevel}||${row.subject}`
      const chapterKey = `${row.classLevel}||${row.subject}||${row.chapterName}`
      if (!beforeSubjects.has(subjectKey)) {
        beforeSubjects.add(subjectKey)
        report.newSubjects.push({ class_level: row.classLevel, subject: row.subject })
      }
      if (!beforeChapters.has(chapterKey)) {
        beforeChapters.add(chapterKey)
        report.newChapters.push({ class_level: row.classLevel, subject: row.subject, chapter_name: row.chapterName })
      }

      if (!dryRun) await insertQuestion(client, row)
      report.inserted += 1
    }

    if (dryRun) await client.query('ROLLBACK')
    else await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch(error => {
  console.error(error.message || error)
  process.exitCode = 1
})
