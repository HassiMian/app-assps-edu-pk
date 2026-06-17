// src/context/AuthContext.jsx
// Al Siddique Smart School OS — Real JWT Authentication

import { createContext, useContext, useState, useEffect } from 'react'
import api, { clearAuthSession, getAuthToken, getAuthUser, getRefreshToken, setAuthSession } from '../services/api'
import { getUserByUsername, upsertUser } from '../services/useUserStore'
const AuthContext = createContext(null)
const MAX_SESSION_MS = 12 * 60 * 60 * 1000

export function AuthProvider({ children }) {
 const [user, setUser] = useState(null)
 const [loading, setLoading] = useState(true)

 //  Force-logout event from API interceptor (401 responses) 
 useEffect(() => {
 const handleForceLogout = () => setUser(null)
 window.addEventListener('auth:logout', handleForceLogout)
 return () => window.removeEventListener('auth:logout', handleForceLogout)
 }, [])

 //  On app start — restore session from localStorage 
 useEffect(() => {
 const loadingGuard = window.setTimeout(() => setLoading(false), 8000)
 const token = getAuthToken()
 const refreshToken = getRefreshToken()
 const saved = getAuthUser()
 if (token && saved) {
 try {
 const loginAt = Number(localStorage.getItem('al_siddique_login_at') || 0)
 if (loginAt && Date.now() - loginAt > MAX_SESSION_MS) {
 clearAuthSession()
 localStorage.removeItem('al_siddique_login_at')
 setUser(null)
 setLoading(false)
 return
 }
 // Local tokens (teacher/student/parent) don't need API verification
 if (token.startsWith('local_')) {
 setUser(saved)
 setLoading(false)
 return
 }
 // Optimistically restore session from localStorage first
 setUser(saved)
 api.get('/api/auth/me').then(res => {
 if (res.data?.user) {
 setUser(res.data.user)
 setAuthSession(token, refreshToken, res.data.user)
 }
 }).catch((err) => {
 // Only clear session on definitive 401 (token invalid), not on network/server errors
 if (err?.response?.status === 401) {
 clearAuthSession()
 setUser(null)
 }
 // On 500, network error, timeout etc. — keep the saved user in session
 }).finally(() => {
 setLoading(false)
 })
 } catch {
 // Keep saved user even if something unexpected happens
 setUser(saved)
 setLoading(false)
 }
 } else {
 setLoading(false)
 }
 return () => window.clearTimeout(loadingGuard)
 }, [])

 //  Login 
 async function login(username, password, schoolContext) {
 // 1. Check teacher / student / parent credentials first
 const storeUser = getUserByUsername(username.trim())
 if (storeUser) {
 if (!storeUser.isActive) {
 return { success: false, message: 'This account has been blocked. Please contact the administrator.' }
 }
 if (storeUser.password === password) {
 upsertUser({ ...storeUser, lastLogin: new Date().toISOString() })
 const localToken = `local_${storeUser.id}_${Date.now()}`
 setAuthSession(localToken, null, storeUser)
 localStorage.setItem('al_siddique_login_at', String(Date.now()))
 setUser(storeUser)
 return { success: true, user: storeUser }
 } else {
 return { success: false, message: 'Incorrect password. Please try again.' }
 }
 }

 // 2. Fall through to API (admin / principal login)
 try {
 const payload = { email: username, password }
 if (schoolContext?.school_id) payload.school_id = schoolContext.school_id
 if (schoolContext?.school_code) payload.school_code = schoolContext.school_code
 const res = await api.post('/api/auth/login', payload)
 const { token, refreshToken, user } = res.data
 if (token) {
 setAuthSession(token, refreshToken, user)
 localStorage.setItem('al_siddique_login_at', String(Date.now()))
 }
 setUser(user)
 return { success: true, user }
 } catch (err) {
 const message = err.response?.data?.message || 'Login failed — unable to connect to the server.'
 return { success: false, message }
 }
 }

 //  Logout 
 function logout() {
 clearAuthSession()
 localStorage.removeItem('al_siddique_login_at')
 setUser(null)
 }

 //  Helpers 
 const isAdmin = user?.role === 'admin'
 const isTeacher = user?.role === 'teacher'
 const token = getAuthToken()

 return (
 <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isTeacher, token }}>
 {children}
 </AuthContext.Provider>
 )
}

export function useAuth() {
 const ctx = useContext(AuthContext)
 if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
 return ctx
}
