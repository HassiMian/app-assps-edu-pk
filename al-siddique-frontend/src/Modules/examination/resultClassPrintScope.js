import { schoolClassOrderKey } from '../../services/schoolClassOrder.js'

const FIRST_TERM_EXAM_9_ORDER_KEYS = new Set([
  'starter', 'mover', 'flyer', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'
])
export function isFirstTermExamNine(examObj) {
  if (!examObj) return false
  const idNum = Number(examObj.id)
  return idNum === 9 || (idNum === 9 && /first\s+term/i.test(String(examObj.name || '')))
}

export function isClassAllowedForExam(examObj, className) {
  if (!isFirstTermExamNine(examObj)) return true
  if (!className) return false
  const key = schoolClassOrderKey(className)
  return FIRST_TERM_EXAM_9_ORDER_KEYS.has(key)
}
