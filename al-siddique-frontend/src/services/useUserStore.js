import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_TEACHER_PERMISSIONS } from './permissions'

const STORE_KEY = 'al_siddique_users'
const YEAR = new Date().getFullYear()

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

//  Credential Generators 
export function genTeacherCreds(emp) {
 const raw = String(emp.emp_id || emp.id || '')
 const num = raw.replace(/\D/g, '').padStart(3, '0') || String(Date.now()).slice(-3)
 const username = `T-${num}`
 const first = (emp.name || 'Teacher').trim().split(/\s+/)[0]
 const password = `${first}@${YEAR}`
 return { username, password }
}

export function genStudentCreds(student) {
 const username = student.gr_number || student.gr || `GR-${student.id}`
 const father = (student.father_name || student.father || 'Student')
 .trim().replace(/\s+/g, '').slice(0, 4)
 const password = `${father}${YEAR}`
 return { username, password }
}

export function genParentCreds(student) {
 const gr = (student.gr_number || student.gr || `${student.id}`).replace(/\D/g, '')
 const username = `P-${gr}`
 const phone = (student.parent_phone || student.whatsapp || student.contact || '')
 .replace(/\D/g, '').slice(-4) || '0000'
 const password = `${phone}@${YEAR}`
 return { username, password }
}

//  Raw store (usable outside React) 
let _data = (() => {
 try { return JSON.parse(getStorage()?.getItem(STORE_KEY) || '[]') }
 catch { return [] }
})()
let _listeners = []

function persist() {
 const storage = getStorage()
 try { storage?.setItem(STORE_KEY, JSON.stringify(_data)) } catch {}
 _listeners.forEach(fn => fn([..._data]))
}

export function getUserByUsername(username) {
 return _data.find(u => u.username === username)
}

export function getUserByEntity(entityId, role) {
 return _data.find(u => String(u.entityId) === String(entityId) && u.role === role)
}

export function upsertUser(user) {
 const idx = _data.findIndex(u => u.id === user.id)
 if (idx >= 0) _data[idx] = { ..._data[idx], ...user }
 else _data.push(user)
 persist()
 return _data.find(u => u.id === user.id)
}

export function removeUser(id) {
 _data = _data.filter(u => u.id !== id)
 persist()
}

//  React Hook 
export function useUserStore() {
 const [users, setUsers] = useState([..._data])

 useEffect(() => {
 const refresh = updated => setUsers(updated)
 _listeners.push(refresh)
 return () => { _listeners = _listeners.filter(f => f !== refresh) }
 }, [])

 // Teacher
 const generateTeacher = useCallback((emp) => {
 const existing = getUserByEntity(emp.id, 'teacher')
 if (existing) return existing
 return upsertUser({
 id: `T_${emp.id}`,
 ...genTeacherCreds(emp),
 role: 'teacher',
 entityId: emp.id,
 name: emp.name,
 designation: emp.designation || '',
 isActive: true,
 permissions: [...DEFAULT_TEACHER_PERMISSIONS],
 createdAt: new Date().toISOString(),
 lastLogin: null,
 })
 }, [])

 const regenerateTeacher = useCallback((emp) => {
 return upsertUser({
 id: `T_${emp.id}`,
 ...genTeacherCreds(emp),
 role: 'teacher',
 entityId: emp.id,
 name: emp.name,
 designation: emp.designation || '',
 isActive: getUserByEntity(emp.id, 'teacher')?.isActive | true,
 createdAt: getUserByEntity(emp.id, 'teacher')?.createdAt || new Date().toISOString(),
 lastLogin: getUserByEntity(emp.id, 'teacher')?.lastLogin || null,
 })
 }, [])

 // Student
 const generateStudent = useCallback((student) => {
 const id = `S_${student.id || student.gr_number || student.gr}`
 const existing = getUserByEntity(student.id || student.gr_number, 'student')
 if (existing) return existing
 return upsertUser({
 id,
 ...genStudentCreds(student),
 role: 'student',
 entityId: student.id || student.gr_number,
 name: student.name,
 class: student.class,
 section: student.section,
 isActive: true,
 createdAt: new Date().toISOString(),
 lastLogin: null,
 })
 }, [])

 const regenerateStudent = useCallback((student) => {
 const id = `S_${student.id || student.gr_number || student.gr}`
 const existing = getUserByEntity(student.id || student.gr_number, 'student')
 return upsertUser({
 id,
 ...genStudentCreds(student),
 role: 'student',
 entityId: student.id || student.gr_number,
 name: student.name,
 class: student.class,
 section: student.section,
 isActive: existing?.isActive | true,
 createdAt: existing?.createdAt || new Date().toISOString(),
 lastLogin: existing?.lastLogin || null,
 })
 }, [])

 // Parent
 const generateParent = useCallback((student) => {
 const id = `P_${student.id || student.gr_number || student.gr}`
 const existing = getUserByEntity(student.id || student.gr_number, 'parent')
 if (existing) return existing
 return upsertUser({
 id,
 ...genParentCreds(student),
 role: 'parent',
 entityId: student.id || student.gr_number,
 name: student.father_name || student.father || (student.name + "'s Father"),
 studentName: student.name,
 studentGr: student.gr_number || student.gr,
 isActive: true,
 createdAt: new Date().toISOString(),
 lastLogin: null,
 })
 }, [])

 const regenerateParent = useCallback((student) => {
 const id = `P_${student.id || student.gr_number || student.gr}`
 const existing = getUserByEntity(student.id || student.gr_number, 'parent')
 return upsertUser({
 id,
 ...genParentCreds(student),
 role: 'parent',
 entityId: student.id || student.gr_number,
 name: student.father_name || student.father || (student.name + "'s Father"),
 studentName: student.name,
 studentGr: student.gr_number || student.gr,
 isActive: existing?.isActive | true,
 createdAt: existing?.createdAt || new Date().toISOString(),
 lastLogin: existing?.lastLogin || null,
 })
 }, [])

 const setPermissions = useCallback((userId, permissions) => {
 const u = _data.find(u => u.id === userId)
 if (u) upsertUser({ ...u, permissions })
 }, [])

 const resetPassword = useCallback((userId, newPassword) => {
 const u = _data.find(u => u.id === userId)
 if (u) upsertUser({ ...u, password: newPassword })
 }, [])

 const toggleBlock = useCallback((userId) => {
 const u = _data.find(u => u.id === userId)
 if (u) upsertUser({ ...u, isActive: !u.isActive })
 }, [])

 const deleteAccess = useCallback((userId) => {
 removeUser(userId)
 }, [])

 const getByEntity = useCallback((entityId, role) => {
 return getUserByEntity(entityId, role)
 }, [])

 return {
 users,
 generateTeacher, regenerateTeacher,
 generateStudent, regenerateStudent,
 generateParent, regenerateParent,
 setPermissions,
 resetPassword,
 toggleBlock,
 deleteAccess,
 getByEntity,
 }
}
