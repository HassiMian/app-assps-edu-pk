import { useState, useEffect, useCallback } from 'react'
import api from './api'
import { useAuth } from '../context/AuthContext'

let _cache = []
let _cacheScope = null
let _listeners = []

function notify() { _listeners.forEach(fn => fn()) }

function studentScope(user = {}) {
 const raw = user?.tenant_id || user?.tenantId || user?.school_id || user?.schoolId || user?.school_code || user?.schoolCode || user?.email || 'public'
 return String(raw).trim().toLowerCase() || 'public'
}

function resetForScope(scope) {
 const nextScope = String(scope || 'public')
 if (_cacheScope === nextScope) return
 _cacheScope = nextScope
 _cache = []
 notify()
}

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

async function fetchFromAPI(scope = _cacheScope || 'public') {
  const requestScope = String(scope || 'public')
  try {
    const res = await api.get('/api/students?active=all', { skipCache:true })
    if (_cacheScope !== requestScope) return []
    _cache = dedupeStudents(Array.isArray(res.data?.data) ? res.data.data : [])
    notify()
    return _cache
  } catch (error) {
    if (_cacheScope === requestScope) {
      _cache = []
      notify()
    }
    throw error
  }
}

export async function refreshStudents() {
  return fetchFromAPI()
}

export function useStudentStore() {
  const { user } = useAuth()
  const scope = studentScope(user)
  const [students, setStudents] = useState([])

  useEffect(() => {
    resetForScope(scope)
    const refresh = () => setStudents([..._cache])
    _listeners.push(refresh)
    refresh()
    void fetchFromAPI(scope).catch((error) => console.error('Student directory load failed:', error?.message || error))
    return () => { _listeners = _listeners.filter(f => f !== refresh) }
  }, [scope])

  const addStudent = useCallback(async (data) => {
    const res = await api.post('/api/students', data)
    await fetchFromAPI(scope)
    return res.data?.data || null
  }, [scope])

  const deleteStudent = useCallback(async (id, permanent = false) => {
    const res = await api.delete(`/api/students/${id}${permanent ? '?permanent=true' : ''}`)
    await fetchFromAPI(scope)
    return res.data?.data || { success: res.data?.success !== false }
  }, [scope])

  const updateStudent = useCallback(async (id, patch) => {
    const res = await api.put(`/api/students/${id}`, patch)
    await fetchFromAPI(scope)
    return res.data?.data || null
  }, [scope])

  return { students, addStudent, deleteStudent, updateStudent }
}
