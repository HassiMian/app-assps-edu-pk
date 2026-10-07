import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { C, card, btnPrimary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const EXPENSE_CATEGORIES = ['Utilities', 'Maintenance', 'Staff', 'Supplies', 'Transport', 'Academic', 'Other']
const today = () => new Date().toISOString().slice(0, 10)

export default function Expenses() {
 const [expenses, setExpenses] = useState([])
 const [newExpense, setNewExpense] = useState({ category: 'Utilities', description: '', amount: '', date: today() })
 const [message, setMessage] = useState('')
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [loadError, setLoadError] = useState('')

 async function loadExpenses() {
 setLoading(true)
 setLoadError('')
 try {
 const response = await api.get('/api/expenses')
 setExpenses(Array.isArray(response.data?.data) ? response.data.data : [])
 setLoadError('')
 } catch (err) {
 console.error('Failed to load expenses', err)
 setLoadError(err.response?.data?.message || 'Expense data could not be refreshed. Existing loaded entries were preserved.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadExpenses()
 }, [])

 const addExpense = async (event) => {
 event.preventDefault()
 if (saving) return
 setSaving(true)
 setMessage('')
 try {
 const response = await api.post('/api/expenses', newExpense)
 const saved = response.data?.data
 if (saved) setExpenses(prev => [saved, ...prev])
 setNewExpense({ category: 'Utilities', description: '', amount: '', date: today() })
 setMessage('Expense saved successfully.')
 } catch (err) {
 setMessage(err.response?.data?.message || 'Expense could not be saved.')
 } finally {
 setSaving(false)
 setTimeout(() => setMessage(''), 2800)
 }
 }

 const total = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenses])

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: 'var(--apex-shell-gradient)', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Expense Tracker</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Create verified expense entries and keep school operating costs organized.</p>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ color: C.silver, fontSize: 12, marginBottom: 6 }}>Total expense</div>
 <div style={{ fontSize: 28, fontWeight: 800, color: C.red }}>{loadError && expenses.length === 0 ? 'Unavailable' : `Rs ${total.toLocaleString()}`}</div>
 </div>
 </div>

 {loadError && <div className="super-module-card" style={{ ...card, padding:16, color:C.red, borderRadius:16 }}>{loadError}</div>}

 <form className="super-module-card" onSubmit={addExpense} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
 <div><label style={labelStyle}>Category</label><select style={select} value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>{EXPENSE_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></div>
 <div><label style={labelStyle}>Amount</label><input style={input} type="number" min="0" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} required /></div>
 <div><label style={labelStyle}>Date</label><input style={input} type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} required /></div>
 </div>
 <div><label style={labelStyle}>Description</label><input style={input} value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} required /></div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
 <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</button>
 {message && <span style={{ color: message.includes('success') ? C.green : C.red, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 {loading ? <div style={{ padding: 24, color: C.muted }}>Loading expenses…</div> : loadError && expenses.length === 0 ? (
 <div style={{ padding: 28, textAlign: 'center', color: C.red }}>Expense data is temporarily unavailable.</div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{['Date','Category','Description','Amount'].map(label => <th key={label} style={{ padding:'14px 16px', textAlign:'left', color:C.muted, fontSize:12, textTransform:'uppercase' }}>{label}</th>)}</tr></thead>
 <tbody>
 {expenses.map((item, index) => <tr key={item.id} style={{ background:index % 2 ? 'var(--apex-bg-subtle)' : 'transparent' }}>
 <td style={{ padding:'14px 16px', color:C.muted }}>{item.date ? new Date(item.date).toLocaleDateString('en-GB') : '—'}</td>
 <td style={{ padding:'14px 16px', color:C.gold }}>{item.category}</td>
 <td style={{ padding:'14px 16px' }}>{item.description}</td>
 <td style={{ padding:'14px 16px', fontWeight:750 }}>Rs {Number(item.amount || 0).toLocaleString()}</td>
 </tr>)}
 {!expenses.length && <tr><td colSpan={4} style={{ padding:28, textAlign:'center', color:C.muted }}>No expense entries recorded yet.</td></tr>}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 )
}
