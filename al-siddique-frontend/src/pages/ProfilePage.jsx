import { useState } from 'react'
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const surface = {
 background:'var(--apex-bg-surface)',
 border:'1px solid var(--apex-border-default)',
 borderRadius:'var(--apex-radius-lg)',
 boxShadow:'var(--apex-shadow-sm)',
}
const input = {
 width:'100%', minHeight:44, boxSizing:'border-box', padding:'10px 12px',
 borderRadius:'var(--apex-radius-sm)', border:'1px solid var(--apex-border-default)',
 background:'var(--apex-bg-surface-solid)', color:'var(--apex-text-primary)', outline:'none', fontSize:14,
}
const label = { display:'block', marginBottom:6, color:'var(--apex-text-tertiary)', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.055em' }
const primary = { minHeight:42, border:0, borderRadius:'var(--apex-radius-sm)', padding:'9px 16px', background:'var(--apex-action-primary)', color:'#fff', fontWeight:800, cursor:'pointer' }

export default function ProfilePage() {
 const { user, refreshUser } = useAuth()
 const [profile, setProfile] = useState(() => ({ name:user?.name || '', phone:user?.phone || '' }))
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')
 const [passwords, setPasswords] = useState({ current:'', next:'', confirm:'' })
 const [passwordMessage, setPasswordMessage] = useState('')
 const [changingPassword, setChangingPassword] = useState(false)

 async function saveProfile(event) {
 event.preventDefault()
 setSaving(true); setMessage('')
 try {
 await api.put('/api/auth/me/profile', profile)
 await refreshUser()
 setMessage('Profile updated successfully.')
 } catch (err) {
 setMessage(err.response?.data?.message || 'Profile could not be updated.')
 } finally { setSaving(false) }
 }

 async function changePassword(event) {
 event.preventDefault()
 setPasswordMessage('')
 if (passwords.next.length < 8) return setPasswordMessage('Password must be at least 8 characters long.')
 if (passwords.next !== passwords.confirm) return setPasswordMessage('Passwords do not match.')
 setChangingPassword(true)
 try {
 await api.post('/api/auth/me/password', { currentPassword:passwords.current, newPassword:passwords.next })
 setPasswords({ current:'', next:'', confirm:'' })
 setPasswordMessage('Password changed successfully.')
 } catch (err) {
 setPasswordMessage(err.response?.data?.message || 'Password could not be changed.')
 } finally { setChangingPassword(false) }
 }

 const initials = String(user?.name || user?.email || 'A').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()

 return (
 <div style={{ minHeight:'100vh', padding:'clamp(16px,3vw,28px)', background:'var(--apex-shell-gradient)', color:'var(--apex-text-primary)' }}>
 <div style={{ maxWidth:980, margin:'0 auto', display:'grid', gap:20 }}>
 <section style={{ ...surface, padding:24, display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
 <div style={{ width:64,height:64,borderRadius:20,display:'grid',placeItems:'center',background:'linear-gradient(135deg,var(--apex-action-primary),color-mix(in srgb,var(--apex-action-primary) 72%,var(--apex-action-secondary)))',color:'#fff',fontWeight:900,fontSize:21,boxShadow:'0 12px 30px color-mix(in srgb,var(--apex-action-primary) 22%,transparent)' }}>{initials}</div>
 <div style={{ flex:1,minWidth:220 }}><div style={{ color:'var(--apex-action-primary)',fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:1 }}>Account Profile</div><h1 style={{ margin:'5px 0 3px',fontSize:28 }}>{user?.name || 'User'}</h1><div style={{ color:'var(--apex-text-tertiary)',fontSize:13 }}>{user?.email || user?.username || 'No email'} · {user?.role || 'user'}</div></div>
 <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:999,background:'color-mix(in srgb,var(--apex-action-success) 8%,var(--apex-bg-surface-solid))',border:'1px solid color-mix(in srgb,var(--apex-action-success) 22%,var(--apex-border-default))',color:'var(--apex-action-success)',fontSize:12,fontWeight:800 }}><ShieldCheck size={15}/> Server verified</div>
 </section>

 <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20 }}>
 <form onSubmit={saveProfile} style={{ ...surface,padding:22,display:'grid',gap:16 }}>
 <div style={{ display:'flex',alignItems:'center',gap:10 }}><UserRound size={19} color="var(--apex-action-primary)"/><h2 style={{ margin:0,fontSize:18 }}>Personal Details</h2></div>
 <div><label style={label}>Name</label><input style={input} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} required /></div>
 <div><label style={label}>Phone</label><input style={input} value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="Optional" /></div>
 <div><label style={label}>Email / Login</label><input style={{ ...input,opacity:.72 }} value={user?.email || user?.username || ''} readOnly /></div>
 <div><label style={label}>Role</label><input style={{ ...input,opacity:.72 }} value={user?.role || ''} readOnly /></div>
 <button style={primary} disabled={saving}>{saving?'Saving…':'Save Profile'}</button>
 {message&&<div style={{ color:message.includes('success')?'var(--apex-action-success)':'var(--apex-action-danger)',fontSize:12,fontWeight:700 }}>{message}</div>}
 </form>

 <form onSubmit={changePassword} style={{ ...surface,padding:22,display:'grid',gap:16,alignContent:'start' }}>
 <div style={{ display:'flex',alignItems:'center',gap:10 }}><KeyRound size={19} color="var(--apex-action-highlight)"/><h2 style={{ margin:0,fontSize:18 }}>Security</h2></div>
 <p style={{ margin:0,color:'var(--apex-text-tertiary)',fontSize:13,lineHeight:1.6 }}>Set a new password for this server account. Temporary/local browser passwords are not used.</p>
 <div><label style={label}>Current Password</label><input style={input} type="password" autoComplete="current-password" value={passwords.current} onChange={e=>setPasswords({...passwords,current:e.target.value})} required /></div>
 <div><label style={label}>New Password</label><input style={input} type="password" autoComplete="new-password" value={passwords.next} onChange={e=>setPasswords({...passwords,next:e.target.value})} required minLength={8}/></div>
 <div><label style={label}>Confirm Password</label><input style={input} type="password" autoComplete="new-password" value={passwords.confirm} onChange={e=>setPasswords({...passwords,confirm:e.target.value})} required minLength={8}/></div>
 <button style={primary} disabled={changingPassword}>{changingPassword?'Updating…':'Change Password'}</button>
 {passwordMessage&&<div style={{ color:passwordMessage.includes('success')?'var(--apex-action-success)':'var(--apex-action-danger)',fontSize:12,fontWeight:700 }}>{passwordMessage}</div>}
 </form>
 </div>
 </div>
 </div>
 )
}
