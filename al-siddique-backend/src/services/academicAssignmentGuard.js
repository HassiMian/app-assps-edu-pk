class AcademicAssignmentError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'AcademicAssignmentError'
    this.code = code
    this.status = 422
    this.details = details
  }
}

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en')
}

async function resolveAcademicAssignment({ schoolId, className, section, allowEmptySection = false }) {
  const requestedClass = String(className ?? '').trim()
  const requestedSection = String(section ?? '').trim()
  if (!requestedClass) {
    throw new AcademicAssignmentError('CLASS_REQUIRED', 'Class is required.')
  }

  const { query } = require('../config/database')
  const result = await query(
    `SELECT academic_setup
     FROM settings
     WHERE school_id = $1
     LIMIT 1`,
    [schoolId],
  )

  const setup = result.rows[0]?.academic_setup
  const classes = Array.isArray(setup?.classes) ? setup.classes : []

  // Transitional compatibility: enforce only after the school has a configured server-side setup.
  if (!classes.length) {
    return {
      enforced: false,
      className: requestedClass,
      section: requestedSection,
    }
  }

  const classRecord = classes.find(item => item?.active !== false && normalize(item?.name) === normalize(requestedClass))
  if (!classRecord) {
    throw new AcademicAssignmentError(
      'UNKNOWN_CLASS',
      `Class "${requestedClass}" is not registered in Academic Setup.`,
      { className: requestedClass },
    )
  }

  const canonicalClassName = String(classRecord.name).trim()
  const sections = Array.isArray(classRecord.sections)
    ? classRecord.sections.map(value => String(value ?? '').trim()).filter(Boolean)
    : []

  if (!requestedSection && allowEmptySection) {
    return { enforced: true, className: canonicalClassName, section: '' }
  }

  if (!requestedSection && sections.length) {
    throw new AcademicAssignmentError(
      'SECTION_REQUIRED',
      `Section is required for class "${canonicalClassName}".`,
      { className: canonicalClassName, allowedSections: sections },
    )
  }

  if (!sections.length) {
    return { enforced: true, className: canonicalClassName, section: requestedSection }
  }

  const canonicalSection = sections.find(value => normalize(value) === normalize(requestedSection))
  if (!canonicalSection) {
    throw new AcademicAssignmentError(
      'UNKNOWN_SECTION',
      `Section "${requestedSection}" is not registered for class "${canonicalClassName}".`,
      { className: canonicalClassName, section: requestedSection, allowedSections: sections },
    )
  }

  return { enforced: true, className: canonicalClassName, section: canonicalSection }
}

module.exports = { AcademicAssignmentError, resolveAcademicAssignment }
