// Server-backed family grouping store. Browser storage is cache only; student.family_code is canonical.
import { useCallback, useEffect, useState } from 'react'
import api from './api'
import { getTenantStorageItem, setTenantStorageItem } from './tenantStorage'

const STORE_KEY = 'al_siddique_families_v2_cache'

function normalizeId(value) {
 if (value === null || value === undefined) return ''
 return String(value).trim()
}

function normalizeFamilies(value) {
 return (Array.isArray(value) ? value : [])
 .filter(family => family && family.code)
 .map(family => ({
 id: family.id ?? null,
 code: String(family.code),
 fatherName: family.fatherName || family.father_name || '',
 phone: family.phone || '',
 createdAt: family.createdAt || family.created_at || null,
 registered: family.registered !== false,
 students: (Array.isArray(family.students) ? family.students : []).map(student => ({
 id: student.id,
 name: student.name || '',
 gr: student.gr || student.gr_number || '',
 class: student.class || '',
 section: student.section || '',
 })),
 }))
}

function loadCache() {
 try {
 const raw = getTenantStorageItem(STORE_KEY, { migrateLegacy:true, removeLegacyOnMigrate:true })
 return normalizeFamilies(raw ? JSON.parse(raw) : [])
 } catch {
 return []
 }
}

function saveCache(families) {
 try { setTenantStorageItem(STORE_KEY, JSON.stringify(families)) } catch { /* cache writes are best-effort only */ }
}

export function useFamilyStore() {
 const [families, setFamilies] = useState(loadCache)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')

 const refreshFamilies = useCallback(async () => {
 setLoading(true)
 setError('')
 try {
 const response = await api.get('/api/families')
 const next = normalizeFamilies(response.data?.data)
 setFamilies(next)
 saveCache(next)
 return next
 } catch (err) {
 setError(err.response?.data?.message || 'Families could not be loaded.')
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 // Server is authoritative; cache only prevents an empty flash while hydrating.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void refreshFamilies()
 }, [refreshFamilies])

 const getFamilyForStudent = useCallback((studentId) => {
 const id = normalizeId(studentId)
 return families.find(family => family.students.some(student => normalizeId(student.id) === id)) || null
 }, [families])

 const createFamily = useCallback(async (fatherName, phone = '') => {
 const response = await api.post('/api/families', { father_name: fatherName, phone })
 await refreshFamilies()
 return response.data?.data?.code || ''
 }, [refreshFamilies])

 const addStudentToFamily = useCallback(async (familyCode, student) => {
 if (!familyCode || !student?.id) return false
 await api.post(`/api/families/${encodeURIComponent(familyCode)}/students/${student.id}`)
 await refreshFamilies()
 return true
 }, [refreshFamilies])

 const removeStudentFromFamily = useCallback(async (familyCode, studentId) => {
 if (!familyCode || !studentId) return false
 await api.delete(`/api/families/${encodeURIComponent(familyCode)}/students/${studentId}`)
 await refreshFamilies()
 return true
 }, [refreshFamilies])

 // Compatibility alias: family assignment is now a persisted server mutation.
 const assignFamily = addStudentToFamily

 // Historical name retained for callers; no heuristic auto-linking occurs anymore.
 const autoDetectFamilies = useCallback(async () => refreshFamilies(), [refreshFamilies])

 return {
 families,
 loading,
 error,
 refreshFamilies,
 assignFamily,
 getFamilyForStudent,
 addStudentToFamily,
 removeStudentFromFamily,
 createFamily,
 autoDetectFamilies,
 }
}
