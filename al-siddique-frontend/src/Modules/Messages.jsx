import { useEffect, useState } from 'react'
import api from '../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const RECIPIENTS = [
 { value: 'parents', label: 'Parents' },
 { value: 'students', label: 'Students' },
 { value: 'teachers', label: 'Teachers' },
 { value: 'staff', label: 'Staff' },
]

export default function Messages() {
 const [messages, setMessages] = useState([])
 const [draft, setDraft] = useState({ recipient: 'parents', subject: '', body: '' })
 const [alert, setAlert] = useState('')
 const [sending, setSending] = useState(false)
 const [recipientCount, setRecipientCount] = useState(null)
 const [historyError, setHistoryError] = useState('')
 const [savingDraft, setSavingDraft] = useState(false)
 const [draftUpdatedAt, setDraftUpdatedAt] = useState('')

 async function loadHistory() {
 setHistoryError('')
 try {
 const response = await api.get('/api/notify/history')
 const rows = Array.isArray(response.data?.data) ? response.data.data : []
 setMessages(rows.filter(item => item.type === 'message').map(item => ({
 id: item.id,
 recipient: item.metadata?.recipient_group || item.metadata?.recipient_name || 'Recipient',
 subject: item.title || 'School Message',
 status: item.status || 'pending',
 date: item.sent_at ? new Date(item.sent_at).toLocaleDateString('en-GB') : '',
 })))
 } catch (err) {
 console.error('Failed to load message history', err)
 setHistoryError(err.response?.data?.message || 'Message history could not be refreshed. Existing loaded history was preserved.')
 }
 }

 useEffect(() => {
 let cancelled = false
 async function loadDraft() {
 try {
 const response = await api.get('/api/notify/message-draft')
 const saved = response.data?.data
 if (!cancelled && saved) {
 setDraft({ recipient:saved.recipient_group || 'parents', subject:saved.subject || '', body:saved.body || '' })
 setDraftUpdatedAt(saved.updated_at || '')
 }
 } catch (err) {
 console.error('Failed to load message draft', err)
 }
 }
 void loadDraft()
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadHistory()
 return () => { cancelled = true }
 }, [])

 useEffect(() => {
 let cancelled = false
 setRecipientCount(null)
 async function loadRecipients() {
 try {
 const response = await api.get('/api/notify/group-recipients', { params: { group: draft.recipient } })
 if (!cancelled) setRecipientCount(Number(response.data?.count || 0))
 } catch (err) {
 console.error('Failed to load verified recipient count', err)
 if (!cancelled) setRecipientCount(null)
 }
 }
 void loadRecipients()
 return () => { cancelled = true }
 }, [draft.recipient])

 async function saveDraft() {
 if (savingDraft) return
 if (!draft.subject.trim() && !draft.body.trim()) {
 setAlert('Add a subject or message before saving a draft.')
 return
 }
 setSavingDraft(true)
 setAlert('')
 try {
 const response = await api.put('/api/notify/message-draft', draft)
 setDraftUpdatedAt(response.data?.data?.updated_at || new Date().toISOString())
 setAlert('Draft saved securely on the server.')
 } catch (err) {
 setAlert(err.response?.data?.message || 'Draft could not be saved.')
 } finally {
 setSavingDraft(false)
 setTimeout(() => setAlert(''), 3000)
 }
 }


 const sendMessage = async (event) => {
 event.preventDefault()
 if (sending) return
 setSending(true)
 setAlert('')
 try {
 const recipientRes = await api.get('/api/notify/group-recipients', { params: { group: draft.recipient } })
 const recipients = Array.isArray(recipientRes.data?.recipients) ? recipientRes.data.recipients : []
 if (!recipients.length) {
 setAlert('No verified recipients are available for this group.')
 return
 }
 await api.post('/api/notify/bulk', {
 channel: 'auto',
 recipients: recipients.map(item => ({
 ...item,
 title: draft.subject,
 type: 'message',
 message: draft.body,
 recipient_group: draft.recipient,
 recipient_role: draft.recipient === 'parents' ? 'parent' : draft.recipient === 'students' ? 'student' : draft.recipient === 'teachers' ? 'teacher' : 'staff',
 })),
 })
 let draftCleanupConfirmed = true
 try {
 await api.delete('/api/notify/message-draft')
 } catch (cleanupErr) {
 draftCleanupConfirmed = false
 console.error('Message sent but saved draft cleanup failed', cleanupErr)
 }
 setDraft({ recipient: draft.recipient, subject: '', body: '' })
 setDraftUpdatedAt('')
 setAlert(draftCleanupConfirmed
 ? 'Message batch processed. Delivery status is available in the verified log.'
 : 'Message batch processed, but saved draft cleanup could not be confirmed. Check the provider log before resending.')
 await loadHistory()
 } catch (err) {
 setAlert(err.response?.data?.message || 'Message could not be sent.')
 } finally {
 setSending(false)
 setTimeout(() => setAlert(''), 3500)
 }
 }

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: 'var(--apex-shell-gradient)', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>School Messaging</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Send source-backed announcements to verified school contacts.</p>
 </div>
 <div style={{ color:C.muted, fontSize:12, alignSelf:'center' }}>{recipientCount == null ? 'Verified recipient count is temporarily unavailable; send will verify live.' : `${recipientCount} verified recipients in selected group`}</div>
 </div>

 <form className="super-module-card" onSubmit={sendMessage} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
 <div><label style={labelStyle}>Recipient Group</label><select style={select} value={draft.recipient} onChange={e => setDraft({ ...draft, recipient: e.target.value })}>{RECIPIENTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
 <div><label style={labelStyle}>Subject</label><input style={input} value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} required /></div>
 </div>
 <div><label style={labelStyle}>Message</label><textarea style={{ ...input, minHeight: 130, resize: 'vertical' }} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} required /></div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
 <button type="submit" style={btnPrimary} disabled={sending || recipientCount === 0}>{sending ? 'Sending…' : 'Send Message'}</button>
 <button type="button" style={btnSecondary} onClick={() => void saveDraft()} disabled={savingDraft}>{savingDraft ? 'Saving…' : 'Save Draft'}</button>
 {draftUpdatedAt && <span style={{ color:C.muted, fontSize:11 }}>Draft saved {new Date(draftUpdatedAt).toLocaleString('en-PK')}</span>}
 {alert && <span style={{ color: alert.includes('saved') || alert.startsWith('Message batch') ? C.green : C.red, fontWeight: 700 }}>{alert}</span>}
 </div>
 </form>

 {historyError && <div className="super-module-card" style={{ ...card, padding:16, color:C.red, fontWeight:700 }}>{historyError}</div>}
 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{['Provider Date','Recipient','Subject','Status'].map(label => <th key={label} style={{ padding:'14px 16px', textAlign:'left', color:C.muted, fontSize:12, textTransform:'uppercase' }}>{label}</th>)}</tr></thead>
 <tbody>
 {messages.map((msg, index) => <tr key={msg.id} style={{ background:index % 2 ? 'var(--apex-bg-subtle)' : 'transparent' }}>
 <td style={{ padding:'14px 16px', color:C.gold }}>{msg.date}</td>
 <td style={{ padding:'14px 16px' }}>{msg.recipient}</td>
 <td style={{ padding:'14px 16px' }}>{msg.subject}</td>
 <td style={{ padding:'14px 16px' }}><span style={{ padding:'6px 12px', borderRadius:14, background:['sent','delivered'].includes(msg.status) ? 'color-mix(in srgb, var(--apex-action-success) 10%, transparent)' : msg.status === 'accepted' ? 'color-mix(in srgb, var(--apex-action-primary) 10%, transparent)' : 'var(--apex-bg-subtle)', color:['sent','delivered'].includes(msg.status) ? C.green : msg.status === 'accepted' ? 'var(--apex-action-primary)' : C.muted, fontWeight:700 }}>{msg.status}</span></td>
 </tr>)}
 {!messages.length && <tr><td colSpan={4} style={{ padding:28, textAlign:'center', color:C.muted }}>No provider message status records are available yet.</td></tr>}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}
