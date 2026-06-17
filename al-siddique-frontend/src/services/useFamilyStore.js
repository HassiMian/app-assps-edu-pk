// src/services/useFamilyStore.js — Al Siddique Smart School OS
// Family grouping system: auto-detects same-parent students, assigns family codes
import { useState, useEffect, useCallback } from 'react'

const STORE_KEY = 'al_siddique_families_v1'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 // LocalStorage may be blocked in some browser/privacy modes.
 return null
 }
}

function generateFamilyCode() {
 const n = Math.floor(1000 + Math.random() * 9000)
 return `FAM-${n}`
}

function safeArray(value) {
 return Array.isArray(value) ? value : []
}

function normalizeId(value) {
 if (value === null || value === undefined) return ''
 return String(value).trim()
}

function normalizePhone(value) {
 return String(value || '').replace(/\D/g, '').slice(-10)
}

function loadFamilies() {
 try {
 const raw = getStorage()?.getItem(STORE_KEY)
 return normalizeFamilies(raw ? JSON.parse(raw) : [])
 } catch { return [] }
}

function saveFamilies(data) {
 const storage = getStorage()
 try { storage?.setItem(STORE_KEY, JSON.stringify(data)) } catch {
 // Ignore storage write failures in restricted browser modes.
 }
}

// Normalize a name for comparison: lowercase, strip extra spaces
function normName(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim() }

function getFamilyKeyFromFamily(family = {}) {
 const fatherKey = normName(family.fatherName)
 const phoneKey = normalizePhone(family.phone)
 return fatherKey ? `father:${fatherKey}` : (phoneKey ? `phone:${phoneKey}` : '')
}

function getFamilyKeyFromStudent(student = {}) {
 // DB family_code is the most authoritative key - use it first
 const explicitCode = normalizeId(student.family_code || student.familyCode)
 if (explicitCode) return `code:${explicitCode.toLowerCase()}`

 // Only fall back to CNIC — never use father name or phone alone as they cause false positives
 const cnicKey = normalizePhone(student.father_cnic || student.parent_cnic || student.cnic)
 if (cnicKey.length >= 5) return `cnic:${cnicKey}`

 // Use father name only as last resort
 const fatherKey = normName(student.father || student.father_name)
 if (fatherKey && fatherKey.length >= 3) return `father:${fatherKey}`
 return ''
}

function normalizeStudentRef(student = {}) {
 const id = normalizeId(student.id ?? student.student_id ?? student.studentId)
 const name = String(student.name || student.student_name || '').trim()
 return {
 id,
 name,
 }
}

function mergeStudentLists(...lists) {
 const byId = new Map()
 const fallback = []

 lists.flat().forEach(student => {
 if (!student) return
 const normalized = normalizeStudentRef(student)
 const key = normalized.id || normalizeId(student.name || student.student_name)
 if (key) {
 const existing = byId.get(key)
 if (existing) {
 byId.set(key, {
 ...existing,
 ...normalized,
 name: normalized.name || existing.name,
 })
 return
 }
 byId.set(key, normalized)
 return
 }
 fallback.push(normalized)
 })

 return [...byId.values(), ...fallback]
}

function mergeFamilyEntries(target = {}, source = {}) {
 return {
 ...target,
 ...source,
 code: target.code || source.code || generateFamilyCode(),
 fatherName: target.fatherName || source.fatherName || '',
 phone: target.phone || source.phone || '',
 createdAt: target.createdAt || source.createdAt || new Date().toISOString(),
 students: mergeStudentLists(target.students || [], source.students || []),
 }
}

function normalizeFamilies(families = []) {
 const byKey = new Map()
 const merged = []

 safeArray(families).forEach(rawFamily => {
 if (!rawFamily) return
 const family = {
 ...rawFamily,
 code: rawFamily.code || generateFamilyCode(),
 fatherName: rawFamily.fatherName || '',
 phone: rawFamily.phone || '',
 createdAt: rawFamily.createdAt || new Date().toISOString(),
 students: mergeStudentLists(rawFamily.students || []),
 }

 const familyKey = getFamilyKeyFromFamily(family)
 const overlap = merged.find(item => {
 const itemIds = new Set((item.students || []).map(s => normalizeId(s.id)))
 return (family.students || []).some(student => student.id && itemIds.has(normalizeId(student.id)))
 })

 const keyMatch = familyKey && byKey.get(familyKey)
 const match = overlap || keyMatch || null

 if (match) {
 const next = mergeFamilyEntries(match, family)
 const index = merged.findIndex(item => item.code === match.code)
 if (index >= 0) merged[index] = next
 byKey.set(getFamilyKeyFromFamily(next), next)
 return
 }

 merged.push(family)
 if (familyKey) byKey.set(familyKey, family)
 })

 return merged
}

function upsertStudentIntoFamilies(prevFamilies, student) {
 if (!student) return prevFamilies

 const normalizedStudent = normalizeStudentRef(student)
 const studentKey = normalizedStudent.id || normalizeId(student.name || student.student_name)
 const familyKey = getFamilyKeyFromStudent(student)

 const current = prevFamilies.map(f => ({
 ...f,
 students: mergeStudentLists(f.students || []),
 }))

 const matchedIndex = current.findIndex(f => {
 const alreadyLinked = (f.students || []).some(s => normalizeId(s.id) && normalizeId(s.id) === studentKey)
 const sameFamily = familyKey && getFamilyKeyFromFamily(f) === familyKey
 return alreadyLinked || sameFamily
 })

 if (matchedIndex >= 0) {
 const next = {
 ...current[matchedIndex],
 students: mergeStudentLists(current[matchedIndex].students || [], [normalizedStudent]),
 }
 current[matchedIndex] = next
 return normalizeFamilies(current)
 }

 return normalizeFamilies([
 ...current,
 {
 code: generateFamilyCode(),
 fatherName: String(student.father || student.father_name || '').trim(),
 phone: normalizePhone(student.phone || student.contact || student.parent_phone),
 students: [normalizedStudent],
 createdAt: new Date().toISOString(),
 },
 ])
}

function buildFamiliesFromStudents(students = []) {
 const byKey = new Map()

 safeArray(students).forEach(student => {
 const familyKey = getFamilyKeyFromStudent(student)
 if (!familyKey) return

 const normalizedStudent = normalizeStudentRef(student)
 if (!normalizedStudent.id && !normalizedStudent.name) return

 const current = byKey.get(familyKey) || {
 code: generateFamilyCode(),
 fatherName: String(student.father || student.father_name || '').trim(),
 phone: normalizePhone(student.phone || student.contact || student.parent_phone),
 students: [],
 createdAt: new Date().toISOString(),
 }

 byKey.set(familyKey, {
 ...current,
 fatherName: current.fatherName || String(student.father || student.father_name || '').trim(),
 phone: current.phone || normalizePhone(student.phone || student.contact || student.parent_phone),
 students: mergeStudentLists(current.students, [normalizedStudent]),
 })
 })

 return normalizeFamilies(Array.from(byKey.values()))
}

export function useFamilyStore() {
 const [families, setFamilies] = useState(loadFamilies)

 // Persist on every change
 useEffect(() => { saveFamilies(families) }, [families])

 /** Find or create a family for a given student */
 const assignFamily = useCallback((student) => {
 if (!student) return null
 setFamilies(prev => upsertStudentIntoFamilies(prev, student))
 }, [])

 /** Get the family for a student ID */
 const getFamilyForStudent = useCallback((studentId) => {
 return families.find(f => (f.students || []).some(s => String(s.id) === String(studentId))) || null
 }, [families])

 /** Manually assign student to a family code */
 const addStudentToFamily = useCallback((familyCode, student) => {
 setFamilies(prev => normalizeFamilies(prev.map(f => {
 if (f.code !== familyCode) return f
 return {
 ...f,
 students: mergeStudentLists(f.students || [], [student]),
 }
 })))
 }, [])

 /** Remove student from family */
 const removeStudentFromFamily = useCallback((familyCode, studentId) => {
 setFamilies(prev => normalizeFamilies(prev.map(f => {
 if (f.code !== familyCode) return f
 return { ...f, students: (f.students || []).filter(s => normalizeId(s.id) !== normalizeId(studentId)) }
 }).filter(f => (f.students || []).length > 0)))
 }, [])

 /** Create a blank family manually */
 const createFamily = useCallback((fatherName, phone = '') => {
 const newFamily = {
 code: generateFamilyCode(),
 fatherName: fatherName || '',
 phone: phone,
 students: [],
 createdAt: new Date().toISOString(),
 }
 setFamilies(prev => normalizeFamilies([...prev, newFamily]))
 return newFamily.code
 }, [])

 /** Auto-scan a list of students and build families */
 const autoDetectFamilies = useCallback((students) => {
 if (!students?.length) return
 setFamilies(buildFamiliesFromStudents(students))
 }, [])

 return {
 families,
 assignFamily,
 getFamilyForStudent,
 addStudentToFamily,
 removeStudentFromFamily,
 createFamily,
 autoDetectFamilies,
 }
}
