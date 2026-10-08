const { classMatches } = require('./lessonPlanningEngine')

function clean(value, max = 240) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function subjectKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
}

async function tableExists(client, name) {
  const result = await client.query('SELECT to_regclass($1) AS table_name', [`public.${name}`])
  return Boolean(result.rows[0]?.table_name)
}

async function loadAcademicSetup(client, schoolId) {
  if (!(await tableExists(client, 'settings'))) return {}
  const result = await client.query('SELECT academic_setup FROM settings WHERE school_id=$1 LIMIT 1', [schoolId])
  return result.rows[0]?.academic_setup && typeof result.rows[0].academic_setup === 'object' ? result.rows[0].academic_setup : {}
}

async function loadSession(client, schoolId) {
  if (!(await tableExists(client, 'academic_session_versions'))) return null
  const result = await client.query(`
    SELECT asv.label, asv.starts_on, asv.ends_on, asv.version_number, asv.metadata
    FROM academic_session_versions asv
    WHERE asv.school_id=$1
    ORDER BY asv.starts_on DESC NULLS LAST, asv.version_number DESC
    LIMIT 1
  `, [schoolId])
  const row = result.rows[0]
  return row ? {
    label: clean(row.label, 120),
    startsOn: row.starts_on ? String(row.starts_on).slice(0, 10) : '',
    endsOn: row.ends_on ? String(row.ends_on).slice(0, 10) : '',
    versionNumber: Number(row.version_number || 0),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  } : null
}

async function loadTimetable(client, schoolId, classLevel, section) {
  if (!(await tableExists(client, 'timetable'))) return []
  const result = await client.query(`
    SELECT id, teacher_id, day_order, day_name, start_time, end_time, subject, class_name, section, room, period_label
    FROM timetable
    WHERE school_id=$1
    ORDER BY day_order, start_time, class_name, section
    LIMIT 1200
  `, [schoolId])
  const sectionKey = clean(section, 80).toLowerCase()
  return result.rows.filter(row => {
    if (classLevel && !classMatches(row.class_name, classLevel)) return false
    if (sectionKey && clean(row.section, 80).toLowerCase() && clean(row.section, 80).toLowerCase() !== sectionKey) return false
    return true
  })
}

async function loadQuestionBankSignals(client, schoolId, classLevel, subjects = []) {
  if (!(await tableExists(client, 'question_bank'))) return []
  const result = await client.query(`
    SELECT class_level, subject, COALESCE(chapter_name, 'Unmapped') AS chapter_name,
           COUNT(*)::int AS question_count,
           COALESCE(SUM(marks),0)::int AS total_marks,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(source_type,'')) LIKE '%past%' OR LOWER(COALESCE(priority,'')) LIKE '%past%')::int AS past_paper_count,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(question_type,'')) LIKE '%long%')::int AS long_question_count,
           COUNT(*) FILTER (WHERE is_approved IS TRUE)::int AS approved_count
    FROM question_bank
    WHERE school_id=$1 AND COALESCE(is_duplicate,false)=false
    GROUP BY class_level, subject, COALESCE(chapter_name, 'Unmapped')
    ORDER BY subject, chapter_name
    LIMIT 3000
  `, [schoolId])
  const wantedSubjects = new Set((subjects || []).map(subjectKey).filter(Boolean))
  return result.rows.filter(row => {
    if (classLevel && !classMatches(row.class_level, classLevel)) return false
    if (wantedSubjects.size && !wantedSubjects.has(subjectKey(row.subject))) return false
    return true
  }).map(row => ({
    classLevel: clean(row.class_level, 80),
    subject: clean(row.subject, 160),
    chapterName: clean(row.chapter_name, 240),
    questionCount: Number(row.question_count || 0),
    totalMarks: Number(row.total_marks || 0),
    pastPaperCount: Number(row.past_paper_count || 0),
    longQuestionCount: Number(row.long_question_count || 0),
    approvedCount: Number(row.approved_count || 0),
  }))
}

async function curriculumReady(client) {
  const required = ['subject_offerings','curriculum_profiles','curriculum_profile_versions','learning_scope_identities','learning_scope_versions']
  for (const table of required) if (!(await tableExists(client, table))) return false
  return true
}

async function loadCurriculumScopes(client, schoolId, classLevel, subjects = []) {
  if (!(await curriculumReady(client))) return []
  const result = await client.query(`
    SELECT so.class_level, so.subject_name AS subject, so.medium, so.board_authority,
           cp.public_id AS curriculum_profile_id,
           cpv.version_number AS curriculum_version_number, cpv.label AS curriculum_label,
           cpv.curriculum_authority, cpv.status AS curriculum_status,
           lsi.public_id, lsi.canonical_key,
           lsv.scope_type, lsv.label, lsv.sort_order, lsv.metadata,
           COALESCE(mapping.source_locator, '{}'::jsonb) AS source_locator
    FROM subject_offerings so
    JOIN curriculum_profiles cp ON cp.school_id=so.school_id AND cp.subject_offering_id=so.id
    JOIN LATERAL (
      SELECT v.* FROM curriculum_profile_versions v
      WHERE v.school_id=cp.school_id AND v.curriculum_profile_id=cp.id
      ORDER BY (v.status='active') DESC, v.version_number DESC
      LIMIT 1
    ) cpv ON TRUE
    JOIN learning_scope_identities lsi ON lsi.school_id=so.school_id AND lsi.subject_offering_id=so.id
    JOIN learning_scope_versions lsv ON lsv.school_id=lsi.school_id AND lsv.learning_scope_id=lsi.id AND lsv.curriculum_profile_version_id=cpv.id
    LEFT JOIN LATERAL (
      SELECT rsm.source_locator
      FROM resource_scope_mappings rsm
      WHERE rsm.school_id=lsi.school_id AND rsm.learning_scope_id=lsi.id AND rsm.mapping_status IN ('ready','reviewed')
      ORDER BY (rsm.mapping_status='ready') DESC, rsm.id DESC
      LIMIT 1
    ) mapping ON TRUE
    WHERE so.school_id=$1
    ORDER BY so.subject_name, lsv.sort_order NULLS LAST, lsv.id
    LIMIT 4000
  `, [schoolId])
  const wantedSubjects = new Set((subjects || []).map(subjectKey).filter(Boolean))
  return result.rows.filter(row => {
    if (classLevel && !classMatches(row.class_level, classLevel)) return false
    if (wantedSubjects.size && !wantedSubjects.has(subjectKey(row.subject))) return false
    return true
  }).map(row => ({
    classLevel: clean(row.class_level, 80),
    subject: clean(row.subject, 160),
    medium: clean(row.medium, 40),
    boardAuthority: clean(row.board_authority, 160),
    curriculumProfileId: clean(row.curriculum_profile_id, 160),
    curriculumVersionNumber: Number(row.curriculum_version_number || 0),
    curriculumLabel: clean(row.curriculum_label, 180),
    curriculumAuthority: clean(row.curriculum_authority, 160),
    curriculumStatus: clean(row.curriculum_status, 40),
    publicId: clean(row.public_id, 160),
    canonicalKey: clean(row.canonical_key, 240),
    scopeType: clean(row.scope_type, 40),
    label: clean(row.label, 240),
    sortOrder: Number(row.sort_order || 0),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    sourceLocator: row.source_locator && typeof row.source_locator === 'object' ? row.source_locator : {},
  }))
}

async function loadPlanningContext(client, schoolId, filters = {}, access = {}) {
  const classLevel = clean(filters.classLevel, 80)
  const section = clean(filters.section, 80)
  const subjects = [...new Set((Array.isArray(filters.subjects) ? filters.subjects : []).map(value => clean(value, 160)).filter(Boolean))]
  // A single pg Client must not execute concurrent queries. Keep these reads sequential
  // inside the request-scoped RLS transaction so pg@9+ remains safe and deterministic.
  const academicSetup = await loadAcademicSetup(client, schoolId)
  const session = await loadSession(client, schoolId)
  const timetable = await loadTimetable(client, schoolId, classLevel, section)
  const questionBankSignals = await loadQuestionBankSignals(access.protectedReader || client, schoolId, classLevel, subjects)
  const curriculumScopes = await loadCurriculumScopes(access.protectedReader || client, schoolId, classLevel, subjects)
  const timetableSubjects = [...new Set(timetable.map(row => clean(row.subject, 160)).filter(Boolean))]
  const curriculumSubjects = [...new Set(curriculumScopes.map(row => clean(row.subject, 160)).filter(Boolean))]
  const qbankSubjects = [...new Set(questionBankSignals.map(row => clean(row.subject, 160)).filter(Boolean))]
  const warnings = []
  if (!timetable.length) warnings.push('No timetable rows matched this class/section. Planning dates require teacher confirmation.')
  if (!curriculumScopes.length) warnings.push('No versioned curriculum scopes matched this class/subject selection. Official curriculum sequencing will not be invented.')
  if (!questionBankSignals.length) warnings.push('Question Bank has no matching chapter signals yet; assessment emphasis will be limited.')
  warnings.push('Authoritative school holiday/event calendar is not configured yet; review blackout dates before finalizing.')
  return {
    academicSetup,
    session,
    timetable,
    questionBankSignals,
    curriculumScopes,
    availableSubjects: [...new Set([...timetableSubjects, ...curriculumSubjects, ...qbankSubjects])],
    holidayCalendarAvailable: false,
    warnings,
  }
}

module.exports = { loadPlanningContext }
