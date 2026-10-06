/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
// APEX OS — server-authoritative JWT authentication

import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearAuthSession, getAuthToken, getRefreshToken, setAuthSession } from '../services/api'

const AuthContext = createContext(null)
const MAX_SESSION_MS = 12 * 60 * 60 * 1000

function getStorage() {
 try { return typeof window !== 'undefined' ? window.localStorage : null }
 catch { return null }
}

export function AuthProvider({ children }) {
 const [user, setUser] = useState(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 const handleForceLogout = () => setUser(null)
 window.addEventListener('auth:logout', handleForceLogout)
 return () => window.removeEventListener('auth:logout', handleForceLogout)
 }, [])

 useEffect(() => {
 let cancelled = false
 const loadingGuard = window.setTimeout(() => {
 if (!cancelled) setLoading(false)
 }, 8000)

 async function restoreSession() {
 const token = getAuthToken()
 const refreshToken = getRefreshToken()
 const storage = getStorage()
 const loginAt = Number(storage?.getItem('al_siddique_login_at') || 0)

 if (!token) {
 if (!cancelled) { setUser(null); setLoading(false) }
 return
 }
 if (loginAt && Date.now() - loginAt > MAX_SESSION_MS) {
 clearAuthSession()
 storage?.removeItem('al_siddique_login_at')
 if (!cancelled) { setUser(null); setLoading(false) }
 return
 }

 try {
 const response = await api.get('/api/auth/me', { skipCache: true })
 const verifiedUser = response.data?.user || null
 if (!verifiedUser) throw new Error('Session verification returned no user.')
 if (!cancelled) {
 setUser(verifiedUser)
 setAuthSession(token, refreshToken, verifiedUser)
 }
 } catch (err) {
 if (err?.response?.status === 401 || err?.response?.status === 403) {
 clearAuthSession()
 storage?.removeItem('al_siddique_login_at')
 }
 // Never authorize from a local user object when server verification failed.
 if (!cancelled) setUser(null)
 } finally {
 if (!cancelled) setLoading(false)
 }
 }

 void restoreSession()
 return () => {
 cancelled = true
 window.clearTimeout(loadingGuard)
 }
 }, [])

 async function login(username, password, schoolContext) {
 try {
 const payload = { email: String(username || '').trim(), password }
 if (schoolContext?.school_id) payload.school_id = schoolContext.school_id
 if (schoolContext?.school_code) payload.school_code = schoolContext.school_code
 const response = await api.post('/api/auth/login', payload)
 const { token, refreshToken, user: authenticatedUser } = response.data || {}
 if (!token || !authenticatedUser) return { success: false, message: 'Server did not return a valid authenticated session.' }
 setAuthSession(token, refreshToken, authenticatedUser)
 getStorage()?.setItem('al_siddique_login_at', String(Date.now()))
 setUser(authenticatedUser)
 return { success: true, user: authenticatedUser }
 } catch (err) {
 return { success: false, message: err.response?.data?.message || 'Login failed — unable to verify credentials with the server.' }
 }
 }

 async function logout() {
 try { await api.post('/api/auth/logout') }
 catch { /* local session must still be cleared if the server is temporarily unreachable */ }
 clearAuthSession()
 getStorage()?.removeItem('al_siddique_login_at')
 setUser(null)
 }

 async function refreshUser() {
 const response = await api.get('/api/auth/me', { skipCache:true })
 const verifiedUser = response.data?.user || null
 if (!verifiedUser) throw new Error('Profile refresh returned no user.')
 setUser(verifiedUser)
 setAuthSession(getAuthToken(), getRefreshToken(), verifiedUser)
 return verifiedUser
 }

 const isAdmin = ['admin', 'principal', 'school_admin', 'super_admin'].includes(user?.role)
 const isTeacher = user?.role === 'teacher'
 const token = getAuthToken()

 return (
 <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin, isTeacher, token }}>
 {children}
 </AuthContext.Provider>
 )
}

export function useAuth() {
 const ctx = useContext(AuthContext)
 if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
 return ctx
}
