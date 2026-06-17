import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const RECIPIENTS = ['Students', 'Teachers', 'Parents', 'Staff']
const initialMessages = [
 { id: 1, recipient: 'Parents', subject: 'Monthly Fee Reminder', status: 'Sent', date: '2026-05-01' },
 { id: 2, recipient: 'Students', subject: 'Exam Schedule Update', status: 'Draft', date: '2026-05-03' },
]

export default function Messages() {
 const [messages, setMessages] = useState(initialMessages)
 const [draft, setDraft] = useState({ recipient: 'Parents', subject: '', body: '' })
 const [alert, setAlert] = useState('')

 const sendMessage = (event) => {
 event.preventDefault()
 setMessages((prev) => [...prev, { ...draft, id: Date.now(), status: 'Sent', date: new Date().toISOString().split('T')[0] }])
 setDraft({ recipient: 'Parents', subject: '', body: '' })
 setAlert('Message sent successfully.')
 setTimeout(() => setAlert(''), 2800)
 }

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>School Messaging</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Send announcements, alerts, and reminders to students, parents, and staff.</p>
 </div>
 <button style={btnPrimary}>Message Templates</button>
 </div>

 <form className="super-module-card" onSubmit={sendMessage} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
 <div>
 <label style={labelStyle}>Recipient Group</label>
 <select style={select} value={draft.recipient} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}>
 {RECIPIENTS.map((recipient) => <option key={recipient} value={recipient}>{recipient}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Subject</label>
 <input style={input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} required />
 </div>
 </div>
 <div>
 <label style={labelStyle}>Message Body</label>
 <textarea style={{ ...input, minHeight: 120, resize: 'vertical' }} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} required />
 </div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
 <button type="submit" style={btnPrimary}>Send Message</button>
 <button type="button" style={btnSecondary}>Save Draft</button>
 {alert && <span style={{ color: C.green, fontWeight: 700 }}>{alert}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Sent Date', 'Recipient', 'Subject', 'Status'].map((label) => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {messages.map((msg, index) => (
 <tr key={msg.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{msg.date}</td>
 <td style={{ padding: '14px 16px' }}>{msg.recipient}</td>
 <td style={{ padding: '14px 16px' }}>{msg.subject}</td>
 <td style={{ padding: '14px 16px' }}><span style={{ padding: '6px 12px', borderRadius: 14, background: msg.status === 'Sent' ? 'rgba(48,209,88,0.14)' : 'rgba(255,159,10,0.14)', color: msg.status === 'Sent' ? C.green : C.gold, fontWeight: 700 }}>{msg.status}</span></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}
