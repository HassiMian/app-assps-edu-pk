'use strict'

const USER_ROLES = Object.freeze({ OWNER:'OWNER', ADMIN:'ADMIN', PARENT:'PARENT', PUBLIC:'PUBLIC', UNKNOWN:'UNKNOWN' })

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return ''
  let value = String(rawPhone).trim().replace(/^(?:whatsapp|tel):/i, '').trim()
  let digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) digits = `92${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('3')) digits = `92${digits}`
  return digits
}

function configuredNumbers(...values) {
  const set = new Set()
  for (const value of values) {
    if (!value) continue
    for (const item of String(value).split(/[;,\s]+/)) {
      const normalized = normalizePhoneNumber(item)
      if (normalized) set.add(normalized)
    }
  }
  return set
}

function resolveUserRole(rawPhone) {
  const normalized = normalizePhoneNumber(rawPhone)
  if (!normalized) return USER_ROLES.UNKNOWN
  if (configuredNumbers(process.env.WHATSAPP_OWNER_NUMBER).has(normalized)) return USER_ROLES.OWNER
  if (configuredNumbers(process.env.WHATSAPP_ADMIN_NUMBER, process.env.JARVIS_WHATSAPP_COMMANDERS).has(normalized)) return USER_ROLES.ADMIN
  return USER_ROLES.PUBLIC
}

function isOwner(rawPhone) {
  const normalized = normalizePhoneNumber(rawPhone)
  return Boolean(normalized && configuredNumbers(process.env.WHATSAPP_OWNER_NUMBER).has(normalized))
}

function requireConfiguredSchoolId(env = process.env) {
  const schoolId = Number.parseInt(String(env.WHATSAPP_SCHOOL_ID || ''), 10)
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    const error = new Error('WHATSAPP_SCHOOL_ID must be explicitly configured for the school channel.')
    error.code = 'WHATSAPP_SCHOOL_CONTEXT_REQUIRED'
    throw error
  }
  return schoolId
}

function formatSchoolScopeRestriction(language='ROMAN_URDU') {
  if (language === 'URDU_SCRIPT') return 'یہ ASSPS اسکول اسسٹنٹ صرف اسکول آپریشنز، طلبہ، فیس، حاضری اور داخلوں کے لیے ہے۔ مارکیٹ یا ٹریڈنگ انٹیلیجنس اس چینل پر دستیاب نہیں ہے۔'
  if (language === 'ENGLISH') return 'This ASSPS school assistant is limited to school operations, students, fees, attendance, and admissions. Market or trading intelligence is not available on this channel.'
  return 'Ye ASSPS school assistant sirf school operations, students, fees, attendance aur admissions ke liye hai. Market ya trading intelligence is channel par available nahi hai.'
}

module.exports = { USER_ROLES, normalizePhoneNumber, resolveUserRole, isOwner, requireConfiguredSchoolId, formatSchoolScopeRestriction }
