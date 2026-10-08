'use strict'
const crypto = require('node:crypto')
const SCHOOL_CODE_PATTERN = /^[a-z][a-z0-9-]{1,63}$/
const DISALLOWED_FLAGS = ['--approve','--approved','--auto-approve','--reviewed','--ready','--publish','--non-provisional']

function seedPolicy(argv) {
  const argvList = Array.isArray(argv) ? argv : []
  for (const flag of DISALLOWED_FLAGS) {
    if (argvList.some(arg => arg === flag || arg.startsWith(flag+'='))) {
      throw new Error('SEED_AUTO_APPROVAL_FORBIDDEN: reviewed publication must pass Question Bank governance')
    }
  }
  const entries = argvList.filter(arg=>arg==='--school-code'||arg.startsWith('--school-code='))
  if (entries.length !== 1) {
    throw new Error('EXACT_SCHOOL_CODE_REQUIRED: supply exactly one --school-code (school name is ambiguous)')
  }
  const i = argvList.indexOf('--school-code')
  const value = i < 0 ? entries[0].slice('--school-code='.length) : argvList[i+1]
  const code = String(value || '').trim().toLowerCase()
  if (!SCHOOL_CODE_PATTERN.test(code)) throw new Error('INVALID_EXACT_SCHOOL_CODE')
  if (argvList.some(arg=>arg==='--school'||arg.startsWith('--school='))) {
    throw new Error('AMBIGUOUS_SCHOOL_NAME_FORBIDDEN: use only --school-code')
  }
  const apply = argvList.includes('--apply')
  if (apply && !argvList.includes('--provisional')) {
    throw new Error('PROVISIONAL_FLAG_REQUIRED: seed intake cannot publish approved questions')
  }
  return Object.freeze({ schoolCode:code, apply, provisional:true })
}

function seedEvidence(record={}, sourceSha256='') {
  const payload = [
    record.class_level || record.classLevel || record.class || '',
    record.subject || '',
    record.chapter_no || record.chapterNo || '',
    record.question_text || record.questionText || record.text || '',
    record.correct_option || record.correctOption || '',
    record.answer || '',
  ]
  return {
    provisional_internal: true,
    review_state:'provisional_internal',
    seed_input_sha256: /^[0-9a-f]{64}$/i.test(sourceSha256) ? sourceSha256 : null,
    record_sha256: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
  }
}

function optionQuality(rows) {
  const counts={A:0,B:0,C:0,D:0,OTHER:0}
  for (const row of rows) {
    const type=String(row.questionType || row.question_type || '').toLowerCase()
    if (type!=='mcq') continue
    const key=String(row.correctOption || row.correct_option || '').trim().toUpperCase()
    if (key in counts && key !== 'OTHER') counts[key]++
    else counts.OTHER++
  }
  const total=Object.values(counts).reduce((sum,v)=>sum+v,0)
  const peak=Math.max(0,counts.A,counts.B,counts.C,counts.D)
  return {
    total,distribution:counts,largestShare:total?Number((peak/total).toFixed(4)):0,
    editorialReviewRequired:total>=20 && peak/total>0.8,
  }
}
module.exports = { SCHOOL_CODE_PATTERN, DISALLOWED_FLAGS, seedPolicy, seedEvidence, optionQuality }
