import { useState, useEffect, useCallback } from 'react'
import api from './api'

let _cache = []
let _listeners = []

function notify() { _listeners.forEach(fn => fn()) }

function normalizeText(value) {
 return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizePhone(value) {
 return String(value || '').replace(/\D/g, '').slice(-10)
}

function normalizeDate(value) {
 if (!value) return ''
 return String(value).split('T')[0]
}

function studentKey(student = {}) {
 const schoolId = student.school_id || 'default'
 const gr = String(student.gr_number || student.gr || '').trim().toLowerCase()
 if (gr) return `${schoolId}:gr:${gr}`
 return [
 schoolId,
 normalizeText(student.name),
 normalizeText(student.father_name || student.father),
 normalizeDate(student.date_of_birth || student.dob),
 normalizePhone(student.parent_phone || student.parent_whatsapp || student.phone || student.contact),
 ].join('|')
}

function isMoreComplete(candidate = {}, current = {}) {
 const fields = ['name', 'father_name', 'father', 'mother_name', 'class', 'section', 'roll_number', 'date_of_birth', 'gender', 'address', 'parent_phone', 'parent_whatsapp', 'photo']
 const candidateScore = fields.reduce((score, field) => score + (candidate[field] ? 1 : 0), 0)
 const currentScore = fields.reduce((score, field) => score + (current[field] ? 1 : 0), 0)
 if (candidateScore !== currentScore) return candidateScore > currentScore
 return Number(candidate.id || 0) > Number(current.id || 0)
}

function dedupeStudents(students = []) {
 const byKey = new Map()
 students.forEach(student => {
 const key = studentKey(student)
 const current = byKey.get(key)
 if (!current || isMoreComplete(student, current)) byKey.set(key, student)
 })
 return Array.from(byKey.values())
}

async function fetchFromAPI() {
 try {
 const res = await api.get('/api/students')
 _cache = dedupeStudents(res.data.data || [])
 notify()
 } catch {
 // Keep the last known cache if the student API is temporarily unavailable.
 }
}

export async function refreshStudents() {
  await fetchFromAPI()
}

export function useStudentStore() {
 const [students, setStudents] = useState(_cache)

 useEffect(() => {
 const refresh = () => setStudents([..._cache])
 _listeners.push(refresh)
 fetchFromAPI()
 return () => { _listeners = _listeners.filter(f => f !== refresh) }
 }, [])

 const addStudent = useCallback(async (data) => {
 const res = await api.post('/api/students', data)
 await fetchFromAPI()
 return res.data?.data || res.data || data
 }, [])

 const deleteStudent = useCallback(async (id) => {
 await api.delete(`/api/students/${id}`)
 await fetchFromAPI()
 }, [])

 const updateStudent = useCallback(async (id, patch) => {
 await api.put(`/api/students/${id}`, patch)
 await fetchFromAPI()
 }, [])

 return { students, addStudent, deleteStudent, updateStudent }
}
